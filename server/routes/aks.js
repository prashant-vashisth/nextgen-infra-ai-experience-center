const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const CVE_DATABASE = [
  { id: 'CVE-2024-21626', severity: 'critical', cvss: 8.6, component: 'runc', version: '1.1.10', affected: ['humana-prod-aks-eastus', 'humana-dev-aks-centralus'], description: 'Container escape vulnerability in runc via /proc/self/fd leak. Allows container breakout to host filesystem.', namespace: 'claims-processing', patchVersion: '1.1.12', hipaaImpact: 'HIGH — potential PHI exposure', remediationTime: '45 min' },
  { id: 'CVE-2023-44487', severity: 'high', cvss: 7.5, component: 'Kubernetes Ingress (HTTP/2)', version: '1.28.x', affected: ['humana-prod-aks-eastus'], description: 'HTTP/2 Rapid Reset Attack. Exploitable DoS against ingress controller affecting member-portal availability.', namespace: 'member-portal', patchVersion: 'nginx-ingress 1.9.4', hipaaImpact: 'MEDIUM — availability impact on member-facing services', remediationTime: '30 min' },
  { id: 'CVE-2024-0193', severity: 'high', cvss: 7.8, component: 'Linux Kernel netfilter', version: '5.15.x', affected: ['humana-prod-aks-eastus', 'humana-nonprod-aks-westus'], description: 'Use-after-free in netfilter subsystem. Local privilege escalation possible on affected nodes.', namespace: 'auth-gateway', patchVersion: 'kernel 5.15.148', hipaaImpact: 'HIGH — privilege escalation risk on auth nodes', remediationTime: '60 min' },
  { id: 'CVE-2023-2431', severity: 'medium', cvss: 6.5, component: 'kubelet', version: '1.28.x', affected: ['humana-dev-aks-centralus'], description: 'Bypass of seccompDefault functionality in kubelet. Workloads may run without expected seccomp profiles.', namespace: 'data-ingestion', patchVersion: '1.29.2', hipaaImpact: 'LOW — development cluster only', remediationTime: '20 min' },
  { id: 'CVE-2024-3177', severity: 'medium', cvss: 5.4, component: 'kube-apiserver', version: '1.28.x', affected: ['humana-nonprod-aks-westus'], description: 'Bypass of environment variable restrictions in Kubernetes. Containers may access host env variables.', namespace: 'pharmacy-services', patchVersion: '1.29.x', hipaaImpact: 'MEDIUM — pharmacy data namespace affected', remediationTime: '25 min' },
  { id: 'CVE-2023-5528', severity: 'high', cvss: 7.2, component: 'CSI node plugin', version: 'azuredisk-csi 1.28.x', affected: ['humana-prod-aks-eastus'], description: 'Privilege escalation via CSI volume mounting. Attacker with pod access may escalate to node admin.', namespace: 'claims-processing', patchVersion: 'azuredisk-csi 1.30.0', hipaaImpact: 'HIGH — claims data storage exposed', remediationTime: '35 min' },
];

router.get('/vulnerabilities', (req, res) => {
  const { cluster } = req.query;
  let cves = CVE_DATABASE;
  if (cluster) {
    cves = cves.filter(c => c.affected.includes(cluster));
  }

  const summary = {
    critical: cves.filter(c => c.severity === 'critical').length,
    high: cves.filter(c => c.severity === 'high').length,
    medium: cves.filter(c => c.severity === 'medium').length,
    low: cves.filter(c => c.severity === 'low').length,
    riskScore: 87,
    remediatedScore: 23,
  };

  res.json({ cves, summary });
});

router.post('/scan', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const scanSteps = [
    'Authenticating with Azure ARM API...',
    'Fetching cluster node pool configuration...',
    'Scanning container runtime versions...',
    'Checking kernel versions across node pools...',
    'Querying NVD CVE database...',
    'Correlating against Humana cluster inventory...',
    'Analyzing namespace blast radius...',
    'Computing HIPAA compliance impact scores...',
    'Generating risk prioritization matrix...',
    'Scan complete — 6 findings identified',
  ];

  for (const step of scanSteps) {
    res.write(`data: ${JSON.stringify({ type: 'scan_step', message: step })}\n\n`);
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
  }

  res.write(`data: ${JSON.stringify({ type: 'findings', cves: CVE_DATABASE, summary: { critical: 1, high: 3, medium: 2, low: 0, riskScore: 87 } })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});

router.post('/remediate', async (req, res) => {
  const { cveId } = req.body;
  const cve = CVE_DATABASE.find(c => c.id === cveId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!cve) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'CVE not found' })}\n\n`);
    res.end();
    return;
  }

  res.write(`data: ${JSON.stringify({ type: 'status', message: `Analyzing ${cveId}...` })}\n\n`);
  await new Promise(r => setTimeout(r, 500));

  const start = Date.now();

  if (!process.env.GROQ_API_KEY) {
    const plan = getFallbackRemediationPlan(cve);
    for (const step of plan.steps) {
      res.write(`data: ${JSON.stringify({ type: 'token', token: step + '\n\n' })}\n\n`);
      await new Promise(r => setTimeout(r, 100));
    }
    res.write(`data: ${JSON.stringify({ type: 'done', plan, duration: Date.now() - start })}\n\n`);
    res.end();
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `You are an AKS security remediation AI for Humana Health. Generate a step-by-step remediation plan for:

CVE: ${cveId}
Severity: ${cve.severity.toUpperCase()} (CVSS ${cve.cvss})
Component: ${cve.component} v${cve.version}
Description: ${cve.description}
Affected Cluster: ${cve.affected.join(', ')}
Affected Namespace: ${cve.namespace}
HIPAA Impact: ${cve.hipaaImpact}
Patch Version: ${cve.patchVersion}

Provide a concise remediation plan with:
1. Immediate mitigation steps (kubectl/az CLI commands)
2. Patch application procedure
3. Validation steps
4. HIPAA compliance notes

Keep it actionable, under 600 words.`;

    const stream = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: 800,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done', cveId, duration: Date.now() - start })}\n\n`);
    res.end();
  } catch (err) {
    const plan = getFallbackRemediationPlan(cve);
    res.write(`data: ${JSON.stringify({ type: 'done', plan, duration: Date.now() - start, fallback: true })}\n\n`);
    res.end();
  }
});

function getFallbackRemediationPlan(cve) {
  return {
    cveId: cve.id,
    steps: [
      `**${cve.id} — ${cve.severity.toUpperCase()} Severity Remediation Plan**`,
      `\n**1. Immediate Mitigation**`,
      `\`\`\`bash\n# Cordon affected nodes to prevent new scheduling\nkubectl cordon $(kubectl get nodes -o name | grep prod)\n\n# Label namespace for enhanced monitoring\nkubectl label namespace ${cve.namespace} security-status=under-remediation\n\`\`\``,
      `\n**2. Apply Patch — ${cve.patchVersion}**`,
      `\`\`\`bash\n# Upgrade node pool via Azure CLI\naz aks nodepool upgrade \\\n  --resource-group humana-prod-rg \\\n  --cluster-name ${cve.affected[0]} \\\n  --name systempool \\\n  --kubernetes-version 1.29.2 \\\n  --no-wait\n\`\`\``,
      `\n**3. Validate Remediation**`,
      `\`\`\`bash\n# Verify patched component version\nkubectl get nodes -o wide\nkubectl exec -n ${cve.namespace} deploy/app -- ${cve.component} --version\n\`\`\``,
      `\n**4. HIPAA Compliance Note**\n${cve.hipaaImpact}\n\nDocument this remediation in ServiceNow change record and update CMDB vulnerability tracking. Estimated completion: ${cve.remediationTime}.`,
    ],
  };
}

module.exports = router;
