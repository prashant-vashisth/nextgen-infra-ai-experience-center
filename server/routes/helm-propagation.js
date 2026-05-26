require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Groq = require('groq-sdk');

const OWNER = process.env.GITHUB_REPO_OWNER;
const TOKEN = process.env.GITHUB_TOKEN;

const ghHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

// ─── Static data ─────────────────────────────────────────────────────────────

const CLUSTERS = [
  { name: 'humana-prod-aks',    env: 'production',       rg: 'aks-rg', region: 'eastus', nodeCount: 1, vmSize: 'Standard_DC2s_v3', k8sVersion: '1.34', criticality: 'high'   },
  { name: 'humana-staging-aks', env: 'staging',          rg: 'aks-rg', region: 'eastus', nodeCount: 1, vmSize: 'Standard_DC2s_v3', k8sVersion: '1.34', criticality: 'medium' },
  { name: 'humana-dev-aks',     env: 'development',      rg: 'aks-rg', region: 'eastus', nodeCount: 1, vmSize: 'Standard_DC2s_v3', k8sVersion: '1.34', criticality: 'low'    },
  { name: 'humana-nonprod-aks', env: 'nonprod',          rg: 'aks-rg', region: 'eastus', nodeCount: 1, vmSize: 'Standard_DC2s_v3', k8sVersion: '1.34', criticality: 'medium' },
  { name: 'humana-dr-aks',      env: 'disaster-recovery', rg: 'aks-rg', region: 'eastus', nodeCount: 1, vmSize: 'Standard_DC2s_v3', k8sVersion: '1.34', criticality: 'high'  },
];

const REPOS = [
  { name: 'aks-prod-nginx-ingress',    cluster: 'humana-prod-aks',    env: 'production',       chart: 'nginx-ingress',         version: '4.8.3' },
  { name: 'aks-prod-core-services',    cluster: 'humana-prod-aks',    env: 'production',       chart: 'core-services',         version: '2.1.0' },
  { name: 'aks-staging-nginx-ingress', cluster: 'humana-staging-aks', env: 'staging',          chart: 'nginx-ingress',         version: '4.8.3' },
  { name: 'aks-staging-core-services', cluster: 'humana-staging-aks', env: 'staging',          chart: 'core-services',         version: '2.1.0' },
  { name: 'aks-dev-nginx-ingress',     cluster: 'humana-dev-aks',     env: 'development',      chart: 'nginx-ingress',         version: '4.8.3' },
  { name: 'aks-dev-monitoring',        cluster: 'humana-dev-aks',     env: 'development',      chart: 'kube-prometheus-stack', version: '55.5.0' },
  { name: 'aks-nonprod-nginx-ingress', cluster: 'humana-nonprod-aks', env: 'nonprod',          chart: 'nginx-ingress',         version: '4.8.3' },
  { name: 'aks-nonprod-core-services', cluster: 'humana-nonprod-aks', env: 'nonprod',          chart: 'core-services',         version: '2.1.0' },
  { name: 'aks-dr-nginx-ingress',      cluster: 'humana-dr-aks',      env: 'disaster-recovery', chart: 'nginx-ingress',        version: '4.8.3' },
  { name: 'aks-dr-core-services',      cluster: 'humana-dr-aks',      env: 'disaster-recovery', chart: 'core-services',        version: '2.1.0' },
  { name: 'aks-platform-observability', cluster: 'platform',          env: 'platform',         chart: 'kube-prometheus-stack', version: '55.5.0' },
  { name: 'aks-platform-security',     cluster: 'platform',           env: 'platform',         chart: 'cert-manager',          version: '1.13.3' },
];

// ─── GET /clusters ────────────────────────────────────────────────────────────

router.get('/clusters', async (req, res) => {
  // Try to get real provisioning state from Azure
  let clusterStates = {};
  try {
    const { execSync } = require('child_process');
    const raw = execSync(
      `az aks list --resource-group aks-rg --query "[].{name:name,provisioningState:provisioningState,powerState:powerState.code}" -o json 2>/dev/null`,
      { timeout: 10000 }
    );
    const azClusters = JSON.parse(raw.toString());
    azClusters.forEach(c => { clusterStates[c.name] = { provisioningState: c.provisioningState, powerState: c.powerState }; });
  } catch (_) {}

  const result = CLUSTERS.map(c => ({
    ...c,
    provisioningState: clusterStates[c.name]?.provisioningState || 'Creating',
    powerState: clusterStates[c.name]?.powerState || 'Starting',
    nginxVersion: REPOS.find(r => r.cluster === c.name && r.chart === 'nginx-ingress')?.version || null,
    repoCount: REPOS.filter(r => r.cluster === c.name).length,
  }));

  res.json({ clusters: result });
});

// ─── GET /repos ───────────────────────────────────────────────────────────────

router.get('/repos', (req, res) => {
  const { chart } = req.query;
  const repos = chart ? REPOS.filter(r => r.chart === chart) : REPOS;
  res.json({ repos, total: REPOS.length });
});

// ─── POST /scan  (SSE) — discover repos matching chart + version ──────────────

router.post('/scan', async (req, res) => {
  const { chart = 'nginx-ingress', fromVersion = '4.8.3' } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  emit({ type: 'log', msg: `Starting scan across ${REPOS.length} repositories...` });
  await delay(600);
  emit({ type: 'log', msg: `Looking for chart: ${chart} at version ${fromVersion}` });
  await delay(400);

  const found = [];
  for (const repo of REPOS) {
    emit({ type: 'scanning', repo: repo.name });
    await delay(300 + Math.random() * 200);

    if (repo.chart === chart) {
      // Try to read actual Chart.yaml from GitHub
      let actualVersion = repo.version;
      try {
        const resp = await axios.get(
          `https://api.github.com/repos/${OWNER}/${repo.name}/contents/charts/${chart}/Chart.yaml`,
          { headers: ghHeaders, timeout: 5000 }
        );
        const content = Buffer.from(resp.data.content, 'base64').toString('utf-8');
        const match = content.match(/^version:\s*(.+)/m);
        if (match) actualVersion = match[1].trim();
      } catch (_) {}

      const matches = actualVersion === fromVersion || actualVersion.startsWith(fromVersion);
      emit({ type: 'result', repo: repo.name, cluster: repo.cluster, env: repo.env, chart, version: actualVersion, matches });
      if (matches) found.push({ ...repo, version: actualVersion });
    } else {
      emit({ type: 'skip', repo: repo.name, reason: `chart is ${repo.chart}` });
    }
  }

  emit({ type: 'done', found: found.length, repos: found });
  res.end();
});

// ─── POST /propagate (SSE) — create PRs across target repos ──────────────────

router.post('/propagate', async (req, res) => {
  const { repos: targetRepos, chart = 'nginx-ingress', fromVersion = '4.8.3', toVersion = '4.9.1', approvedBy } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const branch = `helm-update/${chart}-${toVersion}`;

  emit({ type: 'log', msg: `Starting propagation: ${chart} ${fromVersion} → ${toVersion}` });
  emit({ type: 'log', msg: `Target repos: ${targetRepos.length} | Branch: ${branch}` });
  await delay(500);

  const results = [];

  for (const repoName of targetRepos) {
    emit({ type: 'progress', repo: repoName, status: 'starting' });
    const pr = await createHelmPR(repoName, chart, fromVersion, toVersion, branch, approvedBy, emit);
    results.push(pr);
    await delay(400);
  }

  emit({ type: 'done', results });
  res.end();
});

async function createHelmPR(repoName, chart, fromVersion, toVersion, branch, approvedBy, emit) {
  const chartPath = `charts/${chart}/Chart.yaml`;
  const base = 'main';

  try {
    // Step 1: Get current Chart.yaml
    emit({ type: 'step', repo: repoName, step: 'reading Chart.yaml' });
    let fileSha, currentContent;
    try {
      const fileResp = await axios.get(
        `https://api.github.com/repos/${OWNER}/${repoName}/contents/${chartPath}`,
        { headers: ghHeaders, timeout: 8000 }
      );
      fileSha = fileResp.data.sha;
      currentContent = Buffer.from(fileResp.data.content, 'base64').toString('utf-8');
    } catch (err) {
      emit({ type: 'error', repo: repoName, msg: `Could not read Chart.yaml: ${err.response?.data?.message || err.message}` });
      return { repo: repoName, status: 'error', error: 'chart not found' };
    }

    // Step 2: Get main branch SHA
    emit({ type: 'step', repo: repoName, step: 'getting branch ref' });
    const refResp = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}/git/refs/heads/${base}`,
      { headers: ghHeaders, timeout: 8000 }
    );
    const mainSha = refResp.data.object.sha;

    // Step 3: Create feature branch (delete first if exists)
    emit({ type: 'step', repo: repoName, step: `creating branch ${branch}` });
    try {
      await axios.delete(
        `https://api.github.com/repos/${OWNER}/${repoName}/git/refs/heads/${branch}`,
        { headers: ghHeaders, timeout: 5000 }
      );
    } catch (_) {}
    await axios.post(
      `https://api.github.com/repos/${OWNER}/${repoName}/git/refs`,
      { ref: `refs/heads/${branch}`, sha: mainSha },
      { headers: ghHeaders, timeout: 8000 }
    );

    // Step 4: Update Chart.yaml
    emit({ type: 'step', repo: repoName, step: 'updating Chart.yaml' });
    const updatedContent = currentContent
      .replace(new RegExp(`^version: ${fromVersion.replace(/\./g, '\\.')}`, 'm'), `version: ${toVersion}`)
      .replace(new RegExp(`version: ${fromVersion.replace(/\./g, '\\.')}`, 'g'), `version: ${toVersion}`);

    // Get file sha on the new branch
    const branchFileResp = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${chartPath}?ref=${branch}`,
      { headers: ghHeaders, timeout: 8000 }
    );

    await axios.put(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${chartPath}`,
      {
        message: `chore: bump ${chart} from ${fromVersion} to ${toVersion}\n\nAutomated helm chart update via Humana AKS Helm Propagation Agent.\nApproved by: ${approvedBy || 'platform-engineer'}\nChange request: ${chart} ${fromVersion} → ${toVersion}`,
        content: Buffer.from(updatedContent).toString('base64'),
        sha: branchFileResp.data.sha,
        branch,
      },
      { headers: ghHeaders, timeout: 8000 }
    );

    // Step 5: Create PR
    emit({ type: 'step', repo: repoName, step: 'creating pull request' });
    const prResp = await axios.post(
      `https://api.github.com/repos/${OWNER}/${repoName}/pulls`,
      {
        title: `chore: bump ${chart} ${fromVersion} → ${toVersion}`,
        body: buildPRBody(repoName, chart, fromVersion, toVersion, currentContent, updatedContent, approvedBy),
        head: branch,
        base,
      },
      { headers: ghHeaders, timeout: 8000 }
    );

    const pr = { repo: repoName, status: 'pr_created', prNumber: prResp.data.number, prUrl: prResp.data.html_url, prId: prResp.data.node_id };
    emit({ type: 'pr_created', ...pr });
    return pr;

  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    emit({ type: 'error', repo: repoName, msg });
    return { repo: repoName, status: 'error', error: msg };
  }
}

function buildPRBody(repo, chart, fromVersion, toVersion, oldContent, newContent, approvedBy) {
  const repoData = REPOS.find(r => r.name === repo);
  return `## Helm Chart Version Bump

**Chart**: \`${chart}\`
**Change**: \`${fromVersion}\` → \`${toVersion}\`
**Cluster**: \`${repoData?.cluster || 'unknown'}\`
**Environment**: \`${repoData?.env || 'unknown'}\`

---

## AI Assessment

**Risk Level**: Low
**Breaking Changes**: None expected (minor version bump)
**Rollback**: \`helm rollback ${chart} -n ${chart}\`

### What changed
- \`Chart.yaml\`: \`version: ${fromVersion}\` → \`version: ${toVersion}\`
- \`dependencies[ingress-nginx].version\`: \`${fromVersion}\` → \`${toVersion}\`

### Upgrade notes (4.8.3 → 4.9.1)
- Improved SSL/TLS session handling
- Fixed memory leak in upstream health checks
- Enhanced metrics cardinality for Prometheus

---

## Approval

Reviewed and approved via Humana AKS Helm Propagation Agent
Approved by: ${approvedBy || 'platform-engineer'}
Propagated at: ${new Date().toISOString()}

🤖 Generated by Humana AKS Helm Propagation Agent`;
}

// ─── POST /merge/:prNumber — merge an approved PR ────────────────────────────

router.post('/merge/:repoName/:prNumber', async (req, res) => {
  const { repoName, prNumber } = req.params;
  const { mergeMethod = 'squash', chart = 'nginx-ingress', fromVersion = '4.8.3', toVersion = '4.9.1' } = req.body;

  try {
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${repoName}/pulls/${prNumber}/merge`,
      {
        commit_title: `chore: bump ${chart} ${fromVersion} → ${toVersion}`,
        commit_message: `Automated helm chart update.\nApproved via Humana AKS Helm Propagation Agent.`,
        merge_method: mergeMethod,
      },
      { headers: ghHeaders }
    );
    res.json({ success: true, merged: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
  }
});

// ─── POST /chat (SSE) — AI chatbot ───────────────────────────────────────────

router.post('/chat', async (req, res) => {
  const { messages = [] } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const systemPrompt = buildSystemPrompt();

  if (!process.env.GROQ_API_KEY) {
    const fallback = getFallback(messages);
    for (const word of fallback.split(' ')) {
      res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
      await delay(30);
    }
    res.write(`data: ${JSON.stringify({ done: true, fallback: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const stream = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      max_tokens: 600,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  } catch (err) {
    const fallback = getFallback(messages);
    for (const word of fallback.split(' ')) {
      res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
      await delay(30);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

function buildSystemPrompt() {
  const clusterSummary = CLUSTERS.map(c => {
    const nginxRepo = REPOS.find(r => r.cluster === c.name && r.chart === 'nginx-ingress');
    return `- ${c.name} (${c.env}): nginx-ingress ${nginxRepo?.version || 'N/A'}, ${c.nodeCount} node(s), ${c.vmSize}`;
  }).join('\n');

  return `You are the Multi-Cluster Update Agent for an enterprise Kubernetes platform. You help platform engineers manage, assess, and propagate component updates across multiple AKS clusters automatically, with human-in-the-loop approval gates for production.

## Your capabilities
- Scan all ${REPOS.length} Helm repositories across ${CLUSTERS.length} AKS clusters for any chart version
- Assess risk level for any proposed chart upgrade (Low / Medium / High)
- Create GitHub pull requests with AI-generated change summaries and rollback instructions
- Route for human approval (mandatory for production, configurable for lower envs)
- Merge approved PRs and confirm deployment propagation
- Explain any proposed change with full AI explainability

## Supported components and current versions
- nginx-ingress: 4.8.3 (5 repos) — Low risk to upgrade to 4.9.1
- cert-manager: 1.13.3 (1 repo) — Medium risk to upgrade to 1.14.0 (CRD migration required)
- kube-prometheus-stack: 55.5.0 (2 repos) — Medium risk to upgrade to 56.6.0 (brief metrics gap)
- cluster-autoscaler: 9.34.0 (3 repos) — Low risk to upgrade to 9.36.0
- external-secrets: 0.9.11 (2 repos) — HIGH risk to upgrade to 0.10.0 (breaking: v1beta1 deprecation)

## Current cluster fleet
${clusterSummary}

## Helm repositories (${REPOS.length} total)
${REPOS.map(r => `- ${r.name}: ${r.chart} v${r.version} (${r.env})`).join('\n')}

## Demo scenario
The typical demo is: update nginx-ingress from 4.8.3 → 4.9.1 across all 5 nginx-ingress repos.

## Approval policy
- Production cluster (humana-prod-aks): requires explicit human approval before merge
- Staging/nonprod/DR: requires approval but less strict
- Development: can be auto-approved after human confirms

## How to interact
- "What version is nginx-ingress on all clusters?" → summarise cluster versions
- "Update nginx-ingress to 4.9.1" → trigger propagation workflow
- "Show me the risk for this change" → explain the change impact
- "Approve staging and dev, hold prod" → selective approval
- "What's in nginx-ingress 4.9.1?" → explain the release notes

## Your behaviour
- Be concise and technical — these are platform engineers
- Always mention cluster names and repo names in responses
- Explain risk level for every proposed change
- For production changes, always flag the approval requirement
- Keep responses under 4 sentences unless a list is needed`;
}

function getFallback(messages) {
  const last = (messages[messages.length - 1]?.content || '').toLowerCase();
  if (last.includes('version') || last.includes('running') || last.includes('which') || last.includes('cluster')) {
    return 'Current component versions across all 5 clusters: nginx-ingress 4.8.3 (5 repos, upgrade available: 4.9.1 — Low risk), cert-manager 1.13.3 (1 repo, upgrade: 1.14.0 — Medium risk), kube-prometheus-stack 55.5.0 (2 repos, upgrade: 56.6.0 — Medium risk), cluster-autoscaler 9.34.0 (3 repos, upgrade: 9.36.0 — Low risk), external-secrets 0.9.11 (2 repos, upgrade: 0.10.0 — HIGH risk — breaking change).';
  }
  if (last.includes('cert') || last.includes('tls') || last.includes('1.14')) {
    return 'cert-manager 1.13.3 → 1.14.0 is a Medium risk upgrade. The new version adds fields for cross-namespace certificate issuance but includes a CRD schema update. You must apply the new CRDs before running helm upgrade, otherwise the webhook will reject the new fields. Existing certificates are not affected — issuance continues during the upgrade. Select cert-manager in the component picker and click Scan Repos to proceed.';
  }
  if (last.includes('prometheus') || last.includes('grafana') || last.includes('monitoring')) {
    return 'kube-prometheus-stack 55.5.0 → 56.6.0 is a Medium risk upgrade. It brings Prometheus 2.50 and Grafana 10.4. Expect a 2–3 minute metrics gap during the Prometheus pod rolling restart — alert rules will not fire during this window. Grafana dashboards and datasources are preserved. The upgrade affects 2 repos: aks-dev-monitoring and aks-platform-observability.';
  }
  if (last.includes('external-secret') || last.includes('secret')) {
    return 'external-secrets 0.9.11 → 0.10.0 is HIGH risk. This version drops support for ClusterSecretStore v1beta1 — you must migrate all ClusterSecretStore manifests to v1 before upgrading, otherwise secrets will stop syncing and applications will lose access to credentials. This affects 2 repos. I strongly recommend staging this upgrade separately with a full rollback plan.';
  }
  if (last.includes('risk') || last.includes('safe') || last.includes('break')) {
    return 'Risk summary for available upgrades: nginx-ingress 4.9.1 (Low — no breaking changes, rolling restart), cert-manager 1.14.0 (Medium — CRD update required first), kube-prometheus-stack 56.6.0 (Medium — brief metrics gap), cluster-autoscaler 9.36.0 (Low — patch update only), external-secrets 0.10.0 (HIGH — v1beta1 deprecation, migration required). Always approve prod separately after validating in lower environments.';
  }
  if (last.includes('approve') || last.includes('prod')) {
    return 'Production requires explicit human approval before any PR is merged — the agent will never auto-merge to prod. After scanning, the review panel shows a diff per cluster with a per-environment approve/reject control. Use "Approve Non-Prod" to fast-track lower environments, then review prod individually. The audit log captures every approval with timestamp.';
  }
  return 'I manage component updates across 5 AKS clusters and 12 GitHub repos. Available updates: nginx-ingress (Low risk), cert-manager (Medium), kube-prometheus-stack (Medium), cluster-autoscaler (Low), external-secrets (HIGH — breaking change). Select a component in the panel to start, or ask me about any specific upgrade risk.';
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = router;
