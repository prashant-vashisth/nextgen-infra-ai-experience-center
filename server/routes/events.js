const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const ALERT_TEMPLATES = [
  { source: 'Dynatrace', severity: 'critical', title: 'Host CPU > 95% — claims-processing-node-03',       service: 'claims-processing',   namespace: 'claims-processing'   },
  { source: 'Dynatrace', severity: 'critical', title: 'Response time degradation — member-portal API',    service: 'member-portal',       namespace: 'member-portal'       },
  { source: 'Splunk',    severity: 'high',     title: 'Error spike 847/min in auth-gateway logs',         service: 'auth-gateway',        namespace: 'auth-gateway'        },
  { source: 'Dynatrace', severity: 'high',     title: 'Pod OOMKilled × 12 in 5 min',                     service: 'claims-processing',   namespace: 'claims-processing'   },
  { source: 'Azure Monitor', severity: 'high', title: 'Node disk pressure — humana-prod-aks-eastus',      service: 'AKS',                 namespace: 'kube-system'         },
  { source: 'Splunk',    severity: 'medium',   title: 'JWT validation failures 3× baseline',              service: 'auth-gateway',        namespace: 'auth-gateway'        },
  { source: 'Dynatrace', severity: 'medium',   title: 'Database connection pool at 94% — claims-db-01',  service: 'claims-processing',   namespace: 'data-ingestion'      },
  { source: 'Dynatrace', severity: 'medium',   title: 'Deployment restart loop — pharmacy-sync-worker',  service: 'pharmacy-services',   namespace: 'pharmacy-services'   },
  { source: 'Azure Monitor', severity: 'medium','title': 'Memory utilization 89% — 3 nodes',             service: 'AKS',                 namespace: 'kube-system'         },
  { source: 'Splunk',    severity: 'low',      title: 'Slow query alert — avg 4.2s (threshold 2s)',      service: 'pharmacy-services',   namespace: 'data-ingestion'      },
  { source: 'Dynatrace', severity: 'low',      title: 'Synthetic monitor degradation — member login',    service: 'member-portal',       namespace: 'member-portal'       },
  { source: 'Azure Monitor', severity: 'low',  title: 'Load balancer backend health < 100%',             service: 'member-portal',       namespace: 'member-portal'       },
  { source: 'Splunk',    severity: 'low',      title: 'Certificate expiry warning — 30 days remaining',  service: 'auth-gateway',        namespace: 'auth-gateway'        },
  { source: 'Dynatrace', severity: 'low',      title: 'Garbage collection pause > 500ms — eligibility',  service: 'claims-processing',   namespace: 'claims-processing'   },
  { source: 'Azure Monitor', severity: 'low',  title: 'Network egress spike — data-ingestion namespace', service: 'data-ingestion',      namespace: 'data-ingestion'      },
];

// Three correlated incidents these 15 alerts collapse to
const CORRELATED_INCIDENTS = [
  {
    id: 'INC-AI-001',
    title: 'Memory pressure cascade — claims-processing OOMKill event',
    severity: 'critical',
    confidence: 97,
    rootAlerts: [0, 3, 6, 13],   // indices into ALERT_TEMPLATES
    affectedService: 'claims-processing',
    aiSummary: 'CPU overload on node-03 triggered OOMKills, exhausting DB connection pool. Root: claims-adjud batch job consuming 3× normal memory due to upstream duplicate records.',
    selfHeal: [
      'Scale claims-processing deployment to 6 replicas',
      'Terminate blocking DB session (SID 4421)',
      'Restart claims-adjud-worker pods',
      'Apply memory limit increase: 8Gi',
    ],
    mttr: { manual: '4.2 hrs', ai: '8 min' },
  },
  {
    id: 'INC-AI-002',
    title: 'Auth-gateway JWT failures degrading member-portal',
    severity: 'high',
    confidence: 93,
    rootAlerts: [1, 2, 5, 10],
    affectedService: 'member-portal',
    aiSummary: 'JWT validation failures in auth-gateway are causing cascading timeouts in member-portal API. Root: expired signing key not rotated in 90 days (cert expiry also flagged).',
    selfHeal: [
      'Rotate JWT signing key via Azure Key Vault',
      'Restart auth-gateway pods to pick up new key',
      'Clear member-portal session cache',
      'Schedule automated key rotation every 60 days',
    ],
    mttr: { manual: '2.1 hrs', ai: '4 min' },
  },
  {
    id: 'INC-AI-003',
    title: 'Node disk pressure — AKS kube-system approaching saturation',
    severity: 'medium',
    confidence: 88,
    rootAlerts: [4, 8, 14],
    affectedService: 'AKS Infrastructure',
    aiSummary: 'Two node pools showing 89%+ memory utilization combined with disk pressure from log accumulation. Pharmacy-sync restarts are filling ephemeral storage. Proactive action needed before P1.',
    selfHeal: [
      'Drain and recycle node pool: humana-prod-nodepool-02',
      'Archive logs >7 days from all namespaces',
      'Apply pod disruption budget to pharmacy-services',
      'Scale node pool from 4 → 5 nodes',
    ],
    mttr: { manual: '1.5 hrs', ai: '6 min' },
  },
];

router.get('/alerts', (req, res) => {
  const alerts = ALERT_TEMPLATES.map((a, i) => ({
    id: `ALT-${String(i + 1).padStart(3, '0')}`,
    ...a,
    timestamp: new Date(Date.now() - Math.random() * 600000).toISOString(),
    status: 'open',
  }));
  res.json({ alerts, total: alerts.length });
});

// SSE: stream alerts appearing one by one, then AI deduplication
router.post('/stream-dedup', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Phase 1: stream raw alerts arriving
  for (let i = 0; i < ALERT_TEMPLATES.length; i++) {
    await new Promise(r => setTimeout(r, 280 + Math.random() * 180));
    const alert = { id: `ALT-${String(i + 1).padStart(3, '0')}`, ...ALERT_TEMPLATES[i], timestamp: new Date().toISOString() };
    res.write(`data: ${JSON.stringify({ type: 'alert', alert })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'status', message: 'AI correlation engine processing 15 alerts...' })}\n\n`);
  await new Promise(r => setTimeout(r, 1200));

  res.write(`data: ${JSON.stringify({ type: 'status', message: 'Building service dependency graph...' })}\n\n`);
  await new Promise(r => setTimeout(r, 900));

  res.write(`data: ${JSON.stringify({ type: 'status', message: 'Clustering by blast radius and timing...' })}\n\n`);
  await new Promise(r => setTimeout(r, 700));

  // Phase 2: emit correlated incidents
  for (const incident of CORRELATED_INCIDENTS) {
    await new Promise(r => setTimeout(r, 600));
    res.write(`data: ${JSON.stringify({ type: 'incident', incident })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'done', raw: 15, incidents: 3, noise: 12 })}\n\n`);
  res.end();
});

// Groq-powered deep analysis of a specific incident
router.post('/analyze', async (req, res) => {
  const { incidentId } = req.body;
  const incident = CORRELATED_INCIDENTS.find(i => i.id === incidentId) || CORRELATED_INCIDENTS[0];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!process.env.GROQ_API_KEY) {
    const words = incident.aiSummary.split(' ');
    for (const w of words) {
      res.write(`data: ${JSON.stringify({ type: 'token', token: w + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 50));
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const stream = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: `You are an AIOps engineer at Humana. Analyze this correlated incident and provide concise operational guidance.

Incident: ${incident.title}
Severity: ${incident.severity}
AI Summary: ${incident.aiSummary}
Affected Service: ${incident.affectedService}
Self-Heal Steps: ${incident.selfHeal.join('; ')}

Provide: 1) Technical root cause (2 sentences), 2) Business impact on Humana members/claims, 3) Why AI caught this faster than humans would. Keep it under 250 words, direct and factual.`,
      }],
      stream: true,
      max_tokens: 400,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
    }
  } catch (err) {
    const words = incident.aiSummary.split(' ');
    for (const w of words) {
      res.write(`data: ${JSON.stringify({ type: 'token', token: w + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 40));
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});

router.post('/self-heal', async (req, res) => {
  const { incidentId } = req.body;
  const incident = CORRELATED_INCIDENTS.find(i => i.id === incidentId) || CORRELATED_INCIDENTS[0];
  await new Promise(r => setTimeout(r, 800));
  res.json({
    success: true,
    incidentId,
    stepsExecuted: incident.selfHeal,
    duration: '3m 42s',
    newState: 'resolved',
    snowIncident: `INC${4782400 + Math.floor(Math.random() * 300)}`,
  });
});

module.exports = router;
