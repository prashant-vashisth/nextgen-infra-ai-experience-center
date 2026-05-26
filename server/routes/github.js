const express = require('express');
const router = express.Router();
const axios = require('axios');

function ghHeaders() {
  return process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', Accept: 'application/vnd.github+json' }
    : { Accept: 'application/vnd.github+json' };
}

router.get('/workflow-runs', async (req, res) => {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME || 'aks-nodeapp-demo';

  if (!owner || !process.env.GITHUB_TOKEN) {
    return res.json({ runs: getMockWorkflowRuns(), mode: 'demo' });
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`,
      { headers: ghHeaders(), timeout: 8000 }
    );
    res.json({ runs: response.data.workflow_runs, mode: 'live' });
  } catch (err) {
    res.json({ runs: getMockWorkflowRuns(), mode: 'demo', error: err.message });
  }
});

router.post('/trigger-workflow', async (req, res) => {
  const { scenario = 'failure' } = req.body;
  await new Promise(r => setTimeout(r, 800));
  res.json({
    runId: `run-${Date.now()}`,
    status: 'queued',
    scenario,
    steps: getWorkflowSteps(scenario),
    mode: 'demo',
  });
});

router.post('/create-pr', async (req, res) => {
  const { title, body, cveId, patchContent } = req.body;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME || 'aks-nodeapp-demo';

  if (!owner || !process.env.GITHUB_TOKEN) {
    await new Promise(r => setTimeout(r, 1000));
    return res.json({
      pr: {
        number: Math.floor(Math.random() * 900) + 100,
        title: title || `Fix: ${cveId} remediation`,
        html_url: `https://github.com/humana-platform/humana-aks-policies/pull/${Math.floor(Math.random() * 900) + 100}`,
        state: 'open',
        created_at: new Date().toISOString(),
      },
      mode: 'demo',
    });
  }

  try {
    // Create a real branch and PR
    const branchName = `fix/${cveId || 'patch'}-${Date.now()}`;
    const mainRef = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
      { headers: ghHeaders() }
    );
    const sha = mainRef.data.object.sha;

    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      { ref: `refs/heads/${branchName}`, sha },
      { headers: ghHeaders() }
    );

    const pr = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      { title: title || `Fix: ${cveId}`, body: body || patchContent || 'AI-generated patch', head: branchName, base: 'main' },
      { headers: ghHeaders() }
    );

    res.json({ pr: pr.data, mode: 'live' });
  } catch (err) {
    res.json({
      pr: { number: 142, title: title || `Fix: ${cveId}`, html_url: '#', state: 'open', created_at: new Date().toISOString() },
      mode: 'demo', error: err.message
    });
  }
});

function getMockWorkflowRuns() {
  return [
    { id: 10001, name: 'IDA Pipeline — humana-iac-modules', status: 'completed', conclusion: 'failure', head_branch: 'feature/aks-policy-update', run_number: 247, created_at: new Date(Date.now() - 300000).toISOString(), html_url: '#' },
    { id: 10002, name: 'IDA Pipeline — humana-platform-configs', status: 'completed', conclusion: 'success', head_branch: 'main', run_number: 246, created_at: new Date(Date.now() - 900000).toISOString(), html_url: '#' },
    { id: 10003, name: 'Terraform Apply — humana-aks-policies', status: 'in_progress', conclusion: null, head_branch: 'feature/aks-policy-update', run_number: 245, created_at: new Date(Date.now() - 120000).toISOString(), html_url: '#' },
  ];
}

function getWorkflowSteps(scenario) {
  const steps = [
    { name: 'Checkout', status: 'pending' },
    { name: 'Terraform Init', status: 'pending' },
    { name: 'Terraform Plan', status: 'pending' },
    { name: 'IDA Validation', status: 'pending' },
    { name: 'Terraform Apply', status: 'pending' },
  ];

  if (scenario === 'failure') {
    steps[0].status = 'success';
    steps[1].status = 'success';
    steps[2].status = 'success';
    steps[3].status = 'failure';
    steps[3].error = 'IDA Grade D — Compliance Violation: Missing required tags on azurerm_kubernetes_cluster resource. Security group rule allows 0.0.0.0/0 ingress on port 22. Terraform state lock not configured.';
  } else if (scenario === 'success') {
    steps.forEach(s => s.status = 'success');
    steps[4].grade = 'A';
  }

  return steps;
}

module.exports = router;
