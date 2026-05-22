const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : { v4: () => `wf-${Date.now()}-${Math.random().toString(36).slice(2)}` };
const { startWorkflow, approveWorkflow, rejectWorkflow, confirmExecution, getWorkflowState, listWorkflows, workflows } = require('../agents/cvit-orchestrator');

// SSE client registry — workflowId → [res, ...]
const sseClients = new Map();

function broadcastToWorkflow(workflowId, event, data) {
  const clients = sseClients.get(workflowId) || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => { try { res.write(payload); } catch { /* client disconnected */ } });
}

// ── Start a new CVIT workflow ──────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { cluster = 'humana-prod-aks-eastus', cveId } = req.body;
  const workflowId = `wf-${Date.now()}`;

  res.json({ workflowId, started: true });

  // Run workflow async — emit events to SSE clients
  const emitFn = (event, data) => broadcastToWorkflow(workflowId, event, { ...data, workflowId, ts: new Date().toISOString() });

  setImmediate(async () => {
    try {
      emitFn('started', { workflowId, cluster, cveId });
      await startWorkflow(workflowId, cluster, cveId, emitFn);
    } catch (err) {
      console.error('Workflow error:', err.message);
      emitFn('error', { message: err.message });
    }
  });
});

// ── SSE stream for a workflow ──────────────────────────────────────────────────
router.get('/stream/:workflowId', (req, res) => {
  const { workflowId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!sseClients.has(workflowId)) sseClients.set(workflowId, []);
  sseClients.get(workflowId).push(res);

  // Send current state immediately if workflow already in progress
  const state = getWorkflowState(workflowId);
  if (state) {
    res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
    (state.agentLogs || []).forEach(entry =>
      res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`)
    );
  }

  // Heartbeat
  const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { clearInterval(hb); } }, 15000);

  req.on('close', () => {
    clearInterval(hb);
    const clients = sseClients.get(workflowId) || [];
    sseClients.set(workflowId, clients.filter(c => c !== res));
  });
});

// ── Human approval ─────────────────────────────────────────────────────────────
router.post('/approve/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { approvedBy = 'security-manager', notes = '' } = req.body;

  res.json({ accepted: true, workflowId });

  setImmediate(async () => {
    try {
      await approveWorkflow(workflowId, approvedBy, notes);
    } catch (err) {
      broadcastToWorkflow(workflowId, 'error', { message: err.message });
    }
  });
});

// ── Human rejection ────────────────────────────────────────────────────────────
router.post('/reject/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { reason = 'Rejected by reviewer' } = req.body;
  try {
    await rejectWorkflow(workflowId, reason);
    res.json({ rejected: true, workflowId });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── Human execution confirmation ───────────────────────────────────────────────
router.post('/execute/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { confirmedBy = 'devops-engineer' } = req.body;

  res.json({ accepted: true, workflowId });

  setImmediate(async () => {
    try {
      await confirmExecution(workflowId, confirmedBy);
    } catch (err) {
      broadcastToWorkflow(workflowId, 'error', { message: err.message });
    }
  });
});

// ── Get workflow state ──────────────────────────────────────────────────────────
router.get('/state/:workflowId', (req, res) => {
  const state = getWorkflowState(req.params.workflowId);
  if (!state) return res.status(404).json({ error: 'Workflow not found' });
  res.json(state);
});

// ── List workflows ──────────────────────────────────────────────────────────────
router.get('/list', (req, res) => {
  res.json({ workflows: listWorkflows() });
});

module.exports = router;
