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

// GET /api/finops/summary — daily costs for current month, grouped by service
router.get('/summary', async (req, res) => {
  const token = await getToken();
  if (!token) return res.json({ costs: getMockDailyCosts(), services: getMockServiceBreakdown(), anomalies: getMockAnomalies(), mode: 'demo' });

  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    const body = {
      type: 'ActualCost',
      timeframe: 'MonthToDate',
      dataset: {
        granularity: 'Daily',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
      },
    };
    const r = await axios.post(
      `https://management.azure.com/subscriptions/${sub}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`,
      body,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const rows = r.data.properties?.rows || [];
    const cols = r.data.properties?.columns?.map(c => c.name) || [];
    const costIdx = cols.indexOf('Cost');
    const dateIdx = cols.indexOf('UsageDate');

    const costs = rows.map(row => ({
      date: String(row[dateIdx]).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      amount: Number(row[costIdx]).toFixed(2),
    }));

    // Service breakdown query
    const body2 = { ...body, dataset: { ...body.dataset, granularity: 'None', grouping: [{ type: 'Dimension', name: 'ServiceName' }] } };
    const r2 = await axios.post(
      `https://management.azure.com/subscriptions/${sub}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`,
      body2,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const rows2 = r2.data.properties?.rows || [];
    const cols2 = r2.data.properties?.columns?.map(c => c.name) || [];
    const ci = cols2.indexOf('Cost'), si = cols2.indexOf('ServiceName');
    const services = rows2
      .map(r => ({ service: r[si] || 'Other', amount: Number(r[ci]).toFixed(2) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    res.json({ costs, services, anomalies: detectAnomalies(costs), mode: 'live' });
  } catch (err) {
    const status = err.response?.status;
    res.json({
      costs: getMockDailyCosts(),
      services: getMockServiceBreakdown(),
      anomalies: getMockAnomalies(),
      mode: 'demo',
      hint: status === 403 ? 'Add Cost Management Reader role to the service principal' : undefined,
    });
  }
});

// POST /api/finops/analyze — Groq analysis of cost anomalies
router.post('/analyze', async (req, res) => {
  const { anomalies, totalSpend, topService } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!process.env.GROQ_API_KEY) {
    const fallback = getFallbackAnalysis();
    for (const word of fallback.split(' ')) {
      res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 40));
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const stream = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: `You are a FinOps AI analyst for Humana Health. Analyze these Azure cloud cost anomalies and provide actionable recommendations.

Month-to-date spend: $${totalSpend || '142,847'}
Top service: ${topService || 'Azure Kubernetes Service'}
Anomalies detected: ${JSON.stringify(anomalies || getMockAnomalies())}

Provide:
1. Root cause of the top anomaly (2 sentences)
2. Three specific rightsizing recommendations with estimated $ savings each
3. Forecast: projected end-of-month overage if unchecked
4. One quick win action (can be done today)

Keep under 300 words. Use specific numbers.`,
      }],
      stream: true,
      max_tokens: 500,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  } catch {
    const fallback = getFallbackAnalysis();
    for (const word of fallback.split(' ')) {
      res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 35));
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

function detectAnomalies(costs) {
  if (!costs.length) return getMockAnomalies();
  const amounts = costs.map(c => Number(c.amount));
  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  return costs
    .filter(c => Number(c.amount) > avg * 1.4)
    .map(c => ({ date: c.date, amount: c.amount, expected: avg.toFixed(2), pct: Math.round(((Number(c.amount) - avg) / avg) * 100) }))
    .slice(0, 5);
}

function getMockDailyCosts() {
  const days = 22;
  const base = 6200;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i) * 86400000);
    const spike = (i === 8 || i === 15) ? 2.8 : (i === 18 ? 2.1 : 1);
    const noise = 0.85 + Math.random() * 0.3;
    return { date: date.toISOString().slice(0, 10), amount: (base * noise * spike).toFixed(2) };
  });
}

function getMockServiceBreakdown() {
  return [
    { service: 'Azure Kubernetes Service',    amount: '48230.00' },
    { service: 'Azure Virtual Machines',      amount: '31450.00' },
    { service: 'Azure SQL Database',          amount: '22180.00' },
    { service: 'Azure Storage',               amount: '14320.00' },
    { service: 'Azure Container Registry',    amount: '9870.00'  },
    { service: 'Azure Monitor',               amount: '7640.00'  },
    { service: 'Azure Backup',                amount: '5210.00'  },
    { service: 'Other Services',              amount: '3947.00'  },
  ];
}

function getMockAnomalies() {
  return [
    { date: '2026-05-09', amount: '17640.00', expected: '6200.00', pct: 184, service: 'Azure Kubernetes Service',  reason: 'AKS node pool auto-scaled to 18 nodes — batch job memory spike' },
    { date: '2026-05-16', amount: '16890.00', expected: '6200.00', pct: 172, service: 'Azure Virtual Machines',    reason: '12 dev VMs left running over weekend — no auto-shutdown policy' },
    { date: '2026-05-19', amount: '13020.00', expected: '6200.00', pct: 110, service: 'Azure SQL Database',        reason: 'DTU consumption spike — long-running query without index' },
  ];
}

function getFallbackAnalysis() {
  return `**FinOps AI Analysis — Azure Cost Anomalies**

**Top Anomaly Root Cause**
The 184% cost spike on May 9 was caused by the CLAIMS-ADJUD-NIGHTLY batch job triggering AKS cluster auto-scale from 6 to 18 nodes. The scale-out was legitimate but the scale-in never triggered because the Cluster Autoscaler scale-down delay was set to 60 minutes — resulting in 8 hours of over-provisioned nodes at $0.48/node/hour.

**Rightsizing Recommendations**
1. **AKS node pool scale-down delay**: Reduce from 60 min → 10 min. Estimated saving: **$8,400/month**
2. **Dev VM auto-shutdown policy**: Apply 7pm shutdown + weekend off schedule to 23 dev VMs. Estimated saving: **$5,200/month**
3. **SQL elastic pool migration**: Move 4 single-database instances to a single elastic pool. Estimated saving: **$3,100/month**

**End-of-Month Forecast**
At current burn rate (including anomalies), projected spend: **$189,000** vs budget **$148,000** — **$41,000 overage risk (27.7%)**.

**Quick Win (Today)**
Run this Azure CLI command to enable auto-shutdown on all dev VMs: \`az vm auto-shutdown --enable --time 1900 --resource-group humana-dev-rg\`
Immediate impact: prevents weekend over-run. Zero infrastructure change needed.`;
}

module.exports = router;
