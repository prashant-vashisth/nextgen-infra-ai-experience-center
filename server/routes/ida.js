const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

// ─── Pipeline run data (matches real log examples + representative extras) ───

const PIPELINE_RUNS = [
  {
    id: '25758381652/1/75652806679',
    shortId: '25758381652',
    status: 'success',
    grade: 'A',
    repo: 'Cloud-3-0-EMU/ida-validator',
    branch: 'demo-PassingAppSvc',
    workspace: 'AZURE-SEIA-LOADBALANCER-CLOUD3-NPE',
    moduleVersions: { 'se-loadbalancer-cloud-3-0': ['1.0.8'] },
    scores: { planCreateScore: 100, planDeleteScore: 0, planUpdateScore: 0, planFinalScore: 100, runPolicyScore: 6, totalScore: 106 },
    budget: { status: 'warning', currentSpend: 189443.55, budget: 486137.10, remaining: 296693.55, forecastYearEnd: 511341.40 },
    error: null, duration: '2m 16s', ago: '2 weeks ago',
    runLink: 'https://app.terraform.io/app/humanaprd/AZURE-SEIA-LOADBALANCER-CLOUD3-NPE/runs/run-4nmWWBjcNzL7dbA4',
    riskLevel: 'low', riskReason: 'Create-only deployment — no resource terminations',
  },
  {
    id: '25377392009/1/74416084158',
    shortId: '25377392009',
    status: 'failure',
    grade: 'NA',
    repo: 'Cloud-3-0-EMU/ida-validator',
    branch: 'demo-PassingAppSvc',
    workspace: 'AZURE-SEIA-LOADBALANCER-CLOUD3-NPE',
    moduleVersions: { 'se-loadbalancer-cloud-3-0': ['1.0.8'] },
    scores: { planCreateScore: 0, planDeleteScore: 0, planUpdateScore: 0, planFinalScore: 0, runPolicyScore: 0, totalScore: 0 },
    budget: null,
    error: 'Error in speculative plan: unauthorized',
    duration: '32s', ago: '3 weeks ago', runLink: '',
    riskLevel: 'review', riskReason: 'Terraform plan could not execute — service principal or token may have expired',
  },
  {
    id: '24654891023/1/73219854671',
    shortId: '24654891023',
    status: 'success',
    grade: 'C',
    repo: 'Cloud-3-0-EMU/ida-validator',
    branch: 'hotfix/vm-scale-down-nonprod',
    workspace: 'AZURE-SEIA-COMPUTE-CLOUD3-NPE',
    moduleVersions: { 'se-compute-cloud-3-0': ['1.5.1'] },
    scores: { planCreateScore: 20, planDeleteScore: 65, planUpdateScore: 15, planFinalScore: 20, runPolicyScore: 3, totalScore: 23 },
    budget: { status: 'pass', currentSpend: 423900, budget: 620000, remaining: 196100, forecastYearEnd: 589000 },
    error: null, duration: '3m 42s', ago: '5 weeks ago', runLink: '',
    riskLevel: 'high', riskReason: 'High delete score (65) — 14 VM instances will be terminated in this plan',
  },
  {
    id: '24234567890/1/71234567890',
    shortId: '24234567890',
    status: 'success',
    grade: 'A',
    repo: 'Cloud-3-0-EMU/ida-validator',
    branch: 'feature/new-storage-account',
    workspace: 'AZURE-SEIA-STORAGE-CLOUD3-NPE',
    moduleVersions: { 'se-storage-cloud-3-0': ['1.2.0'] },
    scores: { planCreateScore: 100, planDeleteScore: 0, planUpdateScore: 0, planFinalScore: 100, runPolicyScore: 6, totalScore: 106 },
    budget: { status: 'pass', currentSpend: 112400, budget: 200000, remaining: 87600, forecastYearEnd: 185000 },
    error: null, duration: '1m 58s', ago: '6 weeks ago', runLink: '',
    riskLevel: 'low', riskReason: 'Create-only storage resources — zero deletion risk',
  },
];

// ─── IDA system prompt ────────────────────────────────────────────────────────

function buildSystemPrompt(runs) {
  const runsSummary = runs.map(r => `
Run ID: ${r.shortId} | Status: ${r.status} | Grade: ${r.grade} | Risk: ${r.riskLevel}
  Branch: ${r.branch} | Workspace: ${r.workspace}
  Scores — Create: ${r.scores.planCreateScore}, Delete: ${r.scores.planDeleteScore}, Update: ${r.scores.planUpdateScore}, Final: ${r.scores.planFinalScore}, Policy: ${r.scores.runPolicyScore}, Total: ${r.scores.totalScore}
  ${r.error ? `Error: ${r.error}` : `Risk reason: ${r.riskReason}`}
  ${r.budget ? `Budget: ${r.budget.status} — spent $${r.budget.currentSpend.toLocaleString()} of $${r.budget.budget.toLocaleString()}, forecast $${r.budget.forecastYearEnd.toLocaleString()}` : 'Budget: no data'}
`).join('\n');

  return `You are the IDA (Infrastructure Deployment Assurance) Agent for Humana's Cloud 3.0 platform. You help platform engineers and PR reviewers understand the quality and risk scoring of Terraform deployments running through the IDA pipeline.

## What IDA does
IDA is a quality control gate injected into GitHub Actions pipelines. It scores every Terraform plan before it can be applied, based on the type of operations the plan contains:
- **Create operations** → high confidence, scored positively (planCreateScore up to 100)
- **Update operations** → moderate risk, partial scoring (planUpdateScore)
- **Delete operations** → high risk (instances being terminated), penalises the score heavily (planDeleteScore — higher means more deletions)
- **planFinalScore**: The composite deployment health score. Grade A = create-only, high confidence. Heavy deletes drive this score down.
- **runPolicyScore**: Sentinel policy compliance score (max 6 from passing all policy checks)
- **totalScore**: planFinalScore + runPolicyScore

## Grade mapping
A = planFinalScore 90–100 (create-only, safe to approve)
B = planFinalScore 70–89 (mostly creates with minor updates)
C = planFinalScore 40–69 (significant deletes or updates — reviewer should scrutinise)
D = planFinalScore 10–39 (heavy deletions — requires senior review)
F = planFinalScore 0–9 (extreme risk, likely compliance failure)
NA = plan could not execute (technical error — no grade assigned)

## How to advise PR reviewers
When a PR reviewer sees the IDA badge on a pull request:
- Grade A → safe to approve, low risk
- Grade B → review update scope, generally approvable
- Grade C/D → look carefully at what is being deleted before approving
- NA/error → pipeline needs to be fixed before review can proceed

## Current pipeline runs you have visibility into:
${runsSummary}

## Your behaviour
- Be concise and direct — answer in 2–4 sentences unless a detailed breakdown is requested
- Always reference specific run IDs and scores when answering questions about specific runs
- Explain IDA scores in plain English, not jargon
- If asked about a run with a high delete score, proactively explain what the reviewer should check
- Do not make up information not present in the run data above`;
}

// ─── POST /api/ida/chat — SSE streaming chat ──────────────────────────────────

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
      max_tokens: 600,
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

// ─── GET /api/ida/runs — return pipeline run list ─────────────────────────────

router.get('/runs', (req, res) => {
  res.json({ runs: PIPELINE_RUNS });
});

// ─── Fallback responses ───────────────────────────────────────────────────────

function getFallbackResponse(messages) {
  const last = (messages[messages.length - 1]?.content || '').toLowerCase();

  if (last.includes('25377') || last.includes('fail') || last.includes('unauthori')) {
    return 'Run #25377392009 failed with "Error in speculative plan: unauthorized". This means Terraform Cloud rejected the speculative plan request — the service principal or API token used by the IDA action likely expired or lost its workspace permissions. The plan never executed, so no IDA grade could be assigned (Grade NA). The fix is to rotate the Terraform Cloud token in GitHub Actions secrets and re-trigger the pipeline.';
  }
  if (last.includes('delete') || last.includes('24654') || last.includes('risk') || last.includes('terminate')) {
    return 'Run #24654891023 has a planDeleteScore of 65, which is high — this means the Terraform plan will terminate 14 VM instances. That\'s why it received Grade C with a planFinalScore of 20. As a PR reviewer, you should check the hotfix/vm-scale-down-nonprod branch carefully to confirm those deletions are intentional. If they are unexpected, ask the engineer to scope down the change before approving.';
  }
  if (last.includes('grade a') || last.includes('grade') || last.includes('score') || last.includes('what')) {
    return 'IDA grades reflect the risk profile of the Terraform plan. Grade A (planFinalScore 90–100) means the deployment is create-only — it only adds new resources, so the risk of outage or data loss is minimal. Grade C or lower means the plan includes significant deletes or updates. A high planDeleteScore is the key signal for PR reviewers: it means resources (VMs, databases, etc.) are being terminated. Higher delete score = more scrutiny needed before approving.';
  }
  if (last.includes('budget') || last.includes('warn')) {
    return 'Run #25758381652 has a Budget Warning status. Current spend is $189,443 against a budget of $486,137, but the forecasted year-end spend of $511,341 exceeds the $486,137 budget by ~$25K. IDA flags this as a warning but does not fail the pipeline. The deployment itself passed with Grade A. You should flag the budget forecast to the FinOps team so they can adjust the budget or reduce spend before year-end.';
  }
  return 'I can see 4 pipeline runs in the IDA system for the ida-validator repository. Two runs achieved Grade A with a totalScore of 106 (create-only, low risk). One run failed with an authorization error (Grade NA). One run scored Grade C due to a high delete score of 65, indicating 14 VM instances will be terminated. Ask me about any specific run or score to get more detail.';
}

// ─── Legacy analyze endpoint (kept for backward compat) ──────────────────────

router.post('/analyze', async (req, res) => {
  res.json({ message: 'Use /api/ida/chat for the updated agent interface' });
});

module.exports = router;
