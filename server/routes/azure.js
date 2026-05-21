const express = require('express');
const router = express.Router();
const axios = require('axios');

let _tokenCache = { token: null, expiresAt: 0 };

async function getAzureToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 30000) return _tokenCache.token;
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) return null;

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: 'https://management.azure.com/.default',
    });
    const r = await axios.post(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000,
    });
    _tokenCache = { token: r.data.access_token, expiresAt: Date.now() + r.data.expires_in * 1000 };
    return _tokenCache.token;
  } catch (err) {
    console.error('Azure auth error:', err.message);
    return null;
  }
}

function armClient(token) {
  return axios.create({
    baseURL: 'https://management.azure.com',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 12000,
  });
}

// ── Status ─────────────────────────────────────────────────────────────────────

router.get('/status', async (req, res) => {
  const hasConfig = !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
  if (!hasConfig) return res.json({ connected: false, mode: 'demo', subscriptionId: null });

  const token = await getAzureToken();
  res.json({
    connected: !!token,
    mode: token ? 'live' : 'demo',
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    tenantId: process.env.AZURE_TENANT_ID,
  });
});

// ── AKS Clusters ───────────────────────────────────────────────────────────────

router.get('/clusters', async (req, res) => {
  const token = await getAzureToken();
  if (!token) return res.json({ clusters: getMockClusters(), mode: 'demo' });

  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    const r = await armClient(token).get(
      `/subscriptions/${sub}/providers/Microsoft.ContainerService/managedClusters?api-version=2024-01-01`
    );
    const clusters = r.data.value.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      resourceGroup: c.id.split('/')[4],
      kubernetesVersion: c.properties?.kubernetesVersion,
      provisioningState: c.properties?.provisioningState,
      nodePools: c.properties?.agentPoolProfiles?.length || 0,
      nodeCount: (c.properties?.agentPoolProfiles || []).reduce((s, p) => s + (p.count || 0), 0),
      fqdn: c.properties?.fqdn,
      status: c.properties?.provisioningState === 'Succeeded' ? 'healthy' : 'warning',
    }));
    res.json({ clusters: clusters.length ? clusters : getMockClusters(), mode: clusters.length ? 'live' : 'demo-empty' });
  } catch (err) {
    const status = err.response?.status;
    console.error('Azure clusters:', status, err.response?.data?.error?.code);
    // 403 = missing RBAC role — return mock but flag it clearly
    res.json({
      clusters: getMockClusters(),
      mode: 'demo',
      rbacError: status === 403,
      hint: status === 403 ? 'Grant the service principal Reader role on the subscription in Azure Portal → IAM' : undefined,
      error: err.response?.data?.error?.message,
    });
  }
});

// ── Cluster detail ─────────────────────────────────────────────────────────────

router.get('/cluster/:resourceGroup/:name', async (req, res) => {
  const token = await getAzureToken();
  if (!token) return res.json({ cluster: getMockClusterDetail(req.params.name), mode: 'demo' });

  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    const r = await armClient(token).get(
      `/subscriptions/${sub}/resourceGroups/${req.params.resourceGroup}/providers/Microsoft.ContainerService/managedClusters/${req.params.name}?api-version=2024-01-01`
    );
    const c = r.data;
    res.json({
      cluster: {
        name: c.name,
        location: c.location,
        kubernetesVersion: c.properties?.kubernetesVersion,
        fqdn: c.properties?.fqdn,
        provisioningState: c.properties?.provisioningState,
        nodePools: (c.properties?.agentPoolProfiles || []).map(p => ({
          name: p.name, count: p.count, vmSize: p.vmSize,
          osType: p.osType, mode: p.mode,
          provisioningState: p.provisioningState,
        })),
        addons: Object.keys(c.properties?.addonProfiles || {}),
        tags: c.tags || {},
      },
      mode: 'live',
    });
  } catch (err) {
    res.json({ cluster: getMockClusterDetail(req.params.name), mode: 'demo', error: err.message });
  }
});

// ── Microsoft Defender for Cloud — security findings ──────────────────────────

router.get('/security-findings', async (req, res) => {
  const token = await getAzureToken();
  if (!token) return res.json({ findings: [], mode: 'demo' });

  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    // Get unhealthy security assessments — these are real findings from Defender for Cloud
    const r = await armClient(token).get(
      `/subscriptions/${sub}/providers/Microsoft.Security/assessments?api-version=2021-06-01`
    );

    const unhealthy = (r.data.value || [])
      .filter(a => a.properties?.status?.code === 'Unhealthy')
      .map(a => ({
        id: a.name,
        displayName: a.properties?.displayName,
        severity: a.properties?.metadata?.severity || 'Medium',
        category: a.properties?.metadata?.categories?.[0] || 'Security',
        resourceType: a.properties?.resourceDetails?.resourceType,
        resourceId: a.properties?.resourceDetails?.id,
        description: a.properties?.metadata?.description,
        remediationSteps: a.properties?.metadata?.remediationDescription,
        link: a.properties?.links?.azurePortal,
      }));

    res.json({ findings: unhealthy, total: r.data.value?.length || 0, unhealthy: unhealthy.length, mode: 'live' });
  } catch (err) {
    console.error('Defender findings:', err.response?.status, err.response?.data?.error?.code);
    res.json({
      findings: [],
      mode: 'demo',
      rbacError: err.response?.status === 403,
      hint: err.response?.status === 403 ? 'Grant Security Reader role to the service principal in Azure Portal' : undefined,
    });
  }
});

// ── Compliance ─────────────────────────────────────────────────────────────────

router.get('/compliance', async (req, res) => {
  const token = await getAzureToken();
  if (!token) return res.json({ frameworks: getMockCompliance(), mode: 'demo' });

  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    // Get regulatory compliance summaries from Defender for Cloud
    const r = await armClient(token).get(
      `/subscriptions/${sub}/providers/Microsoft.Security/regulatoryComplianceStandards?api-version=2019-01-01`
    );
    const standards = (r.data.value || []).map(s => ({
      framework: s.properties?.friendlyName || s.name,
      score: Math.round((s.properties?.passedControls / Math.max(1, s.properties?.failedControls + s.properties?.passedControls + s.properties?.skippedControls)) * 100),
      passing: s.properties?.passedControls || 0,
      failing: s.properties?.failedControls || 0,
      skipped: s.properties?.skippedControls || 0,
    }));
    res.json({ frameworks: standards.length ? standards : getMockCompliance(), mode: standards.length ? 'live' : 'demo-empty' });
  } catch (err) {
    res.json({ frameworks: getMockCompliance(), mode: 'demo', error: err.message });
  }
});

// ── Resource Groups ────────────────────────────────────────────────────────────

router.get('/resource-groups', async (req, res) => {
  const token = await getAzureToken();
  if (!token) return res.json({ groups: [], mode: 'demo' });

  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    const r = await armClient(token).get(`/subscriptions/${sub}/resourcegroups?api-version=2021-04-01`);
    res.json({ groups: r.data.value?.map(g => ({ name: g.name, location: g.location, tags: g.tags })) || [], mode: 'live' });
  } catch (err) {
    res.json({ groups: [], mode: 'demo', error: err.message });
  }
});

// ── Mock fallbacks ─────────────────────────────────────────────────────────────

function getMockClusters() {
  return [
    { name: 'humana-prod-aks-eastus',    location: 'eastus',    kubernetesVersion: '1.29.2', provisioningState: 'Succeeded', nodePools: 3, nodeCount: 12, status: 'healthy' },
    { name: 'humana-dev-aks-centralus',  location: 'centralus', kubernetesVersion: '1.29.2', provisioningState: 'Succeeded', nodePools: 2, nodeCount: 6,  status: 'warning' },
    { name: 'humana-nonprod-aks-westus', location: 'westus',    kubernetesVersion: '1.28.5', provisioningState: 'Succeeded', nodePools: 2, nodeCount: 8,  status: 'healthy' },
  ];
}

function getMockClusterDetail(name) {
  return {
    name, kubernetesVersion: '1.29.2', nodeCount: 12,
    nodePools: [{ name: 'systempool', count: 3, vmSize: 'Standard_DS2_v2', osType: 'Linux', mode: 'System' }],
  };
}

function getMockCompliance() {
  return [
    { framework: 'HIPAA',             score: 74, passing: 33, failing: 12 },
    { framework: 'CIS Kubernetes 1.8',score: 81, passing: 49, failing: 11 },
    { framework: 'NIST SP 800-53',    score: 68, passing: 75, failing: 35 },
    { framework: 'SOC 2 Type II',     score: 88, passing: 26, failing:  4 },
  ];
}

module.exports = router;
