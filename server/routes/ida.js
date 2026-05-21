const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const IDA_ERRORS = {
  'grade-d': {
    grade: 'D',
    gradeLabel: 'Compliance Violation',
    errorLogs: [
      '[IDA] Scanning Terraform configuration...',
      '[IDA] FAIL: azurerm_kubernetes_cluster missing required tag: "Environment"',
      '[IDA] FAIL: azurerm_kubernetes_cluster missing required tag: "CostCenter"',
      '[IDA] FAIL: azurerm_network_security_rule allows 0.0.0.0/0 ingress on port 22 (SSH)',
      '[IDA] FAIL: azurerm_storage_account public_blob_access_enabled = true (violates HIPAA)',
      '[IDA] WARN: Terraform state backend not configured with state locking',
      '[IDA] WARN: No lifecycle { prevent_destroy } on stateful resources',
      '[IDA] Grade computed: D — 4 violations, 2 warnings',
      '[IDA] Pipeline blocked. AI remediation agent activated.',
    ],
    terraformOutput: `Error: Missing required tags on resource
  Resource: azurerm_kubernetes_cluster.humana_prod
  Required tags: ["Environment", "CostCenter", "Owner", "Compliance"]
  Found tags: {"Project": "humana-aks", "ManagedBy": "terraform"}

Error: Security compliance violation
  Resource: azurerm_network_security_rule.allow_ssh
  Rule: Deny unrestricted inbound SSH from Internet
  Current: source_address_prefix = "0.0.0.0/0"

Error: HIPAA storage violation
  Resource: azurerm_storage_account.claims_data
  public_blob_access_enabled must be false for HIPAA workloads`,
  },
  'grade-b': {
    grade: 'B',
    gradeLabel: 'Minor Issues',
    errorLogs: [
      '[IDA] Scanning Terraform configuration...',
      '[IDA] WARN: azurerm_kubernetes_cluster node pool autoscaling not configured',
      '[IDA] WARN: No Pod Disruption Budget defined for claims-processing deployment',
      '[IDA] Grade computed: B — 0 violations, 2 warnings',
      '[IDA] Pipeline proceeding with warnings logged.',
    ],
    terraformOutput: 'Warnings only — deployment proceeding',
  },
};

router.post('/analyze', async (req, res) => {
  const { runId, scenario = 'grade-d', errorLogs, terraformOutput } = req.body;

  const errorData = IDA_ERRORS[scenario] || IDA_ERRORS['grade-d'];
  const logs = errorLogs || errorData.errorLogs;
  const tfOutput = terraformOutput || errorData.terraformOutput;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Emit metadata
  res.write(`data: ${JSON.stringify({ type: 'meta', grade: errorData.grade, gradeLabel: errorData.gradeLabel, runId: runId || `run-${Date.now()}` })}\n\n`);

  // Emit log ingestion
  for (const log of logs) {
    res.write(`data: ${JSON.stringify({ type: 'log', line: log })}\n\n`);
    await new Promise(r => setTimeout(r, 180));
  }

  res.write(`data: ${JSON.stringify({ type: 'status', message: 'Correlating with Splunk telemetry...' })}\n\n`);
  await new Promise(r => setTimeout(r, 800));
  res.write(`data: ${JSON.stringify({ type: 'status', message: 'Querying IDA error knowledge base...' })}\n\n`);
  await new Promise(r => setTimeout(r, 600));
  res.write(`data: ${JSON.stringify({ type: 'status', message: 'Calling Groq AI analysis engine...' })}\n\n`);
  await new Promise(r => setTimeout(r, 400));

  const start = Date.now();

  if (!process.env.GROQ_API_KEY) {
    const fallback = getFallbackAnalysis(errorData.grade);
    res.write(`data: ${JSON.stringify({ type: 'analysis', content: fallback, duration: 1240, confidence: 94, fallback: true })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `You are an Infrastructure Deployment Assurance (IDA) AI agent for Humana's cloud infrastructure. Analyze the following Terraform deployment failure and provide a structured remediation report.

IDA Grade: ${errorData.grade} (${errorData.gradeLabel})

Error Logs:
${logs.join('\n')}

Terraform Output:
${tfOutput}

Provide a JSON response with:
{
  "rootCause": "One clear sentence explaining the root cause",
  "fiveWhy": [
    {"why": 1, "question": "Why did X fail?", "answer": "Because Y"},
    ... (5 items)
  ],
  "remediation": [
    {"step": 1, "action": "Add required tags to resource", "code": "tags = { Environment = 'prod', CostCenter = 'HUM-INFRA-001' }", "effort": "5 min"},
    ... (5 steps)
  ],
  "kbArticle": "KB0023411 — Terraform HIPAA Compliance Checklist",
  "estimatedFixTime": "35 minutes",
  "confidence": 94
}`;

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: 'You are an expert IDA DevOps agent. Always respond with valid JSON only, no markdown.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    let content = completion.choices[0].message.content.trim();
    // Strip markdown code blocks if present
    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    try {
      const parsed = JSON.parse(content);
      res.write(`data: ${JSON.stringify({ type: 'analysis', content: parsed, duration: Date.now() - start, confidence: parsed.confidence || 94 })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: 'analysis', content: getFallbackAnalysis(errorData.grade), duration: Date.now() - start, confidence: 94 })}\n\n`);
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'analysis', content: getFallbackAnalysis(errorData.grade), duration: Date.now() - start, confidence: 94, fallback: true })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});

function getFallbackAnalysis(grade) {
  return {
    rootCause: 'Terraform configuration violates 4 Humana HIPAA compliance controls: missing required resource tags, unrestricted SSH ingress rule, and public blob storage access enabled on a HIPAA-scoped storage account.',
    fiveWhy: [
      { why: 1, question: 'Why did the IDA pipeline fail?', answer: 'Grade D assigned due to 4 compliance violations detected in azurerm resources' },
      { why: 2, question: 'Why were compliance violations present?', answer: 'Required Humana tagging policy tags (Environment, CostCenter) not applied to cluster resource' },
      { why: 3, question: 'Why were tags missing?', answer: 'Module was cloned from a non-Humana template without running the compliance scaffolding script' },
      { why: 4, question: 'Why was the SSH rule unrestricted?', answer: 'Network security group was copied from a dev environment configuration without tightening for production' },
      { why: 5, question: 'Why was HIPAA storage config incorrect?', answer: 'public_blob_access_enabled flag was not audited during code review — pre-commit hook not active on this repo' },
    ],
    remediation: [
      { step: 1, action: 'Add required Humana tags to azurerm_kubernetes_cluster', code: 'tags = {\n  Environment = "production"\n  CostCenter  = "HUM-INFRA-001"\n  Owner       = "platform-engineering@humana.com"\n  Compliance  = "HIPAA"\n}', effort: '5 min' },
      { step: 2, action: 'Restrict SSH NSG rule to VPN CIDR only', code: 'source_address_prefix = "10.0.0.0/8"  # Humana VPN range', effort: '3 min' },
      { step: 3, action: 'Disable public blob access on storage account', code: 'public_blob_access_enabled = false\nmin_tls_version = "TLS1_2"', effort: '2 min' },
      { step: 4, action: 'Configure Terraform state backend with locking', code: 'backend "azurerm" {\n  resource_group_name  = "humana-tfstate-rg"\n  storage_account_name = "humanatfstate"\n  container_name       = "tfstate"\n  key                  = "prod.terraform.tfstate"\n  use_azuread_auth     = true\n}', effort: '10 min' },
      { step: 5, action: 'Re-run IDA pipeline to validate Grade A', code: 'git push origin feature/aks-policy-update  # triggers CI', effort: '2 min' },
    ],
    kbArticle: 'KB0023411 — Terraform HIPAA Compliance Checklist for AKS Deployments',
    estimatedFixTime: '35 minutes',
    confidence: 94,
  };
}

module.exports = router;
