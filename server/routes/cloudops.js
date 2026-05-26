const express = require('express');
const router = express.Router();
const axios = require('axios');
const Groq = require('groq-sdk');

let _tokenCache = { token: null, expiresAt: 0 };
async function getToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 30000) return _tokenCache.token;
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID) return null;
  try {
    const params = new URLSearchParams({ grant_type: 'client_credentials', client_id: AZURE_CLIENT_ID, client_secret: AZURE_CLIENT_SECRET, scope: 'https://management.azure.com/.default' });
    const r = await axios.post(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 });
    _tokenCache = { token: r.data.access_token, expiresAt: Date.now() + r.data.expires_in * 1000 };
    return _tokenCache.token;
  } catch { return null; }
}

const CHECKLIST = [
  { id: 'tags',         category: 'Governance',  label: 'Required resource tags',              critical: true,  check: (tf) => /Environment\s*=/.test(tf) && /CostCenter\s*=/.test(tf) && /Owner\s*=/.test(tf) },
  { id: 'hipaa-tags',  category: 'Compliance',   label: 'HIPAA compliance tag present',        critical: true,  check: (tf) => /Compliance\s*=\s*"HIPAA"/.test(tf) },
  { id: 'ssh-nsg',     category: 'Security',     label: 'No unrestricted SSH (port 22)',        critical: true,  check: (tf) => !/0\.0\.0\.0\/0/.test(tf) },
  { id: 'no-public',   category: 'Security',     label: 'Storage public access disabled',      critical: true,  check: (tf) => !/public_blob_access_enabled\s*=\s*true/.test(tf) },
  { id: 'tls',         category: 'Security',     label: 'TLS 1.2+ enforced on storage',        critical: false, check: (tf) => /min_tls_version\s*=\s*"TLS1_2"/.test(tf) },
  { id: 'state-lock',  category: 'Reliability',  label: 'Terraform state backend configured',  critical: false, check: (tf) => /backend\s+"azurerm"/.test(tf) },
  { id: 'pdb',         category: 'Reliability',  label: 'Pod disruption budget defined',       critical: false, check: (tf) => /pod_disruption_budget/.test(tf) },
  { id: 'rbac',        category: 'Security',     label: 'AKS RBAC enabled',                    critical: true,  check: (tf) => /role_based_access_control_enabled\s*=\s*true/.test(tf) },
  { id: 'autoscale',   category: 'Efficiency',   label: 'Cluster autoscaler configured',       critical: false, check: (tf) => /enable_auto_scaling\s*=\s*true/.test(tf) },
  { id: 'monitoring',  category: 'Observability',label: 'Azure Monitor / OMS enabled',         critical: false, check: (tf) => /oms_agent|azure_monitor_profile/.test(tf) },
  { id: 'network',     category: 'Security',     label: 'Private cluster or network policy',   critical: false, check: (tf) => /private_cluster_enabled\s*=\s*true|network_policy/.test(tf) },
  { id: 'disk-enc',    category: 'Compliance',   label: 'Disk encryption configured',          critical: false, check: (tf) => /disk_encryption_set_id|enable_disk_encryption/.test(tf) },
];

// GET /api/cloudops/repos — list real GitHub repos
router.get('/repos', async (req, res) => {
  const { GITHUB_TOKEN, GITHUB_REPO_OWNER } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER) return res.json({ repos: getMockRepos(), mode: 'demo' });

  try {
    const r = await axios.get(`https://api.github.com/users/${GITHUB_REPO_OWNER}/repos?per_page=20&sort=updated`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    });
    const repos = r.data.map(repo => ({
      name: repo.name, fullName: repo.full_name, defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at, language: repo.language, private: repo.private,
    }));
    res.json({ repos, mode: 'live' });
  } catch (err) {
    res.json({ repos: getMockRepos(), mode: 'demo', error: err.message });
  }
});

// POST /api/cloudops/validate — fetch terraform from repo and validate it
router.post('/validate', async (req, res) => {
  const { repo = 'aks-nodeapp-demo', owner } = req.body;
  const { GITHUB_TOKEN, GITHUB_REPO_OWNER } = process.env;
  const repoOwner = owner || GITHUB_REPO_OWNER;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let tfContent = null;

  res.write(`data: ${JSON.stringify({ type: 'step', message: `Fetching Terraform from ${repoOwner}/${repo}...` })}\n\n`);
  await new Promise(r => setTimeout(r, 500));

  // Try to read main.tf from GitHub
  if (GITHUB_TOKEN) {
    try {
      const r = await axios.get(`https://api.github.com/repos/${repoOwner}/${repo}/contents/main.tf`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
      });
      tfContent = Buffer.from(r.data.content, 'base64').toString('utf-8');
      res.write(`data: ${JSON.stringify({ type: 'step', message: `✅ main.tf found (${tfContent.length} bytes) — running IDA checks...` })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: 'step', message: 'main.tf not found — using demo Terraform config' })}\n\n`);
    }
  }

  // Use a demo config if no real file found
  if (!tfContent) {
    tfContent = `resource "azurerm_kubernetes_cluster" "aks" {
  name = "humana-prod-aks"
  tags = { Environment = "production", CostCenter = "HUM-001", Compliance = "HIPAA" }
}`;
  }

  await new Promise(r => setTimeout(r, 400));
  res.write(`data: ${JSON.stringify({ type: 'step', message: 'Running 12 IDA compliance checks...' })}\n\n`);
  await new Promise(r => setTimeout(r, 600));

  const results = CHECKLIST.map(item => ({
    ...item,
    passed: item.check(tfContent),
    check: undefined,
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFails = results.filter(r => !r.passed && r.critical).length;
  const grade = criticalFails === 0 ? (failed === 0 ? 'A' : failed <= 2 ? 'B' : 'C') : (criticalFails === 1 ? 'D' : 'E');

  res.write(`data: ${JSON.stringify({ type: 'results', results, grade, passed, failed, criticalFails, tfContent: tfContent.slice(0, 800) })}\n\n`);

  // Groq remediation for failing checks
  if (failed > 0) {
    await new Promise(r => setTimeout(r, 400));
    res.write(`data: ${JSON.stringify({ type: 'step', message: 'Generating AI remediation for failed checks...' })}\n\n`);
    await new Promise(r => setTimeout(r, 300));

    const failedChecks = results.filter(r => !r.passed).map(r => `- ${r.label} (${r.category})`).join('\n');

    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{ role: 'user', content: `You are a Humana cloud compliance AI. The following Terraform IDA checks failed:\n${failedChecks}\n\nFor each failure, provide the exact Terraform HCL fix in a code block. Be concise — one fix per failure. Max 400 words.` }],
          max_tokens: 600, temperature: 0.1,
        });
        res.write(`data: ${JSON.stringify({ type: 'remediation', content: completion.choices[0].message.content })}\n\n`);
      } catch {
        res.write(`data: ${JSON.stringify({ type: 'remediation', content: getFallbackRemediation(results) })}\n\n`);
      }
    } else {
      res.write(`data: ${JSON.stringify({ type: 'remediation', content: getFallbackRemediation(results) })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'done', grade })}\n\n`);
  res.end();
});

function getFallbackRemediation(results) {
  const fixes = results.filter(r => !r.passed).map(r => {
    const snippets = {
      'rbac': '```hcl\nrole_based_access_control_enabled = true\n```',
      'autoscale': '```hcl\nauto_scaler_profile {}\nenable_auto_scaling = true\nmin_count = 2\nmax_count = 10\n```',
      'monitoring': '```hcl\noms_agent {\n  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id\n}\n```',
      'state-lock': '```hcl\nbackend "azurerm" {\n  storage_account_name = "humanatfstate"\n  container_name = "tfstate"\n  key = "prod.terraform.tfstate"\n}\n```',
      'tls': '```hcl\nmin_tls_version = "TLS1_2"\n```',
      'network': '```hcl\nnetwork_profile {\n  network_policy = "azure"\n  network_plugin = "azure"\n}\n```',
      'disk-enc': '```hcl\ndisk_encryption_set_id = azurerm_disk_encryption_set.main.id\n```',
      'pdb': '```hcl\nresource "kubernetes_pod_disruption_budget" "app" {\n  min_available = 1\n}\n```',
    };
    return `**${r.label}**\n${snippets[r.id] || '```hcl\n# Add required configuration\n```'}`;
  });
  return fixes.join('\n\n');
}

function getMockRepos() {
  return [
    { name: 'aks-nodeapp-demo',          fullName: 'prashant-vashisth/aks-nodeapp-demo',          defaultBranch: 'main', language: 'HCL',        updatedAt: new Date().toISOString() },
    { name: 'humana-iac-modules',        fullName: 'prashant-vashisth/humana-iac-modules',        defaultBranch: 'main', language: 'HCL',        updatedAt: new Date(Date.now() - 86400000).toISOString() },
    { name: 'humana-platform-configs',   fullName: 'prashant-vashisth/humana-platform-configs',   defaultBranch: 'main', language: 'YAML',       updatedAt: new Date(Date.now() - 172800000).toISOString() },
  ];
}

module.exports = router;
