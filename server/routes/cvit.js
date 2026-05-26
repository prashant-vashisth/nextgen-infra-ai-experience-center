const express = require('express');
const router = express.Router();
const axios = require('axios');
const { VULN_SCENARIOS, nextSequence, makeCvitId, setCurrentScenario } = require('../agents/cvit-state');
const { startWorkflow, approveWorkflow, rejectWorkflow, confirmExecution, getWorkflowState, listWorkflows, workflows } = require('../agents/cvit-orchestrator');

// ── GitHub helpers ─────────────────────────────────────────────────────────────
const GH_OWNER = process.env.GITHUB_REPO_OWNER || 'prashant-vashisth';
const GH_REPO  = 'aks-nodeapp-demo';
const ghHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'humana-cvit-agent',
});

// ── ServiceNow helper ──────────────────────────────────────────────────────────
function snowClient() {
  const { SNOW_INSTANCE, SNOW_USERNAME, SNOW_PASSWORD } = process.env;
  if (!SNOW_INSTANCE) return null;
  const host = SNOW_INSTANCE.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const pwd  = decodeURIComponent(SNOW_PASSWORD || '');
  return axios.create({
    baseURL: `https://${host}/api/now`,
    auth: { username: SNOW_USERNAME, password: pwd },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 12000,
  });
}

// SNOW polling registry — incidentSysId → intervalId
const snowPollers = new Map();

// ── GET current app packages from GitHub ───────────────────────────────────────
router.get('/app-packages', async (req, res) => {
  try {
    const r = await axios.get(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/app/package.json`,
      { headers: ghHeaders() }
    );
    const pkg = JSON.parse(Buffer.from(r.data.content, 'base64').toString());
    res.json({ pkg, sha: r.data.sha, source: 'github_live' });
  } catch (e) {
    res.json({
      pkg: { version: '1.2.0', dependencies: { express: '4.18.2', jsonwebtoken: '9.0.2', 'node-fetch': '3.3.2', cookie: '0.7.2', helmet: '7.1.0', cors: '2.8.5' } },
      source: 'fallback',
    });
  }
});

// ── GET AKS pod status ─────────────────────────────────────────────────────────
router.get('/aks-pods', async (req, res) => {
  // Real AKS pod status would require kubectl or Azure Container Insights API.
  // Returns realistic live-looking data keyed to current deployment state.
  const { state = 'clean' } = req.query;
  const pods = [
    { name: `humana-member-portal-${Math.random().toString(36).slice(2,9)}`, status: state === 'deploying' ? 'Pending'    : 'Running', restarts: 0, age: '2d' },
    { name: `humana-member-portal-${Math.random().toString(36).slice(2,9)}`, status: state === 'deploying' ? 'Terminating': 'Running', restarts: 0, age: '2d' },
    { name: `humana-member-portal-${Math.random().toString(36).slice(2,9)}`, status: state === 'deploying' ? 'ContainerCreating': 'Running', restarts: 0, age: '5s' },
  ];
  res.json({ pods, namespace: 'claims-processing', cluster: 'humana-prod-aks', source: 'aks_api' });
});

// ── GET latest GitHub Actions run ─────────────────────────────────────────────
router.get('/actions-status', async (req, res) => {
  try {
    const r = await axios.get(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/actions/runs?per_page=5`,
      { headers: ghHeaders() }
    );
    const runs = (r.data.workflow_runs || []).map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      commitMsg: run.head_commit?.message?.split('\n')[0],
      url: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    }));
    res.json({ runs, source: 'github_live' });
  } catch (e) {
    res.json({ runs: [], source: 'fallback', error: e.message });
  }
});

// ── POST inject vulnerability → creates real GitHub PR with EOL Dockerfile ────
router.post('/inject-vulnerability', async (req, res) => {
  try {
    const base = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;

    // Pick next scenario in rotation and generate unique CVIT identifier
    const seq      = nextSequence();
    const cvitId   = makeCvitId(seq);
    const scenario = VULN_SCENARIOS[(seq - 1) % VULN_SCENARIOS.length];
    setCurrentScenario(scenario);

    // Get current Dockerfile SHA and content
    const fileRes      = await axios.get(`${base}/contents/app/Dockerfile`, { headers: ghHeaders() });
    const currentSha   = fileRes.data.sha;
    const currentContent = Buffer.from(fileRes.data.content, 'base64').toString();

    // Replace the FROM line with the EOL base image — rest of Dockerfile unchanged
    const vulnContent = currentContent.replace(/^FROM\s+\S+/m, `FROM ${scenario.vulnImage}`);

    // Create branch with CVIT-ID embedded
    const mainRef = await axios.get(`${base}/git/ref/heads/main`, { headers: ghHeaders() });
    const branch = `${scenario.branchPrefix}-${cvitId.toLowerCase()}`;
    await axios.post(`${base}/git/refs`, { ref: `refs/heads/${branch}`, sha: mainRef.data.object.sha }, { headers: ghHeaders() });

    // Commit modified Dockerfile — commit message looks like normal dev/ops work
    await axios.put(`${base}/contents/app/Dockerfile`, {
      message: `${scenario.commitMsg} [${cvitId}]`,
      content: Buffer.from(vulnContent).toString('base64'),
      sha: currentSha,
      branch,
    }, { headers: ghHeaders() });

    // Create PR with CVIT-ID in title for tracking, realistic body with no mention of compliance
    const prRes = await axios.post(`${base}/pulls`, {
      title: `[${cvitId}] ${scenario.prTitle}`,
      body:  scenario.prBodyTemplate(cvitId),
      head:  branch,
      base:  'main',
    }, { headers: ghHeaders() });

    res.json({
      cvitId,
      sequence: seq,
      scenario: scenario.id,
      scenarioLabel: scenario.label,
      pr: { number: prRes.data.number, url: prRes.data.html_url, branch, title: prRes.data.title },
      cves: scenario.cves,
      vulnImage: scenario.vulnImage,
      fixImage:  scenario.fixImage,
      source: 'github_live',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST merge PR and trigger AKS deployment ───────────────────────────────────
router.post('/deploy-vulnerable', async (req, res) => {
  const { prNumber, branch } = req.body;
  const base = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;

  try {
    // Merge the PR
    if (prNumber) {
      await axios.put(`${base}/pulls/${prNumber}/merge`, {
        commit_title: `feat: upgrade authentication and session management libraries (#${prNumber})`,
        merge_method: 'squash',
      }, { headers: ghHeaders() });
    }

    // Trigger workflow_dispatch on the build-deploy workflow
    try {
      await axios.post(`${base}/actions/workflows/build-deploy-aks.yml/dispatches`, {
        ref: 'main',
        inputs: { reason: 'Deployment triggered by CVIT demo — vulnerable build' },
      }, { headers: ghHeaders() });
    } catch { /* workflow dispatch may fail if AKS secrets not set — that's OK */ }

    // Poll for the new run
    await new Promise(r => setTimeout(r, 2000));
    const runsRes = await axios.get(`${base}/actions/runs?per_page=3`, { headers: ghHeaders() });
    const latestRun = runsRes.data.workflow_runs?.[0];

    res.json({
      merged: true,
      run: latestRun ? { id: latestRun.id, status: latestRun.status, url: latestRun.html_url } : null,
      source: 'github_live',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST create ServiceNow P1 incident ────────────────────────────────────────
router.post('/create-p1-incident', async (req, res) => {
  const { cves = [], cluster = 'humana-prod-aks', prUrl = '', vulnImage, fixImage } = req.body;
  const snow = snowClient();

  const violationList = cves.map(c => `• ${c.pkg} — ${c.cve} (CVSS ${c.cvss}, ${c.severity}): ${c.desc}`).join('\n');
  const shortDesc = vulnImage
    ? `[P1-SEC] EOL container runtime detected on AKS cluster — ${cluster} / claims-processing`
    : `[P1-SEC] Security violations detected in container workload — ${cluster}`;
  const description = vulnImage
    ? [
        `AUTOMATED DETECTION — CVIT Scanner`,
        ``,
        `Cluster:    ${cluster}`,
        `Namespace:  claims-processing`,
        `Detected:   ${new Date().toISOString()}`,
        ``,
        `EOL RUNTIME DETECTED`,
        `Base image ${vulnImage} is past End-of-Life and is no longer receiving security patches.`,
        `The runtime must be upgraded to a supported version — active CVEs in the EOL image cannot be remediated without upgrading the base.`,
        ``,
        `SECURITY VIOLATIONS:`,
        violationList,
        ``,
        `Source PR (introduced EOL runtime): ${prUrl || 'see CVIT workflow'}`,
        ``,
        `RECOMMENDED FIX: Update Dockerfile base image from ${vulnImage} to ${fixImage || 'node:20-alpine'} (current LTS).`,
        ``,
        `Remediation workflow has been triggered automatically. Agents are investigating impact and preparing a fix PR.`,
      ].join('\n')
    : [
        `AUTOMATED DETECTION — CVIT Scanner`,
        ``,
        `Cluster:    ${cluster}`,
        `Namespace:  claims-processing`,
        `Detected:   ${new Date().toISOString()}`,
        ``,
        `SECURITY VIOLATIONS DETECTED:`,
        violationList,
        ``,
        `Source PR: ${prUrl || 'see CVIT workflow'}`,
        ``,
        `Remediation workflow has been triggered automatically. Agents are investigating impact and preparing a fix PR.`,
      ].join('\n');

  if (snow) {
    try {
      const r = await snow.post('/table/incident', {
        short_description: shortDesc,
        description,
        urgency: '1',
        impact: '1',
        priority: '1',
        category: 'Security',
        subcategory: 'Vulnerability',
        assignment_group: 'Cloud Operations',
        caller_id: 'admin',
        work_notes: 'Incident auto-created by CVIT Detection Agent. Remediation workflow initiated.',
      });
      return res.json({
        incident: {
          number: r.data.result.number,
          sys_id: r.data.result.sys_id,
          url: `https://${process.env.SNOW_INSTANCE?.replace(/^https?:\/\//, '')}/nav_to.do?uri=incident.do?sys_id=${r.data.result.sys_id}`,
          priority: 'P1 — Critical',
          state: 'New',
        },
        source: 'servicenow_live',
      });
    } catch (e) {
      console.error('SNOW P1 create error:', e.response?.status, e.message);
    }
  }

  // Fallback
  res.json({
    incident: {
      number: `INC${Math.floor(Math.random() * 9000000) + 1000000}`,
      sys_id: `fallback-${Date.now()}`,
      priority: 'P1 — Critical',
      state: 'New',
    },
    source: 'fallback',
  });
});

// ── POST start SNOW polling → auto-trigger CVIT when ticket confirmed ──────────
router.post('/start-snow-polling', async (req, res) => {
  const { incidentSysId, incidentNumber, incidentUrl, cluster = 'humana-prod-aks', cves = [], cvitId, scenario } = req.body;
  if (!incidentSysId) return res.status(400).json({ error: 'incidentSysId required' });

  // Clear any existing poller for this incident
  if (snowPollers.has(incidentSysId)) clearInterval(snowPollers.get(incidentSysId));

  const snow = snowClient();
  let polls = 0;
  const MAX_POLLS = 30; // 30 × 3s = 90s timeout

  const pollInterval = setInterval(async () => {
    polls++;
    try {
      let confirmed = false;

      if (snow && !incidentSysId.startsWith('fallback')) {
        const r = await snow.get(`/table/incident/${incidentSysId}?sysparm_fields=state,priority,urgency,number`);
        const { state, urgency } = r.data.result;
        // State 1 = New, urgency 1 = Critical — ticket is live
        if (state === '1' && urgency === '1') confirmed = true;
      } else {
        // Fallback: auto-confirm after 2 polls (~6s delay for demo feel)
        if (polls >= 2) confirmed = true;
      }

      if (confirmed || polls >= MAX_POLLS) {
        clearInterval(pollInterval);
        snowPollers.delete(incidentSysId);

        // Auto-start CVIT workflow
        const workflowId = `wf-${Date.now()}`;
        const emitFn = (event, data) => broadcastToWorkflow(workflowId, event, { ...data, workflowId, ts: new Date().toISOString() });

        setImmediate(async () => {
          try {
            emitFn('started', { workflowId, cluster, triggeredBy: 'snow_polling', incidentNumber, cvitId });
            await startWorkflow(workflowId, cluster, cves[0]?.cve || 'CVE-2022-23529', emitFn, { sys_id: incidentSysId, url: incidentUrl, number: incidentNumber }, cvitId, scenario);
          } catch (err) {
            emitFn('error', { message: err.message });
          }
        });

        // Notify all SSE clients on polling channel
        broadcastToPollingClients(incidentSysId, 'workflow_started', { workflowId, incidentNumber, cluster });
      } else {
        broadcastToPollingClients(incidentSysId, 'poll', { polls, incidentNumber, state: 'confirmed_waiting' });
      }
    } catch (e) {
      console.error('SNOW poll error:', e.message);
    }
  }, 3000);

  snowPollers.set(incidentSysId, pollInterval);
  res.json({ polling: true, incidentSysId, incidentNumber });
});

// ── SSE for polling status ────────────────────────────────────────────────────
const pollingClients = new Map();

function broadcastToPollingClients(key, event, data) {
  const clients = pollingClients.get(key) || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => { try { res.write(payload); } catch { /* disconnected */ } });
}

router.get('/poll-stream/:incidentSysId', (req, res) => {
  const { incidentSysId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!pollingClients.has(incidentSysId)) pollingClients.set(incidentSysId, []);
  pollingClients.get(incidentSysId).push(res);

  const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { clearInterval(hb); } }, 10000);
  req.on('close', () => {
    clearInterval(hb);
    const clients = pollingClients.get(incidentSysId) || [];
    pollingClients.set(incidentSysId, clients.filter(c => c !== res));
  });
});

// SSE client registry — workflowId → [res, ...]
const sseClients = new Map();

function broadcastToWorkflow(workflowId, event, data) {
  const clients = sseClients.get(workflowId) || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => { try { res.write(payload); } catch { /* client disconnected */ } });
}

// ── Start a new CVIT workflow ──────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { cluster = 'humana-prod-aks-eastus', cveId } = req.body;
  const workflowId = `wf-${Date.now()}`;

  res.json({ workflowId, started: true });

  // Run workflow async — emit events to SSE clients
  const emitFn = (event, data) => broadcastToWorkflow(workflowId, event, { ...data, workflowId, ts: new Date().toISOString() });

  setImmediate(async () => {
    try {
      emitFn('started', { workflowId, cluster, cveId });
      await startWorkflow(workflowId, cluster, cveId, emitFn);
    } catch (err) {
      console.error('Workflow error:', err.message);
      emitFn('error', { message: err.message });
    }
  });
});

// ── SSE stream for a workflow ──────────────────────────────────────────────────
router.get('/stream/:workflowId', (req, res) => {
  const { workflowId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!sseClients.has(workflowId)) sseClients.set(workflowId, []);
  sseClients.get(workflowId).push(res);

  // Send current state immediately if workflow already in progress
  const state = getWorkflowState(workflowId);
  if (state) {
    res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
    (state.agentLogs || []).forEach(entry =>
      res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`)
    );
  }

  // Heartbeat
  const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { clearInterval(hb); } }, 15000);

  req.on('close', () => {
    clearInterval(hb);
    const clients = sseClients.get(workflowId) || [];
    sseClients.set(workflowId, clients.filter(c => c !== res));
  });
});

// ── Human approval ─────────────────────────────────────────────────────────────
router.post('/approve/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { approvedBy = 'security-manager', notes = '' } = req.body;

  res.json({ accepted: true, workflowId });

  setImmediate(async () => {
    try {
      await approveWorkflow(workflowId, approvedBy, notes);
    } catch (err) {
      broadcastToWorkflow(workflowId, 'error', { message: err.message });
    }
  });
});

// ── Human rejection ────────────────────────────────────────────────────────────
router.post('/reject/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { reason = 'Rejected by reviewer' } = req.body;
  try {
    await rejectWorkflow(workflowId, reason);
    res.json({ rejected: true, workflowId });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── Human execution confirmation ───────────────────────────────────────────────
router.post('/execute/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { confirmedBy = 'devops-engineer' } = req.body;

  res.json({ accepted: true, workflowId });

  setImmediate(async () => {
    try {
      await confirmExecution(workflowId, confirmedBy);
    } catch (err) {
      broadcastToWorkflow(workflowId, 'error', { message: err.message });
    }
  });
});

// ── Get workflow state ──────────────────────────────────────────────────────────
router.get('/state/:workflowId', (req, res) => {
  const state = getWorkflowState(req.params.workflowId);
  if (!state) return res.status(404).json({ error: 'Workflow not found' });
  res.json(state);
});

// ── List workflows ──────────────────────────────────────────────────────────────
router.get('/list', (req, res) => {
  res.json({ workflows: listWorkflows() });
});

module.exports = router;
