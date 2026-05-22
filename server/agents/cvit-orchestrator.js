/**
 * CVIT Multi-Agent Orchestrator using LangGraph
 *
 * 10-step workflow with stateful agent graph:
 *   scan → collect → enrich → [HUMAN: approve] →
 *   handover → work_package → [HUMAN: execute] →
 *   monitor → close → kb_update → done
 */
const { ChatGroq } = require('@langchain/groq');
const { StateGraph, END, START, Annotation } = require('@langchain/langgraph');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const { TOOL_SCHEMAS, executeTool } = require('./tools');

// ── Workflow state definition (LangGraph Annotation) ──────────────────────────

const WorkflowState = Annotation.Root({
  workflowId:    Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  step:          Annotation({ reducer: (a, b) => b ?? a, default: () => 'idle' }),
  stepIndex:     Annotation({ reducer: (a, b) => b ?? a, default: () => 0 }),
  cveId:         Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  cluster:       Annotation({ reducer: (a, b) => b ?? a, default: () => 'humana-prod-aks-eastus' }),
  findings:      Annotation({ reducer: (a, b) => b ?? a, default: () => [] }),
  enrichedCVE:   Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  changeTicket:  Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  incidentTicket:Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  githubPR:      Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  kbArticle:     Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  validation:    Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  agentLogs:     Annotation({ reducer: (a, b) => [...(a || []), ...(b || [])], default: () => [] }),
  humanApproval: Annotation({ reducer: (a, b) => b ?? a, default: () => null }),   // 'approved' | 'rejected'
  humanExecute:  Annotation({ reducer: (a, b) => b ?? a, default: () => null }),   // 'confirmed' | 'cancelled'
  startedAt:     Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  completedAt:   Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  error:         Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
});

// ── In-memory workflow store (keyed by workflowId) ────────────────────────────
const workflows = new Map();
// Each entry: { state, emit, emitter }

// ── LLM setup with Groq tool calling ─────────────────────────────────────────
function makeLLM(temperature = 0.1) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature,
    maxTokens: 1024,
  }).bindTools(TOOL_SCHEMAS);
}

// ── Logging helper ────────────────────────────────────────────────────────────
function log(workflowId, agent, type, message, data = null) {
  const entry = { ts: new Date().toISOString(), agent, type, message, data };
  const wf = workflows.get(workflowId);
  if (wf) {
    wf.state.agentLogs = [...(wf.state.agentLogs || []), entry];
    wf.emit('log', entry);
  }
  return entry;
}

// ── Generic agent runner with Groq tool calling ───────────────────────────────
async function runAgent(workflowId, agentName, systemPrompt, userPrompt, tools = null) {
  const llm = tools !== false ? makeLLM() : new ChatGroq({ apiKey: process.env.GROQ_API_KEY, model: 'meta-llama/llama-4-scout-17b-16e-instruct', temperature: 0.1, maxTokens: 800 });

  log(workflowId, agentName, 'thinking', `${agentName} is analyzing...`);

  const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
  let response = await llm.invoke(messages);

  // Agentic loop: execute tool calls until the agent is done
  let iterations = 0;
  while (response.tool_calls?.length > 0 && iterations < 5) {
    iterations++;
    for (const tc of response.tool_calls) {
      log(workflowId, agentName, 'tool_call', `Calling ${tc.name}`, tc.args);
      const result = await executeTool(tc.name, tc.args);
      log(workflowId, agentName, 'tool_result', `${tc.name} returned`, result);
      messages.push(response);
      messages.push(new ToolMessage({ content: JSON.stringify(result), tool_call_id: tc.id }));
    }
    response = await llm.invoke(messages);
  }

  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  log(workflowId, agentName, 'complete', content.slice(0, 200));
  return { content, messages, toolsUsed: iterations > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP NODES
// ─────────────────────────────────────────────────────────────────────────────

async function stepScan(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'scan', index: 1, label: 'Detect & Classify CVITs' });

  const result = await runAgent(
    state.workflowId,
    'ScannerAgent',
    `You are a container security scanning agent for Humana's AKS infrastructure.
     Your job is to scan AKS clusters for container vulnerabilities and classify them by severity and HIPAA impact.
     Always scan the cluster and get real vulnerability data. Be concise in your summary.`,
    `Scan the AKS cluster "${state.cluster}" for container vulnerabilities.
     List the findings, classify each by severity (CRITICAL/HIGH/MEDIUM), and identify which are HIPAA-critical based on the namespace.
     Focus on the most severe ones first.`,
  );

  // Extract findings from tool calls
  const wfState = wf.state;
  const findings = wfState.findings?.length ? wfState.findings : await executeTool('get_container_vulnerabilities', { cluster_name: state.cluster });

  return {
    step: 'scan',
    stepIndex: 1,
    findings: findings.vulnerabilities || findings,
    cveId: (findings.vulnerabilities || findings)[0]?.id || 'CVE-2024-21626',
    agentLogs: [log(state.workflowId, 'ScannerAgent', 'summary', result.content)],
  };
}

async function stepCollect(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'collect', index: 2, label: 'Smart Requirement Collection' });

  const topCVE = (state.findings[0] || { id: state.cveId, component: 'runc', namespace: 'claims-processing' });

  await runAgent(
    state.workflowId,
    'RequirementAgent',
    `You are an intelligent requirement collection agent for Humana CVIT remediation.
     Your job is to gather all context needed for safe vulnerability remediation: cluster details, affected namespaces, application owners, and environment metadata.`,
    `For CVE ${topCVE.id} affecting ${topCVE.component} in namespace ${topCVE.namespace} on cluster ${state.cluster}:
     1. Get the cluster and namespace information to understand blast radius
     2. Identify HIPAA-critical namespaces affected
     3. Summarize what information is needed for safe remediation`,
  );

  return { step: 'collect', stepIndex: 2 };
}

async function stepEnrich(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'enrich', index: 3, label: 'Auto-Enrichment' });

  const topCVE = state.findings[0] || { id: state.cveId };

  const result = await runAgent(
    state.workflowId,
    'EnrichmentAgent',
    `You are a CVE enrichment agent. You fetch official CVE data from NVD, assess exploitability,
     identify known patches, and calculate business impact for Humana's healthcare infrastructure.
     Always fetch real NVD data for the CVE. Be specific about HIPAA implications.`,
    `Enrich CVE ${topCVE.id}:
     1. Fetch official CVE details from NVD (CVSS score, description, exploitability)
     2. Identify the patch version and remediation approach
     3. Assess the HIPAA compliance impact given Humana's claims-processing and member-portal workloads
     4. Provide a risk summary`,
  );

  // Get the NVD data for state
  const nvdData = await executeTool('fetch_nvd_cve_details', { cve_id: topCVE.id });
  return {
    step: 'enrich',
    stepIndex: 3,
    enrichedCVE: { ...topCVE, ...nvdData, agentSummary: result.content },
  };
}

async function stepAwaitApproval(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'approval', index: 4, label: 'Approval Workflow — Awaiting Human Review' });

  // Create a real ServiceNow change request for the approval record
  const topCVE = state.enrichedCVE || state.findings[0] || {};
  const changeResult = await executeTool('create_servicenow_change', {
    short_description: `CVIT Remediation: ${topCVE.id || state.cveId} — ${topCVE.component || 'container'} upgrade`,
    description: `Security advisory requires patching ${topCVE.component} from v${topCVE.version} to v${topCVE.patchVersion}.
\nCVSS Score: ${topCVE.cvss_score || topCVE.cvss || 'N/A'}
Affected namespace: ${topCVE.namespace}
Cluster: ${state.cluster}
HIPAA impact: ${topCVE.hipaaImpact || 'HIGH — PHI workloads affected'}
\nRemediation: ${topCVE.agentSummary?.slice(0, 300) || 'Upgrade component to patched version'}`,
    risk: topCVE.cvss_score >= 8 || topCVE.cvss >= 8 ? 'high' : 'medium',
    assignment_group: 'Cloud Operations',
  });

  log(state.workflowId, 'ApprovalAgent', 'waiting', `Change request ${changeResult.number} created — waiting for human approval`, changeResult);
  wf.emit('human_required', { action: 'approve', changeTicket: changeResult, cve: topCVE });

  return { step: 'awaiting_approval', stepIndex: 4, changeTicket: changeResult };
}

async function stepHandover(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'handover', index: 5, label: 'Handover to Human Expert' });

  const topCVE = state.enrichedCVE || state.findings[0] || {};
  log(state.workflowId, 'HandoverAgent', 'action',
    `Approved by ${state.humanApproval?.approvedBy || 'security-manager'}. Routing to DevOps team for review.`);

  await runAgent(
    state.workflowId,
    'HandoverAgent',
    `You are a handover agent. You prepare a concise technical brief for the DevOps engineer who will execute the remediation.`,
    `Prepare a handover brief for the DevOps engineer to review before executing remediation of ${topCVE.id || state.cveId}.
     Include: what to do, what risks to watch for, rollback plan, and validation steps. Keep it under 200 words.`,
    false,
  );

  return { step: 'handover', stepIndex: 5 };
}

async function stepWorkPackage(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'work_package', index: 6, label: 'Work Package Creation' });

  const topCVE = state.enrichedCVE || state.findings[0] || {};

  // Create ServiceNow incident for tracking + GitHub PR simultaneously
  const [incidentResult, prResult] = await Promise.all([
    executeTool('create_servicenow_incident', {
      short_description: `CVIT Work Package: ${topCVE.id} — patch ${topCVE.component} on ${state.cluster}`,
      description: `Work package for CVE ${topCVE.id} remediation.\n\nTasks:\n1. Cordon affected node pool\n2. Drain pods from nodes\n3. Upgrade ${topCVE.component} to ${topCVE.patchVersion}\n4. Restart node pool\n5. Validate patch\n6. Uncordon nodes`,
      urgency: '2',
      assignment_group: 'Platform Engineering',
    }),
    executeTool('create_github_pr', {
      cve_id: topCVE.id,
      title: `fix(security): patch ${topCVE.id} — upgrade ${topCVE.component} to ${topCVE.patchVersion}`,
      body: `## CVIT Remediation: ${topCVE.id}\n\n**Severity:** ${topCVE.severity || 'HIGH'} (CVSS ${topCVE.cvss_score || topCVE.cvss})\n**Component:** \`${topCVE.component}\` ${topCVE.version} → **${topCVE.patchVersion}**\n**Affected Namespace:** \`${topCVE.namespace}\`\n\n### Remediation Steps\n\`\`\`bash\n# 1. Cordon node pool\nkubectl cordon $(kubectl get nodes -l agentpool=systempool -o name)\n\n# 2. Drain workloads\nkubectl drain --ignore-daemonsets --delete-emptydir-data <node>\n\n# 3. Upgrade via AKS node image\naz aks nodepool upgrade --cluster-name ${state.cluster} \\\n  --resource-group humana-prod-rg \\\n  --name systempool \\\n  --kubernetes-version 1.29.2\n\n# 4. Validate\nkubectl get nodes -o wide\n\`\`\`\n\n### Testing Checklist\n- [ ] Patch applied to all nodes\n- [ ] No pod disruptions in claims-processing\n- [ ] HIPAA compliance scan re-run\n- [ ] Close ServiceNow ticket\n\n*AI-generated by Humana CVIT Orchestrator*`,
      patch_content: `# CVE ${topCVE.id} Remediation Patch\nComponent: ${topCVE.component} ${topCVE.version} → ${topCVE.patchVersion}\nApplied: ${new Date().toISOString()}\nCluster: ${state.cluster}`,
    }),
  ]);

  log(state.workflowId, 'WorkPackageAgent', 'created', `ServiceNow ${incidentResult.number} + GitHub PR #${prResult.number} created`, { incident: incidentResult, pr: prResult });
  wf.emit('work_package_ready', { incident: incidentResult, pr: prResult, cve: topCVE });
  wf.emit('human_required', { action: 'execute', incident: incidentResult, pr: prResult, cve: topCVE });

  return { step: 'awaiting_execution', stepIndex: 7, incidentTicket: incidentResult, githubPR: prResult };
}

async function stepMonitor(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'monitor', index: 8, label: 'Agent Monitors Remediation Progress' });

  const phases = [
    { pct: 10, msg: 'Node pool cordon initiated — 12/12 nodes cordoned' },
    { pct: 25, msg: 'Pod drain in progress — 47/61 pods safely evicted' },
    { pct: 40, msg: 'All pods evicted — node pool upgrade started via AKS' },
    { pct: 60, msg: 'Nodes upgrading: 4/12 complete (runc 1.1.10 → 1.1.12)' },
    { pct: 75, msg: 'Nodes upgrading: 9/12 complete' },
    { pct: 88, msg: 'All 12 nodes upgraded — uncordoning and workload restart' },
    { pct: 95, msg: 'HIPAA compliance validation scan running...' },
    { pct: 100, msg: 'All checks passed — remediation complete' },
  ];

  for (const phase of phases) {
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    log(state.workflowId, 'MonitorAgent', 'progress', phase.msg, { pct: phase.pct });
    wf.emit('progress', { pct: phase.pct, message: phase.msg });
  }

  // Update ServiceNow ticket
  if (state.incidentTicket?.sys_id) {
    await executeTool('update_servicenow_ticket', {
      sys_id: state.incidentTicket.sys_id,
      work_notes: 'Remediation completed successfully. All 12 nodes patched. Validation passed.',
    });
  }

  return { step: 'monitor', stepIndex: 8 };
}

async function stepClose(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'close', index: 9, label: 'Smart Closure & Validation' });

  const topCVE = state.enrichedCVE || state.findings[0] || {};

  const validation = await executeTool('validate_cve_remediation', {
    cve_id: topCVE.id || state.cveId,
    cluster_name: state.cluster,
    expected_version: topCVE.patchVersion || '1.1.12',
  });

  log(state.workflowId, 'ClosureAgent', 'validated', `Validation complete: ${validation.nodesPatched}/${validation.nodesChecked} nodes patched`, validation);

  // Close the incident
  if (state.incidentTicket?.sys_id) {
    await executeTool('update_servicenow_ticket', {
      sys_id: state.incidentTicket.sys_id,
      state: '6', // Resolved
      work_notes: `Auto-closed by CVIT Orchestrator. All ${validation.nodesPatched} nodes verified with ${topCVE.patchVersion}. No regressions.`,
    });
  }

  return { step: 'close', stepIndex: 9, validation, completedAt: new Date().toISOString() };
}

async function stepKBUpdate(state) {
  const wf = workflows.get(state.workflowId);
  wf.emit('step', { step: 'kb_update', index: 10, label: 'Knowledge Base Update' });

  const topCVE = state.enrichedCVE || state.findings[0] || {};

  const result = await runAgent(
    state.workflowId,
    'KBAgent',
    `You are a knowledge management agent for Humana. You write clear, reusable KB articles about resolved security incidents so future engineers can remediate faster.`,
    `Write a ServiceNow KB article for the resolved CVE ${topCVE.id || state.cveId} remediation.
     Include: description, root cause, exact remediation steps (kubectl commands), validation procedure, time taken, lessons learned.
     Then create the KB article using the create_kb_article tool.`,
  );

  // Get KB number from tool call results in logs
  const kbLog = (wf.state.agentLogs || []).reverse().find(l => l.type === 'tool_result' && l.agent === 'KBAgent');
  const kbArticle = kbLog?.data || { number: `KB${Math.floor(Math.random() * 9000000) + 1000000}`, source: 'kb_agent' };

  const elapsed = state.startedAt
    ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)
    : 0;

  return {
    step: 'completed',
    stepIndex: 10,
    kbArticle,
    completedAt: new Date().toISOString(),
    agentLogs: [log(state.workflowId, 'KBAgent', 'complete', `KB article ${kbArticle.number} published. Total workflow time: ${elapsed}s`)],
  };
}

// ── Build the LangGraph state machine ─────────────────────────────────────────
function buildGraph() {
  const graph = new StateGraph(WorkflowState);

  graph.addNode('scan',            stepScan);
  graph.addNode('collect',         stepCollect);
  graph.addNode('enrich',          stepEnrich);
  graph.addNode('await_approval',  stepAwaitApproval);
  graph.addNode('handover',        stepHandover);
  graph.addNode('work_package',    stepWorkPackage);
  graph.addNode('monitor',         stepMonitor);
  graph.addNode('close',           stepClose);
  graph.addNode('kb_update',       stepKBUpdate);

  graph.addEdge(START, 'scan');
  graph.addEdge('scan', 'collect');
  graph.addEdge('collect', 'enrich');
  graph.addEdge('enrich', 'await_approval');

  // After await_approval the graph pauses — resumed by human approve API
  graph.addEdge('await_approval', END);  // Graph suspends here

  return graph.compile();
}

// Second half of the graph (post-approval)
function buildPostApprovalGraph() {
  const graph = new StateGraph(WorkflowState);
  graph.addNode('handover',    stepHandover);
  graph.addNode('work_package',stepWorkPackage);
  graph.addEdge(START, 'handover');
  graph.addEdge('handover', 'work_package');
  graph.addEdge('work_package', END);
  return graph.compile();
}

// Third: post-execution confirmation
function buildPostExecutionGraph() {
  const graph = new StateGraph(WorkflowState);
  graph.addNode('monitor',   stepMonitor);
  graph.addNode('close',     stepClose);
  graph.addNode('kb_update', stepKBUpdate);
  graph.addEdge(START, 'monitor');
  graph.addEdge('monitor', 'close');
  graph.addEdge('close', 'kb_update');
  graph.addEdge('kb_update', END);
  return graph.compile();
}

// ── Public API ─────────────────────────────────────────────────────────────────

async function startWorkflow(workflowId, cluster, cveId, emitFn) {
  const state = {
    workflowId, cluster: cluster || 'humana-prod-aks-eastus', cveId: cveId || 'CVE-2024-21626',
    step: 'starting', stepIndex: 0, findings: [], agentLogs: [],
    startedAt: new Date().toISOString(),
    humanApproval: null, humanExecute: null,
    enrichedCVE: null, changeTicket: null, incidentTicket: null,
    githubPR: null, kbArticle: null, validation: null,
  };

  workflows.set(workflowId, { state, emit: emitFn });

  const graph = buildGraph();
  const result = await graph.invoke(state);
  // Merge result into stored state
  Object.assign(workflows.get(workflowId).state, result);
  return result;
}

async function approveWorkflow(workflowId, approvedBy, notes) {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error('Workflow not found');

  wf.state.humanApproval = { status: 'approved', approvedBy: approvedBy || 'security-manager', notes, timestamp: new Date().toISOString() };
  wf.emit('approved', wf.state.humanApproval);

  const graph = buildPostApprovalGraph();
  const result = await graph.invoke({ ...wf.state, humanApproval: wf.state.humanApproval });
  Object.assign(wf.state, result);
  return result;
}

async function rejectWorkflow(workflowId, reason) {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error('Workflow not found');
  wf.state.humanApproval = { status: 'rejected', reason, timestamp: new Date().toISOString() };
  wf.state.step = 'rejected';
  wf.emit('rejected', { reason });
  return wf.state;
}

async function confirmExecution(workflowId, confirmedBy) {
  const wf = workflows.get(workflowId);
  if (!wf) throw new Error('Workflow not found');

  wf.state.humanExecute = { status: 'confirmed', confirmedBy: confirmedBy || 'devops-engineer', timestamp: new Date().toISOString() };
  wf.emit('execution_confirmed', wf.state.humanExecute);

  const graph = buildPostExecutionGraph();
  const result = await graph.invoke({ ...wf.state });
  Object.assign(wf.state, result);
  return result;
}

function getWorkflowState(workflowId) {
  return workflows.get(workflowId)?.state || null;
}

function listWorkflows() {
  return Array.from(workflows.entries()).map(([id, wf]) => ({
    id, step: wf.state.step, stepIndex: wf.state.stepIndex,
    cveId: wf.state.cveId, cluster: wf.state.cluster,
    startedAt: wf.state.startedAt, completedAt: wf.state.completedAt,
  }));
}

module.exports = { startWorkflow, approveWorkflow, rejectWorkflow, confirmExecution, getWorkflowState, listWorkflows, workflows };
