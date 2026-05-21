const express = require('express');
const router = express.Router();
const axios = require('axios');

function snowAxios() {
  const { SNOW_INSTANCE, SNOW_USERNAME, SNOW_PASSWORD } = process.env;
  if (!SNOW_INSTANCE || !SNOW_USERNAME) return null;
  return axios.create({
    baseURL: `https://${SNOW_INSTANCE}/api/now`,
    auth: { username: SNOW_USERNAME, password: SNOW_PASSWORD },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 10000,
  });
}

router.post('/incident', async (req, res) => {
  const { shortDescription, description, urgency = '2', impact = '2', assignmentGroup = 'Cloud Operations' } = req.body;
  const client = snowAxios();

  if (!client) {
    await new Promise(r => setTimeout(r, 600));
    const num = `INC${Math.floor(Math.random() * 9000000) + 1000000}`;
    return res.json({
      incident: { number: num, sys_id: `sys-${Date.now()}`, state: 'New', short_description: shortDescription, created_on: new Date().toISOString() },
      mode: 'demo',
    });
  }

  try {
    const body = { short_description: shortDescription, description, urgency, impact, assignment_group: assignmentGroup };
    const r = await client.post('/table/incident', body);
    res.json({ incident: r.data.result, mode: 'live' });
  } catch (err) {
    const num = `INC${Math.floor(Math.random() * 9000000) + 1000000}`;
    res.json({
      incident: { number: num, sys_id: `sys-${Date.now()}`, state: 'New', short_description: shortDescription, created_on: new Date().toISOString() },
      mode: 'demo', error: err.message
    });
  }
});

router.get('/incidents', async (req, res) => {
  const client = snowAxios();

  if (!client) {
    return res.json({ incidents: getMockIncidents(), mode: 'demo' });
  }

  try {
    const r = await client.get('/table/incident?sysparm_limit=10&sysparm_query=active=true^ORDERBYDESCsys_created_on');
    res.json({ incidents: r.data.result, mode: 'live' });
  } catch (err) {
    res.json({ incidents: getMockIncidents(), mode: 'demo', error: err.message });
  }
});

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
        created_on: new Date().toISOString(),
        assigned_to: 'Cloud Operations',
        impacted_services: ['claims-processing', 'member-portal'],
      },
      mode: 'demo',
    });
  }

  try {
    const r = await client.post('/table/problem', { short_description: shortDescription, description, priority });
    res.json({ problem: r.data.result, mode: 'live' });
  } catch (err) {
    res.json({
      problem: { number: `PRB${Date.now()}`, state: 'Assess', short_description: shortDescription },
      mode: 'demo', error: err.message
    });
  }
});

router.get('/problems', async (req, res) => {
  res.json({ problems: getMockProblems(), mode: 'demo' });
});

router.post('/kb-article', async (req, res) => {
  await new Promise(r => setTimeout(r, 400));
  res.json({
    article: {
      number: `KB${Math.floor(Math.random() * 9000000) + 1000000}`,
      title: req.body.title || 'AI-Generated KB Article',
      text: req.body.content,
      category: 'Infrastructure',
      created_on: new Date().toISOString(),
    },
    mode: 'demo',
  });
});

function getMockIncidents() {
  return [
    { number: 'INC4782341', short_description: 'CLAIMS-ADJUD-NIGHTLY batch job failed — Informatica ETL timeout', state: 'In Progress', urgency: '1', assignment_group: 'Cloud Operations', opened_at: new Date(Date.now() - 1800000).toISOString() },
    { number: 'INC4782198', short_description: 'AKS node memory pressure — humana-prod-aks-eastus node-03', state: 'New', urgency: '2', assignment_group: 'Platform Engineering', opened_at: new Date(Date.now() - 3600000).toISOString() },
    { number: 'INC4781905', short_description: 'Auth-gateway pod CrashLoopBackOff in member-portal namespace', state: 'Resolved', urgency: '2', assignment_group: 'Platform Engineering', opened_at: new Date(Date.now() - 7200000).toISOString() },
    { number: 'INC4781567', short_description: 'Terraform apply failure — missing required IAM role binding', state: 'Resolved', urgency: '3', assignment_group: 'Automation Engineering', opened_at: new Date(Date.now() - 14400000).toISOString() },
  ];
}

function getMockProblems() {
  return [
    {
      number: 'PRB0098234',
      short_description: 'Recurring OOMKilled events in claims-processing namespace during peak hours',
      state: 'Assess',
      priority: '1',
      impacted_services: ['claims-processing', 'pharmacy-services'],
      linked_incidents: ['INC4782341', 'INC4779012', 'INC4774533'],
      assigned_to: 'Platform Engineering',
      opened_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      number: 'PRB0097891',
      short_description: 'Intermittent Terraform state lock conflicts during concurrent deployments',
      state: 'Root Cause Analysis',
      priority: '2',
      impacted_services: ['Automation Engineering', 'Platform Build'],
      linked_incidents: ['INC4780234', 'INC4776102'],
      assigned_to: 'Automation Engineering',
      opened_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}

module.exports = router;
