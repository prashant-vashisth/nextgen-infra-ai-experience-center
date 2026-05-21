const express = require('express');
const router = express.Router();
const axios = require('axios');

function snowAxios() {
  const { SNOW_INSTANCE, SNOW_USERNAME, SNOW_PASSWORD } = process.env;
  if (!SNOW_INSTANCE || !SNOW_USERNAME) return null;
  // Strip any protocol prefix and trailing slash from the instance URL
  const host = SNOW_INSTANCE.replace(/^https?:\/\//, '').replace(/\/$/, '');
  // URL-decode the password in case it was pasted with percent-encoding
  const password = decodeURIComponent(SNOW_PASSWORD || '');
  return axios.create({
    baseURL: `https://${host}/api/now`,
    auth: { username: SNOW_USERNAME, password },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 12000,
  });
}

// ── Incidents ──────────────────────────────────────────────────────────────────

router.post('/incident', async (req, res) => {
  const { shortDescription, description, urgency = '2', impact = '2', assignmentGroup = 'Cloud Operations', category = 'Infrastructure' } = req.body;
  const client = snowAxios();

  if (!client) {
    await new Promise(r => setTimeout(r, 600));
    return res.json({
      incident: { number: `INC${Math.floor(Math.random() * 9000000) + 1000000}`, sys_id: `sys-${Date.now()}`, state: 'New', short_description: shortDescription, created_on: new Date().toISOString() },
      mode: 'demo',
    });
  }

  try {
    const body = {
      short_description: shortDescription,
      description,
      urgency,
      impact,
      assignment_group: assignmentGroup,
      category,
      caller_id: 'admin',
    };
    const r = await client.post('/table/incident', body);
    res.json({ incident: r.data.result, mode: 'live' });
  } catch (err) {
    console.error('ServiceNow create incident:', err.response?.status, err.message);
    res.json({
      incident: { number: `INC${Math.floor(Math.random() * 9000000) + 1000000}`, sys_id: `sys-${Date.now()}`, state: 'New', short_description: shortDescription, created_on: new Date().toISOString() },
      mode: 'demo', error: err.message,
    });
  }
});

router.get('/incidents', async (req, res) => {
  const client = snowAxios();
  if (!client) return res.json({ incidents: getMockIncidents(), mode: 'demo' });

  try {
    const query = req.query.q || 'ORDERBYDESCsys_created_on';
    const r = await client.get(`/table/incident?sysparm_limit=15&sysparm_query=${query}&sysparm_fields=number,short_description,state,urgency,priority,assignment_group,opened_at,sys_id`);
    res.json({ incidents: r.data.result, mode: 'live' });
  } catch (err) {
    console.error('ServiceNow get incidents:', err.response?.status, err.message);
    res.json({ incidents: getMockIncidents(), mode: 'demo', error: err.message });
  }
});

router.patch('/incident/:sysId', async (req, res) => {
  const client = snowAxios();
  if (!client) return res.json({ mode: 'demo' });

  try {
    const r = await client.patch(`/table/incident/${req.params.sysId}`, req.body);
    res.json({ incident: r.data.result, mode: 'live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Problems ───────────────────────────────────────────────────────────────────

router.post('/problem', async (req, res) => {
  const { shortDescription, description, priority = '2' } = req.body;
  const client = snowAxios();

  if (!client) {
    await new Promise(r => setTimeout(r, 500));
    return res.json({
      problem: {
        number: `PRB${Math.floor(Math.random() * 900000) + 100000}`,
        sys_id: `sys-prb-${Date.now()}`,
        state: 'Assess',
        short_description: shortDescription,
        priority,
        opened_at: new Date().toISOString(),
      },
      mode: 'demo',
    });
  }

  try {
    const r = await client.post('/table/problem', {
      short_description: shortDescription,
      description,
      priority,
      caller_id: 'admin',
    });
    res.json({ problem: r.data.result, mode: 'live' });
  } catch (err) {
    console.error('ServiceNow create problem:', err.response?.status, err.message);
    res.json({
      problem: { number: `PRB${Math.floor(Date.now() / 1000)}`, state: 'Assess', short_description: shortDescription },
      mode: 'demo', error: err.message,
    });
  }
});

router.get('/problems', async (req, res) => {
  const client = snowAxios();
  if (!client) return res.json({ problems: getMockProblems(), mode: 'demo' });

  try {
    const r = await client.get('/table/problem?sysparm_limit=10&sysparm_query=ORDERBYDESCsys_created_on&sysparm_fields=number,short_description,state,priority,assigned_to,opened_at,sys_id');
    const problems = r.data.result;
    res.json({ problems: problems.length ? problems : getMockProblems(), mode: problems.length ? 'live' : 'demo-fallback' });
  } catch (err) {
    console.error('ServiceNow get problems:', err.response?.status, err.message);
    res.json({ problems: getMockProblems(), mode: 'demo', error: err.message });
  }
});

// ── Work Notes ─────────────────────────────────────────────────────────────────

router.post('/work-note', async (req, res) => {
  const { table = 'incident', sysId, note } = req.body;
  const client = snowAxios();
  if (!client) return res.json({ mode: 'demo' });

  try {
    const r = await client.patch(`/table/${table}/${sysId}`, { work_notes: note });
    res.json({ result: r.data.result, mode: 'live' });
  } catch (err) {
    res.json({ mode: 'demo', error: err.message });
  }
});

// ── KB Articles ────────────────────────────────────────────────────────────────

router.post('/kb-article', async (req, res) => {
  const { title, content } = req.body;
  const client = snowAxios();

  if (!client) {
    return res.json({
      article: { number: `KB${Math.floor(Math.random() * 9000000) + 1000000}`, title: title || 'AI-Generated KB Article', text: content, created_on: new Date().toISOString() },
      mode: 'demo',
    });
  }

  try {
    const r = await client.post('/table/kb_knowledge', {
      short_description: title,
      text: content,
      kb_category: 'Infrastructure',
      workflow_state: 'draft',
    });
    res.json({ article: r.data.result, mode: 'live' });
  } catch (err) {
    console.error('ServiceNow KB:', err.response?.status, err.message);
    res.json({
      article: { number: `KB${Math.floor(Math.random() * 9000000) + 1000000}`, title, text: content, created_on: new Date().toISOString() },
      mode: 'demo', error: err.message,
    });
  }
});

// ── Connection test ────────────────────────────────────────────────────────────

router.get('/status', async (req, res) => {
  const client = snowAxios();
  if (!client) return res.json({ connected: false, mode: 'demo', instance: null });

  const instance = (process.env.SNOW_INSTANCE || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  try {
    await client.get('/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id');
    res.json({ connected: true, mode: 'live', instance });
  } catch (err) {
    res.json({ connected: false, mode: 'demo', instance, error: err.response?.status });
  }
});

// ── Mock fallbacks ─────────────────────────────────────────────────────────────

function getMockIncidents() {
  return [
    { number: 'INC4782341', short_description: 'CLAIMS-ADJUD-NIGHTLY batch job failed — Informatica ETL timeout',        state: 'In Progress', urgency: '1', assignment_group: 'Cloud Operations',      opened_at: new Date(Date.now() - 1800000).toISOString()  },
    { number: 'INC4782198', short_description: 'AKS node memory pressure — humana-prod-aks-eastus node-03',              state: 'New',         urgency: '2', assignment_group: 'Platform Engineering',   opened_at: new Date(Date.now() - 3600000).toISOString()  },
    { number: 'INC4781905', short_description: 'Auth-gateway pod CrashLoopBackOff in member-portal namespace',           state: 'Resolved',    urgency: '2', assignment_group: 'Platform Engineering',   opened_at: new Date(Date.now() - 7200000).toISOString()  },
    { number: 'INC4781567', short_description: 'Terraform apply failure — missing required IAM role binding',            state: 'Resolved',    urgency: '3', assignment_group: 'Automation Engineering', opened_at: new Date(Date.now() - 14400000).toISOString() },
  ];
}

function getMockProblems() {
  return [
    { number: 'PRB0098234', short_description: 'Recurring OOMKilled events in claims-processing namespace during peak hours', state: 'Assess',              priority: '1', opened_at: new Date(Date.now() - 86400000).toISOString()  },
    { number: 'PRB0097891', short_description: 'Intermittent Terraform state lock conflicts during concurrent deployments',   state: 'Root Cause Analysis', priority: '2', opened_at: new Date(Date.now() - 172800000).toISOString() },
  ];
}

module.exports = router;
