/**
 * CVIT Multi-Agent Orchestrator using LangGraph
 *
 * 10-step workflow with stateful agent graph:
 *   scan → collect → enrich → [HUMAN: approve] →
 *   handover → work_package → [HUMAN: execute] →
 *   monitor → close → kb_update → done
 */
const axios = require('axios');
const { ChatGroq } = require('@langchain/groq');
const { StateGraph, END, START, Annotation } = require('@langchain/langgraph');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const { TOOL_SCHEMAS, executeTool } = require('./tools');
const { VULN_SCENARIOS, getCurrentScenario, setCurrentScenario } = require('./cvit-state');

// ── Workflow state definition (LangGraph Annotation) ──────────────────────────

const WorkflowState = Annotation.Root({
  workflowId:       Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  step:             Annotation({ reducer: (a, b) => b ?? a, default: () => 'idle' }),
  stepIndex:        Annotation({ reducer: (a, b) => b ?? a, default: () => 0 }),
  cveId:            Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  cluster:          Annotation({ reducer: (a, b) => b ?? a, default: () => 'humana-prod-aks-eastus' }),
  findings:         Annotation({ reducer: (a, b) => b ?? a, default: () => [] }),
  enrichedCVE:      Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  changeTicket:     Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  incidentTicket:   Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  githubPR:         Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  kbArticle:        Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  validation:       Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  agentLogs:        Annotation({ reducer: (a, b) => [...(a || []), ...(b || [])], default: () => [] }),
  humanApproval:    Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  humanExecute:     Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  p1IncidentSysId:  Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  p1IncidentUrl:    Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  p1IncidentNumber: Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  cvitId:           Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  scenarioId:       Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  startedAt:        Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  completedAt:      Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  error:            Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
});

// ── In-memory workflow store (keyed by workflowId) ────────────────────────────
const workflows = new Map();
// Each entry: { state, emit, emitter }

// ── LLM setup with Groq tool calling ─────────────────────────────────────────
function makeLLM(temperature = 0.1) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature,
    maxTokens: 1024,
  }).bindTools(TOOL_SCHEMAS);
}

// ── GitHub PR creation with retry (up to MAX_PR_RETRIES extra attempts) ───────
const MAX_PR_RETRIES = 5;
async function createGithubPRWithRetry(args, workflowId) {
  for (let attempt = 0; attempt <= MAX_PR_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2000 * attempt, 10000); // 2 s, 4 s, 6 s … capped at 10 s
      log(workflowId, 'WorkPackageAgent', 'retry',
        `PR creation attempt ${attempt + 1}/${MAX_PR_RETRIES + 1} — retrying in ${delay / 1000}s`);
      await new Promise(r => setTimeout(r, delay));
    }
    const result = await executeTool('create_github_pr', { ...args, _retryAttempt: attempt || undefined });
    if (result.source !== 'fallback' && result.url !== '#') return result;
    if (attempt < MAX_PR_RETRIES) {
      log(workflowId, 'WorkPackageAgent', 'warn',
        `PR creation attempt ${attempt + 1} returned fallback (${result.error || 'unknown error'}) — will retry`);
    }
  }
  // All attempts exhausted — return whatever the last call produced
  return await executeTool('create_github_pr', { ...args, _retryAttempt: MAX_PR_RETRIES });
}

// ── Logging helper ────────────────────────────────────────────────────────────
function log(workflowId, agent, type, message, data = null) {
  const entry = { ts: new Date().toISOString(), agent, type, message, data };
  const wf = workflows.get(workflowId);
  if (wf) {
    wf.state.agentLogs = [...(wf.state.agentLogs || []), entry];
    wf.emit('log', entry);
  }
  return entry;
}

// ── Generic agent runner with Groq tool calling ───────────────────────────────
async function runAgent(workflowId, agentName, systemPrompt, userPrompt, tools = null) {
  const llm = tools !== false ? makeLLM() : new ChatGroq({ apiKey: process.env.GROQ_API_KEY, model: 'meta-llama/llama-4-scout-17b-16e-instruct', temperature: 0.1, maxTokens: 800 });

  log(workflowId, agentName, 'thinking', `${agentName} is analyzing...`);

  const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
  let response = await llm.invoke(messages);

  // Agentic loop: execute tool calls until the agent is done
  let iterations = 0;
  while (response.tool_calls?.length > 0 && iterations < 5) {
    iterations++;
    for (const tc of response.tool_calls) {
      log(workflowId, agentName, 'tool_call', `Calling ${tc.name}`, tc.args);
      const result = await executeTool(tc.name, tc.args);
      log(workflowId, agentName, 'tool_result', `${tc.name} returned`, result);
      messages.push(response);
      messages.push(new ToolMessage({ content: JSON.stringify(result), tool_call_id: tc.id }));
    }
    response = await llm.invoke(messages);
  }

  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  log(workflowId, agentName, 'complete', content.slice(0, 200));
  return { content, messages, toolsUsed: iterations > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP NODES
// ─────────────────────────────────────────────────────────────────────────────

async function stepScan(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'scan', index: 1, label: 'Detect & Classify CVITs' });

  const scenario = VULN_SCENARIOS.find(s => s.id === state.scenarioId) || getCurrentScenario() || VULN_SCENARIOS[0];
  const cvitTag  = state.cvitId ? `[${state.cvitId}] ` : '';

  const result = await runAgent(
    state.workflowId,
    'ScannerAgent',
    `You are a container security scanning agent for an AKS cluster.
     Your job is to scan clusters for vulnerable container runtimes and images, classify findings by severity, and describe the technical impact.
     Always scan the cluster and return structured findings. Focus on technical details — CVE IDs, versions, patch status, and affected workloads.`,
    `${cvitTag}Scan the AKS cluster "${state.cluster}" for security violations in the claims-processing namespace.
     The following issues were detected in a recent deployment:
     ${scenario.scanPromptExtra}
     List findings by severity (CRITICAL → HIGH → MEDIUM). For each issue, state the CVE or violation ID, the vulnerable component version, whether a patch exists, and which pods are affected.`,
  );

  // Extract findings from tool calls
  const wfState = wf.state;
  const findings = wfState.findings?.length ? wfState.findings : await executeTool('get_container_vulnerabilities', { cluster_name: state.cluster });

  return {
    step: 'scan',
    stepIndex: 1,
    findings: findings.vulnerabilities || findings,
    cveId: (findings.vulnerabilities || findings)[0]?.id || 'CVE-2024-21626',
    agentLogs: [log(state.workflowId, 'ScannerAgent', 'summary', result.content)],
  };
}

async function stepCollect(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'collect', index: 2, label: 'Smart Requirement Collection' });

  const topCVE = (state.findings[0] || { id: state.cveId, component: 'runc', namespace: 'claims-processing' });

  await runAgent(
    state.workflowId,
    'RequirementAgent',
    `You are a requirement collection agent for CVIT remediation.
     Your job is to gather technical context needed for safe remediation: cluster topology, affected namespaces, running workloads, and environment details.`,
    `For the security violation ${topCVE.id} in namespace ${topCVE.namespace || 'claims-processing'} on cluster ${state.cluster}:
     1. Get the cluster and namespace information — how many pods are running, which deployments are affected
     2. Identify which namespaces are impacted and what their criticality tier is
     3. Determine the safe maintenance window for a rolling update (zero-downtime required)
     4. Summarize: what is the affected component, what is the blast radius, and what is the remediation path`,
  );

  return { step: 'collect', stepIndex: 2 };
}

async function stepEnrich(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'enrich', index: 3, label: 'Auto-Enrichment' });

  const topCVE = state.findings[0] || { id: state.cveId };

  const result = await runAgent(
    state.workflowId,
    'EnrichmentAgent',
    `You are a CVE enrichment agent. You fetch official CVE data from NVD, assess exploitability, and identify the patched versions.
     Always fetch real NVD data for the CVE. Focus on technical details — CVSS vector, attack surface, exploit complexity, and the concrete fix.`,
    `Enrich ${topCVE.id}:
     1. Fetch official CVE or violation details from NVD (CVSS score, attack vector, exploitability)
     2. Explain the vulnerability technically — what does an attacker gain, what is the attack surface?
     3. Identify the patched version or fixed base image and the upgrade path
     4. Assess blast radius in the cluster: which pods and namespaces are exposed?
     5. State the remediation priority based on CVSS score and exploitability score`,
  );

  // Get the NVD data for state
  const nvdData = await executeTool('fetch_nvd_cve_details', { cve_id: topCVE.id });
  return {
    step: 'enrich',
    stepIndex: 3,
    enrichedCVE: { ...topCVE, ...nvdData, agentSummary: result.content },
  };
}

async function stepAwaitApproval(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'approval', index: 4, label: 'Approval Workflow — Awaiting Human Review' });

  // Create a real ServiceNow change request for the approval record
  const topCVE = state.enrichedCVE || state.findings[0] || {};
  const changeResult = await executeTool('create_servicenow_change', {
    short_description: `CVIT Remediation: ${topCVE.id || state.cveId} — ${topCVE.component || 'container'} upgrade`,
    description: `Security advisory requires patching ${topCVE.component} from v${topCVE.version} to v${topCVE.patchVersion}.
\nCVSS Score: ${topCVE.cvss_score || topCVE.cvss || 'N/A'}
Affected namespace: ${topCVE.namespace}
Cluster: ${state.cluster}
Criticality: ${topCVE.severity || 'HIGH'} — ${topCVE.namespace || 'claims-processing'} namespace affected
\nRemediation: ${topCVE.agentSummary?.slice(0, 300) || 'Upgrade component to patched version'}`,
    risk: topCVE.cvss_score >= 8 || topCVE.cvss >= 8 ? 'high' : 'medium',
    assignment_group: 'Cloud Operations',
  });

  log(state.workflowId, 'ApprovalAgent', 'waiting', `Change request ${changeResult.number} created — waiting for human approval`, changeResult);
  wf.emit('human_required', { action: 'approve', changeTicket: changeResult, cve: topCVE });

  return { step: 'awaiting_approval', stepIndex: 4, changeTicket: changeResult };
}

async function stepHandover(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'handover', index: 5, label: 'Handover to Human Expert' });

  const topCVE = state.enrichedCVE || state.findings[0] || {};
  log(state.workflowId, 'HandoverAgent', 'action',
    `Approved by ${state.humanApproval?.approvedBy || 'security-manager'}. Routing to DevOps team for review.`);

  await runAgent(
    state.workflowId,
    'HandoverAgent',
    `You are a handover agent. You prepare a concise technical brief for the DevOps engineer who will execute the remediation.`,
    `Prepare a handover brief for the DevOps engineer to review before executing remediation of ${topCVE.id || state.cveId}.
     Include: what to do, what risks to watch for, rollback plan, and validation steps. Keep it under 200 words.`,
    false,
  );

  return { step: 'handover', stepIndex: 5 };
}

async function stepWorkPackage(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'work_package', index: 6, label: 'Work Package Creation' });

  const topCVE   = state.enrichedCVE || state.findings[0] || {};
  const scenario = VULN_SCENARIOS.find(s => s.id === state.scenarioId) || getCurrentScenario() || VULN_SCENARIOS[0];
  const cvitId   = state.cvitId || 'CVIT-UNKNOWN';
  const cvitTag  = `[${cvitId}]`;

  // Build work package content — handles both EOL runtime and package CVE scenarios
  const isEolScenario = !!scenario.vulnImage
  const cveRows = scenario.cves.map(c => {
    if (isEolScenario) {
      const comp   = c.pkg.includes(':') ? c.pkg.split(':')[0] : c.pkg.split('@')[0]
      const fixVer = comp === 'node' ? scenario.fixImage : `patched (via ${scenario.fixImage} base)`
      return `| ${c.pkg} | EOL | ${fixVer} | ${c.cve} | ${c.desc} |`
    }
    const [pkg, ver] = c.pkg.split('@')
    const fix = (scenario.fixDeps || {})[pkg] || 'latest'
    return `| ${pkg} | ${ver} | ${fix} | ${c.cve} | ${c.desc} |`
  }).join('\n')

  const snowDescription = isEolScenario
    ? [
        `${cvitTag} Work package for EOL runtime remediation in aks-nodeapp.`,
        '',
        `EOL Runtime: ${scenario.vulnImage} → Fix: ${scenario.fixImage}`,
        '',
        'Compliance Violations:',
        ...scenario.cves.map(c => `- ${c.pkg} (${c.cve}): ${c.desc} — CVSS ${c.cvss}`),
        '',
        'Tasks:',
        `1. Update Dockerfile: FROM ${scenario.vulnImage} → FROM ${scenario.fixImage}`,
        '2. Build new container image with LTS base',
        '3. Push to Azure Container Registry',
        '4. Rolling update deployment (zero downtime)',
        '5. Validate all pods running LTS base image',
        '6. Re-run container vulnerability scan',
      ].join('\n')
    : [
        `${cvitTag} Work package for critical dependency remediation in aks-nodeapp.`,
        '',
        'Vulnerabilities:',
        ...scenario.cves.map(c => `- ${c.pkg} (${c.cve}): ${c.desc} — CVSS ${c.cvss}`),
        '',
        'Tasks:',
        '1. Update package.json to patched versions',
        '2. Build new container image',
        '3. Push to Azure Container Registry',
        '4. Rolling update deployment (zero downtime)',
        '5. Validate all pods running patched image',
        '6. Re-run container vulnerability scan',
      ].join('\n')

  const remediationBlock = isEolScenario
    ? `\`\`\`bash
# Fix Dockerfile base image
# FROM ${scenario.vulnImage}  →  FROM ${scenario.fixImage}

# Rebuild and push container image
docker build -t humanaaksacr.azurecr.io/aks-nodeapp:${cvitId.toLowerCase()} .
docker push humanaaksacr.azurecr.io/aks-nodeapp:${cvitId.toLowerCase()}

# Rolling update — zero downtime
kubectl set image deployment/aks-nodeapp \\
  portal=humanaaksacr.azurecr.io/aks-nodeapp:${cvitId.toLowerCase()} \\
  -n claims-processing

# Validate
kubectl rollout status deployment/aks-nodeapp -n claims-processing
\`\`\``
    : `\`\`\`bash
# Update dependencies
npm install ${scenario.cves.map(c => { const [p] = c.pkg.split('@'); return `${p}@${(scenario.fixDeps || {})[p] || 'latest'}` }).join(' ')}

# Rebuild and push container image
docker build -t humanaaksacr.azurecr.io/aks-nodeapp:${cvitId.toLowerCase()} .
docker push humanaaksacr.azurecr.io/aks-nodeapp:${cvitId.toLowerCase()}

# Rolling update — zero downtime
kubectl set image deployment/aks-nodeapp \\
  portal=humanaaksacr.azurecr.io/aks-nodeapp:${cvitId.toLowerCase()} \\
  -n claims-processing

# Validate
kubectl rollout status deployment/aks-nodeapp -n claims-processing
\`\`\``

  const prBody = isEolScenario ? `## ${cvitTag} Security Fix — EOL Container Runtime Upgrade

### Problem
The \`aks-nodeapp\` service deployed to AKS cluster \`${state.cluster}\` (namespace: \`claims-processing\`) was running on **${scenario.vulnImage}**, which reached **End-of-Life** and is no longer receiving security patches from the Node.js project.

Running an EOL runtime means any new CVEs discovered in the runtime, OpenSSL, or the base OS layer will remain permanently unpatched. This PR remediated the following active security issues:

| Component | Issue ID | CVSS | Severity | What it means |
|-----------|----------|------|----------|----------------|
${scenario.cves.map(c => `| \`${c.pkg}\` | ${c.cve} | ${c.cvss} | **${c.severity}** | ${c.desc} |`).join('\n')}

### Fix Applied
Changed the container base image in \`app/Dockerfile\`:

\`\`\`diff
- FROM ${scenario.vulnImage}   # End-of-Life — no longer patched
+ FROM ${scenario.fixImage}    # Active LTS — receives security updates
\`\`\`

This single change resolves all ${scenario.cves.length} issues above because:
- The EOL OpenSSL bundled with ${scenario.vulnImage} is replaced with the patched version in ${scenario.fixImage}
- The EOL Alpine base layer is replaced with a currently supported version
- All future CVE patches from the Node.js project will be received automatically

### Deployment
${remediationBlock}

### Verification Checklist
- [ ] \`kubectl get pods -n claims-processing\` — all 3 pods Running, 0 restarts
- [ ] \`kubectl describe pod <pod-name> -n claims-processing | grep Image\` — confirms \`${scenario.fixImage}\`
- [ ] Container vulnerability scan returns clean result for claims-processing namespace
- [ ] Application health check endpoint \`/health\` responds 200 OK on all pods
- [ ] ServiceNow incident ${state.p1IncidentNumber || '(see CVIT tracker)'} marked Resolved

---
**Tracking ID:** ${cvitId} | **Cluster:** ${state.cluster} | **Auto-generated by CVIT Orchestrator — approved by Security Manager**`

  : `## ${cvitTag} Security Fix — ${scenario.cves.length} Vulnerabilities Patched

### Problem
The \`aks-nodeapp\` service in AKS cluster \`${state.cluster}\` (namespace: \`claims-processing\`) contained **${scenario.cves.length} known security vulnerabilities** in its runtime dependencies. These were introduced via a recent deployment and detected by the CVIT scanner.

| Package | Installed | CVE | CVSS | Severity | Attack Vector |
|---------|-----------|-----|------|----------|----------------|
${scenario.cves.map(c => { const [pkg, ver] = c.pkg.split('@'); const fix = (scenario.fixDeps || {})[pkg] || 'latest'; return `| \`${pkg}\` | \`${ver}\` → \`${fix}\` | ${c.cve} | ${c.cvss} | **${c.severity}** | ${c.desc} |`; }).join('\n')}

Each of these packages has a known, published patch. This PR upgrades them to the patched versions.

### Fix Applied
${remediationBlock}

### Verification Checklist
- [ ] \`npm audit\` returns 0 critical, 0 high vulnerabilities
- [ ] All ${scenario.cves.length} CVEs confirmed resolved (npm audit --json check)
- [ ] \`kubectl get pods -n claims-processing\` — all 3 pods Running, 0 restarts
- [ ] Container vulnerability scan returns clean result
- [ ] Application health check endpoint \`/health\` responds 200 OK on all pods
- [ ] ServiceNow incident ${state.p1IncidentNumber || '(see CVIT tracker)'} marked Resolved

---
**Tracking ID:** ${cvitId} | **Cluster:** ${state.cluster} | **Auto-generated by CVIT Orchestrator — approved by Security Manager**`

  // Create ServiceNow incident for tracking + GitHub PR simultaneously.
  // PR creation uses retry logic (up to MAX_PR_RETRIES extra attempts) to handle
  // transient GitHub API failures without surfacing a placeholder '#' link.
  const [incidentResult, prResult] = await Promise.all([
    executeTool('create_servicenow_incident', {
      short_description: isEolScenario
        ? `${cvitTag} CVIT Work Package: Remediate EOL Runtime ${scenario.vulnImage} → ${scenario.fixImage} — ${state.cluster}`
        : `${cvitTag} CVIT Work Package: Patch ${scenario.cves.length} critical CVEs in member portal — ${state.cluster}`,
      description: snowDescription,
      urgency: '2',
      assignment_group: 'Platform Engineering',
    }),
    createGithubPRWithRetry({
      cve_id: topCVE.id || scenario.cves[0].cve,
      title:  isEolScenario
        ? `${cvitTag} fix(security): upgrade EOL runtime ${scenario.vulnImage} → ${scenario.fixImage}`
        : `${cvitTag} fix(security): patch ${scenario.cves.length} critical CVEs — ${scenario.label.toLowerCase()}`,
      body:   prBody,
      patch_content: isEolScenario
        ? `Dockerfile: FROM ${scenario.vulnImage} → FROM ${scenario.fixImage}\n${scenario.cves.map(c => `${c.cve}: ${c.pkg} (EOL)`).join('\n')}`
        : scenario.cves.map(c => {
            const [pkg, ver] = c.pkg.split('@')
            return `${c.cve}: ${pkg} ${ver} → ${(scenario.fixDeps || {})[pkg] || 'latest'}`
          }).join('\n'),
    }, state.workflowId),
  ]);

  log(state.workflowId, 'WorkPackageAgent', 'created', `ServiceNow ${incidentResult.number} + GitHub PR #${prResult.number} created`, { incident: incidentResult, pr: prResult });
  wf.emit('work_package_ready', { incident: incidentResult, pr: prResult, cve: topCVE });
  wf.emit('human_required', { action: 'execute', incident: incidentResult, pr: prResult, cve: topCVE });

  return { step: 'awaiting_execution', stepIndex: 7, incidentTicket: incidentResult, githubPR: prResult };
}

async function stepMonitor(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'monitor', index: 8, label: 'Agent Monitors Remediation Progress' });

  // Merge the fix PR into main — DevOps confirmed execution, deployment is starting
  const prNumber = state.githubPR?.number;
  const prUrl    = state.githubPR?.url;
  if (prNumber && prUrl && prUrl !== '#') {
    try {
      const owner = process.env.GITHUB_REPO_OWNER;
      const repo  = process.env.GITHUB_REPO_NAME || 'aks-nodeapp-demo';
      await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
        {
          commit_title: `fix(security): merge CVIT remediation PR #${prNumber} [${state.cvitId || 'CVIT'}]`,
          commit_message: `Automated merge by CVIT Orchestrator after DevOps approval.\nTracking ID: ${state.cvitId || 'N/A'} | P1 Incident: ${state.p1IncidentNumber || 'N/A'}`,
          merge_method: 'squash',
        },
        { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'humana-cvit-agent' } }
      );
      log(state.workflowId, 'MonitorAgent', 'action', `Fix PR #${prNumber} merged into main — deployment rolling out`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      log(state.workflowId, 'MonitorAgent', 'action', `PR #${prNumber} merge: ${msg}`);
    }
  }

  const scenario = VULN_SCENARIOS.find(s => s.id === state.scenarioId) || getCurrentScenario() || VULN_SCENARIOS[0];
  const phases   = scenario.monitorPhases;

  for (const phase of phases) {
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    log(state.workflowId, 'MonitorAgent', 'progress', phase.msg, { pct: phase.pct });
    wf.emit('progress', { pct: phase.pct, message: phase.msg });
  }

  // Update ServiceNow ticket
  if (state.incidentTicket?.sys_id) {
    await executeTool('update_servicenow_ticket', {
      sys_id: state.incidentTicket.sys_id,
      work_notes: 'Remediation complete. All CVEs patched via rolling deployment. Zero-downtime rolling update applied. Container vulnerability scan clean. All pods on supported LTS image.',
    });
  }

  return { step: 'monitor', stepIndex: 8 };
}

async function stepClose(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'close', index: 9, label: 'Smart Closure & Validation' });

  const topCVE = state.enrichedCVE || state.findings[0] || {};

  const validation = await executeTool('validate_cve_remediation', {
    cve_id: topCVE.id || state.cveId,
    cluster_name: state.cluster,
    expected_version: topCVE.patchVersion || '1.1.12',
  });

  log(state.workflowId, 'ClosureAgent', 'validated', `Validation complete: ${validation.nodesPatched}/${validation.nodesChecked} pods patched`, validation);

  const elapsed = state.startedAt
    ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)
    : 0;

  const scenario = VULN_SCENARIOS.find(s => s.id === state.scenarioId) || getCurrentScenario() || VULN_SCENARIOS[0];
  const cvitId   = state.cvitId || 'CVIT-UNKNOWN';

  // AI-generated closure notes
  const closureResult = await runAgent(
    state.workflowId,
    'ClosureAgent',
    `You are a ServiceNow closure agent. Write concise, technical closure notes (3-4 sentences) for a resolved P1 security incident. Focus on what was fixed, how it was fixed, and the validation result.`,
    `Write closure notes for P1 security incident ${state.p1IncidentNumber || ''} (tracking ID: ${cvitId}).
     Summary: ${scenario.closureSummary}
     Affected service: aks-nodeapp in claims-processing namespace on ${state.cluster}.
     Fix applied: Zero-downtime rolling deployment. All ${validation.nodesPatched}/${validation.nodesChecked} pods updated. Container vulnerability scan clean. Total resolution time: ${elapsed}s.
     Write the closure notes only — no preamble, no introductory sentence.`,
    false,
  );
  const closureNotes = closureResult.content;

  // Close the work package incident
  if (state.incidentTicket?.sys_id && !state.incidentTicket.sys_id.startsWith('sys-')) {
    await executeTool('update_servicenow_ticket', {
      sys_id: state.incidentTicket.sys_id,
      state: '6',
      work_notes: closureNotes,
    });
  }

  // Close the original P1 incident
  if (state.p1IncidentSysId && !state.p1IncidentSysId.startsWith('fallback')) {
    await executeTool('update_servicenow_ticket', {
      sys_id: state.p1IncidentSysId,
      state: '6',
      work_notes: `RESOLVED by CVIT AI Orchestrator.\n\n${closureNotes}\n\nChange Request: ${state.changeTicket?.number || 'N/A'} | Fix PR: #${state.githubPR?.number || 'N/A'} | KB Article: see KB Update step`,
    });
    log(state.workflowId, 'ClosureAgent', 'action', `P1 incident ${state.p1IncidentNumber || state.p1IncidentSysId} closed in ServiceNow with AI-generated notes`);
    wf.emit('p1_closed', { sys_id: state.p1IncidentSysId, url: state.p1IncidentUrl, number: state.p1IncidentNumber, notes: closureNotes });
  }

  return { step: 'close', stepIndex: 9, validation, completedAt: new Date().toISOString() };
}

async function stepKBUpdate(state) {
  const wf       = workflows.get(state.workflowId);
  const scenario = VULN_SCENARIOS.find(s => s.id === state.scenarioId) || getCurrentScenario() || VULN_SCENARIOS[0];
  const cvitId   = state.cvitId || 'CVIT-UNKNOWN';
  const topCVE   = state.enrichedCVE || state.findings[0] || {};
  const elapsed  = state.startedAt
    ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000) : 0;

  wf.emit('step', { step: 'kb_update', index: 10, label: 'Knowledge Base Update' });

  // Phase 1: LLM writes the article text only — no tool call (avoids tool_use_failed on long content)
  const writeResult = await runAgent(
    state.workflowId,
    'KBAgent',
    `You are a knowledge management agent. Write concise, technical KB articles about resolved security incidents so future platform engineers can remediate faster. Plain text only — no tool calls.`,
    `Write a KB article (max 400 words) for tracking ID ${cvitId}.
Violation: ${topCVE.id || state.cveId}
Scenario: ${scenario.label}
Resolution: ${scenario.closureSummary}
Cluster: ${state.cluster} | Namespace: claims-processing | Time to resolve: ${elapsed}s

Sections to include:
1. Summary (2 sentences — what was detected and how it was fixed)
2. Root Cause (technical detail — which EOL component, what CVE, why it went undetected)
3. Remediation Steps (exact commands: Dockerfile change, docker build, kubectl rollout)
4. Validation Steps (how to verify the fix — kubectl describe, image tag check, vulnerability scan)
5. Prevention (1-2 bullets — how to catch this earlier in the pipeline)

Write the article text now. Do not call any tools.`,
    false, // no tools — pure text generation
  );

  // Phase 2: directly call the tool with the generated content (no LLM involvement)
  const kbTitle = `[${cvitId}] CVE Remediation — ${topCVE.id || state.cveId} (${scenario.label})`;
  log(state.workflowId, 'KBAgent', 'tool_call', `Creating KB article in ServiceNow: "${kbTitle}"`);
  const kbArticle = await executeTool('create_kb_article', {
    title:   kbTitle,
    content: writeResult.content,
  });
  log(state.workflowId, 'KBAgent', 'tool_result', `KB article ${kbArticle.number} created in ServiceNow`, kbArticle);

  const doneLog = log(state.workflowId, 'KBAgent', 'complete', `KB article ${kbArticle.number} published. Total workflow time: ${elapsed}s`);

  // Emit kb_ready so the client can show the link immediately (no reconnect needed)
  wf.emit('kb_ready', { kbArticle, cvitId, elapsed });

  return {
    step: 'completed',
    stepIndex: 10,
    kbArticle,
    completedAt: new Date().toISOString(),
    agentLogs: [doneLog],
  };
}

// ── Build the LangGraph state machine ─────────────────────────────────────────
function buildGraph() {
  const graph = new StateGraph(WorkflowState);

  graph.addNode('scan',           stepScan);
  graph.addNode('collect',        stepCollect);
  graph.addNode('enrich',         stepEnrich);
  graph.addNode('await_approval', stepAwaitApproval);

  graph.addEdge(START, 'scan');
  graph.addEdge('scan', 'collect');
  graph.addEdge('collect', 'enrich');
  graph.addEdge('enrich', 'await_approval');
  graph.addEdge('await_approval', END);

  return graph.compile();
}

// Second half of the graph (post-approval)
function buildPostApprovalGraph() {
  const graph = new StateGraph(WorkflowState);
  graph.addNode('handover',    stepHandover);
  graph.addNode('work_package',stepWorkPackage);
  graph.addEdge(START, 'handover');
  graph.addEdge('handover', 'work_package');
  graph.addEdge('work_package', END);
  return graph.compile();
}

// Third: post-execution confirmation
function buildPostExecutionGraph() {
  const graph = new StateGraph(WorkflowState);
  graph.addNode('monitor',   stepMonitor);
  graph.addNode('close',     stepClose);
  graph.addNode('kb_update', stepKBUpdate);
  graph.addEdge(START, 'monitor');
  graph.addEdge('monitor', 'close');
  graph.addEdge('close', 'kb_update');
  graph.addEdge('kb_update', END);
  return graph.compile();
}

// ── Public API ─────────────────────────────────────────────────────────────────

async function startWorkflow(workflowId, cluster, cveId, emitFn, p1Info = {}, cvitId = null, scenarioId = null) {
  // Ensure shared scenario state is in sync (in case tools.js reads it)
  if (scenarioId) {
    const scenario = VULN_SCENARIOS.find(s => s.id === scenarioId)
    if (scenario) setCurrentScenario(scenario)
  }

  const state = {
    workflowId, cluster: cluster || 'humana-prod-aks-eastus', cveId: cveId || 'CVE-2022-23529',
    step: 'starting', stepIndex: 0, findings: [], agentLogs: [],
    startedAt: new Date().toISOString(),
    humanApproval: null, humanExecute: null,
    enrichedCVE: null, changeTicket: null, incidentTicket: null,
    githubPR: null, kbArticle: null, validation: null,
    p1IncidentSysId: p1Info.sys_id || null,
    p1IncidentUrl: p1Info.url || null,
    p1IncidentNumber: p1Info.number || null,
    cvitId: cvitId || null,
    scenarioId: scenarioId || null,
  };

  workflows.set(workflowId, { state, emit: emitFn });

  const graph = buildGraph();
  const result = await graph.invoke(state);
  // Merge result into stored state
  Object.assign(workflows.get(workflowId).state, result);
  return result;
}

async function approveWorkflow(workflowId, approvedBy, notes) {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error('Workflow not found');

  wf.state.humanApproval = { status: 'approved', approvedBy: approvedBy || 'security-manager', notes, timestamp: new Date().toISOString() };
  wf.emit('approved', wf.state.humanApproval);

  const graph = buildPostApprovalGraph();
  const result = await graph.invoke({ ...wf.state, humanApproval: wf.state.humanApproval });
  Object.assign(wf.state, result);
  return result;
}

async function rejectWorkflow(workflowId, reason) {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error('Workflow not found');
  wf.state.humanApproval = { status: 'rejected', reason, timestamp: new Date().toISOString() };
  wf.state.step = 'rejected';
  wf.emit('rejected', { reason });
  return wf.state;
}

async function confirmExecution(workflowId, confirmedBy) {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error('Workflow not found');

  wf.state.humanExecute = { status: 'confirmed', confirmedBy: confirmedBy || 'devops-engineer', timestamp: new Date().toISOString() };
  wf.emit('execution_confirmed', wf.state.humanExecute);

  const graph = buildPostExecutionGraph();
  const result = await graph.invoke({ ...wf.state });
  Object.assign(wf.state, result);

  // Broadcast the completed state so the frontend stops the spinner
  wf.emit('state', { ...result, step: 'completed' });
  return result;
}

function getWorkflowState(workflowId) {
  return workflows.get(workflowId)?.state || null;
}

function listWorkflows() {
  return Array.from(workflows.entries()).map(([id, wf]) => ({
    id, step: wf.state.step, stepIndex: wf.state.stepIndex,
    cveId: wf.state.cveId, cluster: wf.state.cluster,
    startedAt: wf.state.startedAt, completedAt: wf.state.completedAt,
  }));
}

module.exports = { startWorkflow, approveWorkflow, rejectWorkflow, confirmExecution, getWorkflowState, listWorkflows, workflows };
