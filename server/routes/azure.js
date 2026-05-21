const express = require('express');
const router = express.Router();
const axios = require('axios');

async function getAzureToken() {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) return null;

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: 'https://management.azure.com/.default',
    });

    const res = await axios.post(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
    );
    return res.data.access_token;
  } catch (err) {
    console.error('Azure auth error:', err.message);
    return null;
  }
}

router.get('/status', async (req, res) => {
  const hasConfig = !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
  if (!hasConfig) {
    return res.json({ connected: false, mode: 'demo', subscriptionId: 'demo-sub-001' });
  }
  const token = await getAzureToken();
  res.json({
    connected: !!token,
    mode: token ? 'live' : 'demo',
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || 'demo-sub-001',
  });
});

router.get('/clusters', async (req, res) => {
  const token = await getAzureToken();

  if (!token) {
    return res.json({ clusters: getMockClusters(), mode: 'demo' });
  }

  try {
    const subId = process.env.AZURE_SUBSCRIPTION_ID;
    const url = `https://management.azure.com/subscriptions/${subId}/providers/Microsoft.ContainerService/managedClusters?api-version=2024-01-01`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });

    const clusters = response.data.value.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      kubernetesVersion: c.properties?.kubernetesVersion,
      provisioningState: c.properties?.provisioningState,
      nodePools: c.properties?.agentPoolProfiles?.length || 0,
      fqdn: c.properties?.fqdn,
    }));

    res.json({ clusters, mode: 'live' });
  } catch (err) {
    console.error('Azure clusters error:', err.message);
    res.json({ clusters: getMockClusters(), mode: 'demo', error: err.message });
  }
});

router.get('/cluster/:name', async (req, res) => {
  res.json({ cluster: getMockClusterDetail(req.params.name), mode: 'demo' });
});

router.get('/compliance', async (req, res) => {
  res.json({ frameworks: getMockCompliance(), mode: 'demo' });
});

function getMockClusters() {
  return [
    { id: 'sub/humana-prod-aks-eastus', name: 'humana-prod-aks-eastus', location: 'eastus', kubernetesVersion: '1.29.2', provisioningState: 'Succeeded', nodePools: 3, nodeCount: 12, status: 'healthy' },
    { id: 'sub/humana-dev-aks-centralus', name: 'humana-dev-aks-centralus', location: 'centralus', kubernetesVersion: '1.29.2', provisioningState: 'Succeeded', nodePools: 2, nodeCount: 6, status: 'warning' },
    { id: 'sub/humana-nonprod-aks-westus', name: 'humana-nonprod-aks-westus', location: 'westus', kubernetesVersion: '1.28.5', provisioningState: 'Succeeded', nodePools: 2, nodeCount: 8, status: 'healthy' },
  ];
}

function getMockClusterDetail(name) {
  return {
    name,
    kubernetesVersion: '1.29.2',
    nodeCount: 12,
    namespaces: ['claims-processing', 'member-portal', 'pharmacy-services', 'auth-gateway', 'data-ingestion', 'kube-system', 'monitoring'],
    nodes: [
      { name: `${name}-node-01`, status: 'Ready', cpu: '4 vCPUs', memory: '16 GB', pods: 18 },
      { name: `${name}-node-02`, status: 'Ready', cpu: '4 vCPUs', memory: '16 GB', pods: 21 },
      { name: `${name}-node-03`, status: 'Ready', cpu: '8 vCPUs', memory: '32 GB', pods: 34 },
    ],
  };
}

function getMockCompliance() {
  return [
    { framework: 'HIPAA', score: 74, controls: 45, passing: 33, failing: 12, critical: 3 },
    { framework: 'CIS Kubernetes 1.8', score: 81, controls: 60, passing: 49, failing: 11, critical: 2 },
    { framework: 'NIST SP 800-53', score: 68, controls: 110, passing: 75, failing: 35, critical: 5 },
    { framework: 'SOC 2 Type II', score: 88, controls: 30, passing: 26, failing: 4, critical: 1 },
  ];
}

module.exports = router;
