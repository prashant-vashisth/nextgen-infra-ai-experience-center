const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Streaming completion via SSE
router.post('/stream', async (req, res) => {
  const { prompt, systemPrompt, maxTokens = 1200, temperature = 0.3 } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const start = Date.now();

  if (!process.env.GROQ_API_KEY) {
    const fallback = generateFallbackResponse(prompt);
    const words = fallback.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 40));
    }
    res.write(`data: ${JSON.stringify({ done: true, duration: Date.now() - start, fallback: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const groq = getGroq();
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const stream = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, duration: Date.now() - start })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Groq error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
    res.end();
  }
});

// Non-streaming completion (returns full JSON)
router.post('/complete', async (req, res) => {
  const { prompt, systemPrompt, maxTokens = 1200, temperature = 0.3 } = req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.json({ content: generateFallbackResponse(prompt), fallback: true });
  }

  try {
    const groq = getGroq();
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    res.json({ content: completion.choices[0].message.content, model: completion.model });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function generateFallbackResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('rca') || lower.includes('root cause')) {
    return `**Root Cause Analysis**\n\nThe incident was triggered by a cascading failure in the claims-processing namespace following a memory pressure event on node humana-prod-node-03. The primary cause was an OOMKilled event affecting the eligibility-batch service, which caused downstream timeouts in the member-portal authentication flow.\n\n**5-Why Analysis:**\n1. Why did the service fail? — Pod was OOMKilled due to memory limit exceeded\n2. Why was memory exceeded? — Batch job CLAIMS-ADJUD-NIGHTLY processed 3x normal volume\n3. Why was volume 3x normal? — Upstream eligibility feed sent duplicate records due to ETL misconfiguration\n4. Why was ETL misconfigured? — Change ticket CHG0045231 applied incorrect transformation rule\n5. Why was incorrect rule applied? — Peer review step was bypassed in emergency change process\n\n**Remediation:** Revert ETL transformation rule, implement deduplication at ingestion layer, enforce mandatory peer review for all change types.`;
  }
  if (lower.includes('cve') || lower.includes('vulnerab')) {
    return `**Vulnerability Remediation Plan**\n\nCVE-2024-21626 (runc container escape) — CRITICAL severity (CVSS 8.6)\n\n**Immediate Actions:**\n1. Patch runc to version ≥ 1.1.12 on all node pools\n2. Apply Kubernetes node cordon before patching: \`kubectl cordon <node>\`\n3. Drain node workloads: \`kubectl drain <node> --ignore-daemonsets\`\n4. Update container runtime via node image upgrade\n5. Validate patch: \`runc --version | grep 1.1.12\`\n6. Uncordon node: \`kubectl uncordon <node>\`\n\n**HIPAA Impact:** Medium — container escape could expose PHI in claims-processing namespace. Prioritize patching that node pool first.\n\n**Estimated completion:** 45 minutes per node pool | Risk reduction: 87 → 23`;
  }
  if (lower.includes('batch') || lower.includes('job')) {
    return `**Batch Job Failure Analysis**\n\nJob CLAIMS-ADJUD-NIGHTLY failed at step 3 of 7 (data validation phase) after processing 1.2M of expected 1.8M records.\n\n**Root Cause:** Informatica ETL connection timeout to Oracle RAC cluster (humana-claims-db-01) after 300s. The database experienced high I/O wait due to a long-running ad-hoc query consuming lock resources.\n\n**Recommended Actions:**\n1. Terminate blocking Oracle session (SID 4421)\n2. Restart Informatica workflow from checkpoint at record 1,200,001\n3. Apply connection pool timeout increase: 600s\n4. Schedule ad-hoc query window outside batch hours (2–5 AM)\n\n**SLA Impact:** 47-minute delay. Recovery target: 03:47 AM (within SLA window of 04:00 AM)`;
  }
  return `**AI Analysis Complete**\n\nBased on analysis of the provided context, the recommended course of action involves a systematic review of the affected components. The primary vectors of concern have been identified and correlated against the enterprise knowledge base. Remediation steps have been generated with an estimated resolution time of 45 minutes. Confidence score: 91%.`;
}

module.exports = router;
