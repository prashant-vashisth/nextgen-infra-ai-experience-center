const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

// ─── Pipeline run data (matches frontend APGAgent.jsx) ────────────────────────

const PIPELINE_RUNS = [
  {
    id: '25758381652/1/75652806679',
    shortId: '25758381652',
    status: 'success', grade: 'A',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'demo-PassingAppSvc',
    workspace: 'AZURE-SEIA-LOADBALANCER-CLOUD3-NPE',
    moduleVersions: { 'se-loadbalancer-cloud-3-0': ['1.0.8'] },
    scores: { createScore: 100, deleteScore: 0, updateScore: 0, finalScore: 94, policyScore: 9, totalScore: 94 },
    budget: { status: 'warning', currentSpend: 189443.55, budget: 486137.10, remaining: 296693.55, forecastYearEnd: 511341.40 },
    error: null, duration: '2m 16s', ago: '2 weeks ago',
    runLink: 'https://app.terraform.io/app/humanaprd/AZURE-SEIA-LOADBALANCER-CLOUD3-NPE/runs/run-4nmWWBjcNzL7dbA4',
    riskLevel: 'low', riskReason: 'Create-only deployment — no resource terminations or mutations',
  },
  {
    id: '25377392009/1/74416084158',
    shortId: '25377392009',
    status: 'failure', grade: 'NA',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'demo-PassingAppSvc',
    workspace: 'AZURE-SEIA-LOADBALANCER-CLOUD3-NPE',
    moduleVersions: { 'se-loadbalancer-cloud-3-0': ['1.0.8'] },
    scores: { createScore: 0, deleteScore: 0, updateScore: 0, finalScore: 0, policyScore: 0, totalScore: 0 },
    budget: null,
    error: 'Error in speculative plan: unauthorized',
    duration: '32s', ago: '3 weeks ago', runLink: '',
    riskLevel: 'review', riskReason: 'Speculative plan rejected — service principal or token likely expired',
  },
  {
    id: '24654891023/1/73219854671',
    shortId: '24654891023',
    status: 'success', grade: 'D',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'hotfix/vm-scale-down-nonprod',
    workspace: 'AZURE-SEIA-COMPUTE-CLOUD3-NPE',
    moduleVersions: { 'se-compute-cloud-3-0': ['1.5.1'] },
    scores: { createScore: 15, deleteScore: 68, updateScore: 12, finalScore: 31, policyScore: 4, totalScore: 31 },
    budget: { status: 'pass', currentSpend: 423900, budget: 620000, remaining: 196100, forecastYearEnd: 589000 },
    error: null, duration: '3m 42s', ago: '5 weeks ago', runLink: '',
    riskLevel: 'high', riskReason: 'High delete score (68) — 14 VM instances will be terminated',
  },
  {
    id: '24234567890/1/71234567890',
    shortId: '24234567890',
    status: 'success', grade: 'C',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'refactor/network-security-groups',
    workspace: 'AZURE-SEIA-NETWORK-CLOUD3-NPE',
    moduleVersions: { 'se-network-cloud-3-0': ['2.1.0'] },
    scores: { createScore: 42, deleteScore: 22, updateScore: 48, finalScore: 57, policyScore: 6, totalScore: 57 },
    budget: { status: 'pass', currentSpend: 312400, budget: 500000, remaining: 187600, forecastYearEnd: 445000 },
    error: null, duration: '2m 51s', ago: '6 weeks ago', runLink: '',
    riskLevel: 'medium', riskReason: 'Mixed operations — updates to 8 NSG rules and deletion of 3 legacy security groups',
  },
];

// ─── APG system prompt ────────────────────────────────────────────────────────

function buildSystemPrompt(runs) {
  const runsSummary = runs.map(r => `
Run ID: ${r.shortId} | Status: ${r.status} | Grade: ${r.grade} | Risk: ${r.riskLevel}
  Branch: ${r.branch} | Workspace: ${r.workspace}
  Scores (0-100) — Create: ${r.scores.createScore}, Delete: ${r.scores.deleteScore}, Update: ${r.scores.updateScore}, Final: ${r.scores.finalScore}, Policy bonus: ${r.scores.policyScore}, Total: ${r.scores.totalScore}
  ${r.error ? `Error: ${r.error}` : `Risk reason: ${r.riskReason}`}
  ${r.budget ? `Budget: ${r.budget.status} — spent $${r.budget.currentSpend.toLocaleString()} of $${r.budget.budget.toLocaleString()}, forecast $${r.budget.forecastYearEnd.toLocaleString()}` : 'Budget: no data'}
`).join('\n');

  return `You are the Agentic Pipeline Governor (APG) Agent for Humana's Cloud 3.0 platform. You are an expert AI agent that helps platform engineers, PR reviewers, and operators understand the quality, risk, and remediations for Terraform deployments running through the APG pipeline.

## What APG does
APG is an AI-driven quality control gate injected into GitHub Actions pipelines. It scores every Terraform plan on a 0–100 scale before it can be applied, analysing the type and volume of operations:

- **createScore (0–100)**: Confidence from resource creation — adds resources, low risk, scores high
- **deleteScore (0–100)**: Risk from resource deletion — terminates existing resources, penalises heavily (higher deleteScore = more risk = lower finalScore)
- **updateScore (0–100)**: Partial risk from in-place modifications — updates may cause brief downtime
- **finalScore (0–100)**: Composite deployment health score. Formula: heavily weighted by creates, penalised by deletes, moderated by updates
- **policyScore (0–10)**: Bonus points from Sentinel policy compliance checks (max 10)
- **totalScore = finalScore + policyScore** (capped at 100)

## Grade scale (A = best, E = worst)
- **Grade A**: totalScore 85–100 → No risk. Create-only or minimal updates. Safe to approve without escalation.
- **Grade B**: totalScore 65–84 → Low risk. Mostly creates with minor updates. Generally approvable with a quick review.
- **Grade C**: totalScore 45–64 → Medium risk. Significant updates and/or some deletions. Reviewer must scrutinise what is being changed or removed.
- **Grade D**: totalScore 20–44 → High risk. Heavy deletions detected. Senior engineer review required before approval. Check which resources are being terminated and whether it is intentional.
- **Grade E**: totalScore 0–19 → Critical risk. Extreme deletion volume or severe policy violations. Do NOT approve. Escalate to principal engineer and run a full impact assessment.
- **Grade NA**: Plan failed to execute. No score assigned. Must fix the underlying error before review can proceed.

## Error Classification
When a run fails (Grade NA), classify the error into one of these categories and provide remediation:
1. **AUTHENTICATION_ERROR** — "unauthorized", "forbidden", "token expired", "401", "403" → Rotate the Terraform Cloud API token in GitHub Actions secrets (Settings → Secrets → TFC_TOKEN). Verify the service principal still has Contributor role on the workspace subscription.
2. **QUOTA_ERROR** — "quota exceeded", "capacity", "limit reached" → Submit an Azure quota increase request or reduce the resource count in the plan. Check quota via Azure Portal → Subscriptions → Usage + quotas.
3. **STATE_LOCK_ERROR** — "state is locked", "lock id" → Run \`terraform force-unlock <LOCK_ID>\` after confirming no other apply is in progress. Check TFC for concurrent runs.
4. **PROVIDER_ERROR** — "provider", "plugin crashed", "terraform init required" → Run \`terraform init -upgrade\` locally to refresh provider binaries. Pin the provider version in terraform.tf.
5. **CONFIGURATION_ERROR** — "invalid value", "unsupported argument", "syntax error" → Inspect the plan output for the exact resource and attribute causing the failure. Fix the HCL configuration.
6. **NETWORK_ERROR** — "timeout", "connection refused", "TLS" → Check Azure endpoint connectivity from the runner. May be a transient issue — retry the pipeline.

## How to improve a grade
When asked how to improve a grade:
- **To improve from D/E to a higher grade**: Reduce the deleteScore by breaking the plan into smaller, targeted changes. Move destructive operations (deletes) into a separate PR that goes through a dedicated review workflow. Add lifecycle { prevent_destroy = true } guards on critical resources.
- **To improve from C to B/A**: Review which resources are being updated unnecessarily. Use \`terraform plan -refresh-only\` to separate state refresh from actual changes. Split update-heavy PRs.
- **Policy score improvement**: Ensure all Sentinel policies pass — check resource naming conventions, tagging requirements, encryption settings, and network security group rules.
- **General best practice**: Keep PRs small and focused — a PR that only creates resources will always score A. A PR that both creates and deletes should be split.

## Root Cause Analysis (RCA)
When asked for RCA:
1. Identify the primary failure signal (error message or low score component)
2. State the root cause in one sentence
3. Describe the blast radius (what could break if this deploys as-is)
4. Provide 3 actionable remediation steps in priority order
5. Recommend whether to approve, reject, or escalate

## Current pipeline runs you have visibility into:
${runsSummary}

## Your behaviour
- Be concise and direct — 2–4 sentences for simple questions, structured lists for complex ones
- Always reference specific run IDs, scores, and grades when answering about specific runs
- Classify errors precisely using the AUTHENTICATION_ERROR / QUOTA_ERROR etc. taxonomy
- For Grade D/E runs, always state what the reviewer must verify before approving
- Explain scores in plain English — avoid jargon
- When asked "how do I improve my grade?", give specific, actionable steps for that run
- Never make up information not present in the run data above`;
}

// ─── POST /api/apg/chat — SSE streaming chat ──────────────────────────────────

router.post('/chat', async (req, res) => {
  const { messages = [] } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const systemPrompt = buildSystemPrompt(PIPELINE_RUNS);

  if (!process.env.GROQ_API_KEY) {
    const fallback = getFallbackResponse(messages);
    const words = fallback.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 35));
    }
    res.write(`data: ${JSON.stringify({ done: true, fallback: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const stream = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      max_tokens: 700,
      temperature: 0.25,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  } catch (err) {
    const fallback = getFallbackResponse(messages);
    const words = fallback.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 35));
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// ─── GET /api/apg/runs ────────────────────────────────────────────────────────

router.get('/runs', (req, res) => {
  res.json({ runs: PIPELINE_RUNS });
});

// ─── Fallback responses (no Groq key) ─────────────────────────────────────────

function getFallbackResponse(messages) {
  const last = (messages[messages.length - 1]?.content || '').toLowerCase();

  if (last.includes('25377') || last.includes('fail') || last.includes('unauthori') || last.includes('classif')) {
    return 'Run #25377392009 failed with an AUTHENTICATION_ERROR: "Error in speculative plan: unauthorized". This means the Terraform Cloud speculative plan was rejected because the service principal or API token used by the APG pipeline action has expired or lost workspace permissions. No score could be assigned (Grade NA). Fix: rotate the Terraform Cloud API token in GitHub Actions secrets (Settings → Secrets → TFC_TOKEN) and verify the service principal still has Contributor access to the workspace subscription, then re-trigger the pipeline.';
  }
  if (last.includes('improve') || last.includes('better') || last.includes('higher grade')) {
    return 'To improve run #24654891023 from Grade D (score 31) to Grade A, the engineer should: (1) Split this PR — move the 14 VM deletion operations into a separate, dedicated PR with explicit senior-engineer approval. (2) The new PR (creates/updates only) will have a deleteScore near 0, pushing the finalScore above 85 for Grade A. (3) Add lifecycle { prevent_destroy = true } guards on critical VMs to prevent accidental deletion in future PRs. (4) Ensure all Sentinel policies pass to maximise the policyScore bonus.';
  }
  if (last.includes('rca') || last.includes('root cause') || last.includes('24654') || last.includes('delete') || last.includes('terminate')) {
    return 'RCA for run #24654891023 (Grade D, score 31): Root cause — the Terraform plan schedules termination of 14 VM instances in the COMPUTE workspace, producing a deleteScore of 68 which drives the finalScore down to 31. Blast radius: if approved as-is, 14 nonprod VMs will be permanently destroyed, potentially breaking dependent services in the AZURE-SEIA-COMPUTE-CLOUD3-NPE workspace. Remediation: (1) Confirm the deletions are intentional by reviewing the diff with the PR author. (2) If intentional, split into a dedicated destroy PR with senior engineer sign-off. (3) If unintentional, the engineer must refactor the module to avoid implicit resource recreation.';
  }
  if (last.includes('grade') || last.includes('score') || last.includes('calculat') || last.includes('formula')) {
    return 'APG grades are based on a 0–100 total score. The finalScore is computed by weighing createScore positively (creates = low risk), penalising deleteScore heavily (deletes = high risk of outage or data loss), and moderating updateScore. A policyScore bonus (0–10) from Sentinel compliance checks is added to produce the totalScore. Grade thresholds: A = 85–100 (no risk), B = 65–84 (low risk), C = 45–64 (medium risk), D = 20–44 (high risk — senior review required), E = 0–19 (critical risk — do not approve). Grade NA means the plan failed to execute and no score was assigned.';
  }
  if (last.includes('budget') || last.includes('warn')) {
    return 'Run #25758381652 has a Budget Warning status. Current spend is $189,443 against a budget of $486,137, but the year-end forecast of $511,341 exceeds the budget by approximately $25,198. The deployment itself passed with Grade A (score 94, create-only). The APG budget check does not fail the pipeline on a forecast overrun — it flags it for awareness. Action: notify the FinOps team with the forecast figure and either request a budget uplift or identify spend reduction opportunities before year-end.';
  }
  return 'I can see 4 pipeline runs for the Cloud-3-0-EMU repository. Run #25758381652 scored Grade A (94/100) — create-only, safe to approve. Run #25377392009 failed with an AUTHENTICATION_ERROR (Grade NA) — the speculative plan was rejected due to an expired token. Run #24654891023 scored Grade D (31/100) — 14 VM terminations detected, senior review required. Run #24234567890 scored Grade C (57/100) — mixed NSG updates and deletions, medium risk. Ask me for error classification, RCA, grade explanation, or how to improve any specific run.';
}

module.exports = router;
