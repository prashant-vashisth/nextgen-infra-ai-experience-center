require('dotenv').config();
const axios = require('axios');

const OWNER = process.env.GITHUB_REPO_OWNER;
const TOKEN = process.env.GITHUB_TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const REPOS = [
  { name: 'aks-prod-nginx-ingress',       cluster: 'humana-prod-aks',    env: 'production',       chart: 'nginx-ingress',         version: '4.8.3', replicas: 2 },
  { name: 'aks-prod-core-services',        cluster: 'humana-prod-aks',    env: 'production',       chart: 'core-services',         version: '2.1.0', replicas: 3 },
  { name: 'aks-staging-nginx-ingress',     cluster: 'humana-staging-aks', env: 'staging',          chart: 'nginx-ingress',         version: '4.8.3', replicas: 1 },
  { name: 'aks-staging-core-services',     cluster: 'humana-staging-aks', env: 'staging',          chart: 'core-services',         version: '2.1.0', replicas: 1 },
  { name: 'aks-dev-nginx-ingress',         cluster: 'humana-dev-aks',     env: 'development',      chart: 'nginx-ingress',         version: '4.8.3', replicas: 1 },
  { name: 'aks-dev-monitoring',            cluster: 'humana-dev-aks',     env: 'development',      chart: 'kube-prometheus-stack', version: '55.5.0', replicas: 1 },
  { name: 'aks-nonprod-nginx-ingress',     cluster: 'humana-nonprod-aks', env: 'nonprod',          chart: 'nginx-ingress',         version: '4.8.3', replicas: 1 },
  { name: 'aks-nonprod-core-services',     cluster: 'humana-nonprod-aks', env: 'nonprod',          chart: 'core-services',         version: '2.1.0', replicas: 2 },
  { name: 'aks-dr-nginx-ingress',          cluster: 'humana-dr-aks',      env: 'disaster-recovery', chart: 'nginx-ingress',        version: '4.8.3', replicas: 1 },
  { name: 'aks-dr-core-services',          cluster: 'humana-dr-aks',      env: 'disaster-recovery', chart: 'core-services',        version: '2.1.0', replicas: 1 },
  { name: 'aks-platform-observability',    cluster: 'platform',           env: 'platform',         chart: 'kube-prometheus-stack', version: '55.5.0', replicas: 1 },
  { name: 'aks-platform-security',         cluster: 'platform',           env: 'platform',         chart: 'cert-manager',          version: '1.13.3', replicas: 1 },
];

function b64(str) {
  return Buffer.from(str).toString('base64');
}

function chartYaml(r) {
  if (r.chart === 'nginx-ingress') {
    return `apiVersion: v2
name: nginx-ingress
description: NGINX Ingress Controller for ${r.cluster} cluster
type: application
version: ${r.version}
appVersion: "1.10.1"
dependencies:
  - name: ingress-nginx
    version: ${r.version}
    repository: https://kubernetes.github.io/ingress-nginx
`;
  }
  if (r.chart === 'core-services') {
    return `apiVersion: v2
name: core-services
description: Core microservices for ${r.cluster}
type: application
version: ${r.version}
appVersion: "2.1.0"
`;
  }
  if (r.chart === 'kube-prometheus-stack') {
    return `apiVersion: v2
name: kube-prometheus-stack
description: Monitoring stack (Prometheus + Grafana) for ${r.cluster}
type: application
version: ${r.version}
appVersion: "0.71.2"
dependencies:
  - name: kube-prometheus-stack
    version: ${r.version}
    repository: https://prometheus-community.github.io/helm-charts
`;
  }
  return `apiVersion: v2
name: ${r.chart}
description: ${r.chart} for ${r.cluster}
type: application
version: ${r.version}
`;
}

function valuesYaml(r) {
  if (r.chart === 'nginx-ingress') {
    return `ingress-nginx:
  controller:
    replicaCount: ${r.replicas}
    service:
      type: LoadBalancer
      annotations:
        service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    resources:
      limits:
        cpu: ${r.env === 'production' ? '500m' : '200m'}
        memory: ${r.env === 'production' ? '512Mi' : '256Mi'}
      requests:
        cpu: 100m
        memory: 128Mi
    config:
      use-http2: "true"
      proxy-body-size: "50m"
      keep-alive: "75"
    metrics:
      enabled: true
    podAnnotations:
      humana.com/cluster: "${r.cluster}"
      humana.com/environment: "${r.env}"
      humana.com/managed-by: "helm-propagation-agent"
`;
  }
  return `# Default values for ${r.chart}
replicaCount: ${r.replicas}
image:
  pullPolicy: IfNotPresent
environment: ${r.env}
cluster: ${r.cluster}
`;
}

function workflowYaml(r) {
  return `name: Helm Deploy — ${r.cluster} ${r.chart}

on:
  push:
    branches: [main]
    paths:
      - 'charts/**'
  pull_request:
    branches: [main]
    paths:
      - 'charts/**'

jobs:
  helm-lint:
    name: Lint & Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: v3.14.0
      - name: Helm lint
        run: helm lint charts/${r.chart}
      - name: Helm template (dry-run)
        run: helm template ${r.chart} charts/${r.chart} --debug

  helm-deploy:
    name: Deploy to ${r.cluster}
    needs: helm-lint
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: ${r.env}
    steps:
      - uses: actions/checkout@v4
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: \${{ secrets.AZURE_CREDENTIALS }}
      - name: Get AKS credentials
        run: az aks get-credentials --resource-group aks-rg --name ${r.cluster}
      - name: Helm upgrade --install
        run: |
          helm upgrade --install ${r.chart} charts/${r.chart} \\
            --namespace ${r.chart} \\
            --create-namespace \\
            --atomic \\
            --timeout 5m
`;
}

function readme(r) {
  return `# ${r.name}

Helm chart configuration for **${r.chart}** on the \`${r.cluster}\` AKS cluster.

## Chart Details

| Field | Value |
|---|---|
| Chart | ${r.chart} |
| Version | ${r.version} |
| Cluster | ${r.cluster} |
| Environment | ${r.env} |
| Region | eastus |

## Managed by

This repository is managed by the **Humana AKS Helm Propagation Agent**.
Version updates are propagated automatically across all clusters with human-in-loop approval for production.

## Manual Deployment

\`\`\`bash
# Get cluster credentials
az aks get-credentials --resource-group aks-rg --name ${r.cluster}

# Deploy
helm upgrade --install ${r.chart} charts/${r.chart} \\
  --namespace ${r.chart} \\
  --create-namespace
\`\`\`
`;
}

async function createRepo(r) {
  console.log(`\n[${r.name}] Creating repo...`);
  try {
    await axios.post('https://api.github.com/user/repos', {
      name: r.name,
      description: `Helm chart: ${r.chart} v${r.version} for ${r.cluster} | Managed by Humana AKS Helm Propagation Agent`,
      private: true,
      auto_init: true,
    }, { headers });
    console.log(`[${r.name}] ✅ Repo created`);
    await new Promise(res => setTimeout(res, 2000)); // let GitHub finish init
  } catch (err) {
    if (err.response?.status === 422) {
      console.log(`[${r.name}] ⚠️  Already exists — updating files`);
    } else {
      console.error(`[${r.name}] ❌ Create failed: ${err.response?.data?.message || err.message}`);
      return false;
    }
  }
  return true;
}

async function putFile(repo, path, content, message) {
  const url = `https://api.github.com/repos/${OWNER}/${repo}/contents/${path}`;
  try {
    let sha;
    try {
      const existing = await axios.get(url, { headers });
      sha = existing.data.sha;
    } catch (_) {}

    await axios.put(url, {
      message,
      content: b64(content),
      ...(sha ? { sha } : {}),
    }, { headers });
    console.log(`  ✅ ${path}`);
  } catch (err) {
    console.error(`  ❌ ${path}: ${err.response?.data?.message || err.message}`);
  }
}

async function setupRepo(r) {
  await createRepo(r);
  await putFile(r.name, 'README.md', readme(r), 'docs: initial README');
  await putFile(r.name, `charts/${r.chart}/Chart.yaml`, chartYaml(r), `feat: add ${r.chart} helm chart v${r.version}`);
  await putFile(r.name, `charts/${r.chart}/values.yaml`, valuesYaml(r), `feat: add ${r.chart} default values`);
  await putFile(r.name, `.github/workflows/helm-deploy.yml`, workflowYaml(r), 'ci: add helm deploy workflow');
  console.log(`[${r.name}] 🎉 Setup complete`);
}

async function main() {
  console.log(`Setting up ${REPOS.length} Helm demo repos under ${OWNER}...`);
  for (const r of REPOS) {
    await setupRepo(r);
    await new Promise(res => setTimeout(res, 500));
  }
  console.log('\n✅ All repos created/updated!');
  console.log('\nRepos:');
  REPOS.forEach(r => console.log(`  https://github.com/${OWNER}/${r.name}`));
}

main().catch(console.error);
