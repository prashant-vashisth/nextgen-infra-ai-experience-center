import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, CheckCircle2, Clock, AlertTriangle, Loader2, Play, Zap,
  GitPullRequest, FileText, Eye, ThumbsUp, ThumbsDown, Terminal,
  ChevronRight, Activity, Users, Database, Lock,
} from 'lucide-react'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const STEPS = [
  { index: 1, id: 'scan',             label: 'Detect & Classify CVITs',       agent: 'ScannerAgent',      icon: Shield   },
  { index: 2, id: 'collect',          label: 'Smart Requirement Collection',  agent: 'RequirementAgent',  icon: Database },
  { index: 3, id: 'enrich',           label: 'Auto-Enrichment',               agent: 'EnrichmentAgent',   icon: Zap      },
  { index: 4, id: 'awaiting_approval',label: 'Approval Workflow',             agent: 'ApprovalAgent',     icon: Users,   human: true },
  { index: 5, id: 'handover',         label: 'Handover to Human Expert',      agent: 'HandoverAgent',     icon: Users,   human: true },
  { index: 6, id: 'work_package',     label: 'Work Package Creation',         agent: 'WorkPackageAgent',  icon: FileText },
  { index: 7, id: 'awaiting_execution',label:'Handover to DevOps',            agent: 'ExecutionAgent',    icon: Users,   human: true },
  { index: 8, id: 'monitor',          label: 'Agent Monitors Progress',       agent: 'MonitorAgent',      icon: Activity },
  { index: 9, id: 'close',            label: 'Smart Closure & Validation',    agent: 'ClosureAgent',      icon: CheckCircle2 },
  { index: 10,id: 'kb_update',        label: 'Knowledge Base Update',         agent: 'KBAgent',           icon: FileText },
]

const SEV_BADGE = { CRITICAL: 'bg-red-600 text-white', HIGH: 'bg-orange-500 text-white', MEDIUM: 'bg-amber-500 text-white', LOW: 'bg-blue-500 text-white' }
const LOG_TYPE_COLOR = { thinking: 'text-gray-400', tool_call: 'text-humana-teal', tool_result: 'text-humana-green', action: 'text-blue-600', complete: 'text-gray-800', progress: 'text-amber-600', waiting: 'text-amber-500', created: 'text-humana-green', summary: 'text-gray-800', validated: 'text-humana-green' }

const CLUSTERS = ['humana-prod-aks-eastus', 'humana-dev-aks-centralus', 'humana-nonprod-aks-westus']

export default function CVITWorkflowAgent() {
  const [workflowId, setWorkflowId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStates, setStepStates] = useState({})
  const [logs, setLogs] = useState([])
  const [findings, setFindings] = useState([])
  const [selectedCluster, setSelectedCluster] = useState(CLUSTERS[0])
  const [humanPending, setHumanPending] = useState(null)
  const [progress, setProgress] = useState(0)
  const [artifacts, setArtifacts] = useState({})
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [timing, setTiming] = useState({ start: null, end: null })
  const [approverName, setApproverName] = useState('security-manager')
  const esRef = useRef(null)
  const logEndRef = useRef(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const connectSSE = (wfId) => {
    if (esRef.current) esRef.current.close()
    const es = new EventSource(`${API_URL}/api/cvit/stream/${wfId}`)
    esRef.current = es

    const handle = (event, data) => {
      switch (event) {
        case 'step':
          setCurrentStep(data.index)
          setStepStates(prev => ({ ...prev, [data.step]: 'active' }))
          if (data.index > 1) {
            const prevStep = STEPS[data.index - 2]
            if (prevStep) setStepStates(prev => ({ ...prev, [prevStep.id]: 'done' }))
          }
          break
        case 'log':
          setLogs(prev => [...prev.slice(-199), data])
          break
        case 'human_required':
          setHumanPending(data)
          break
        case 'approved':
          setHumanPending(null)
          setStepStates(prev => ({ ...prev, awaiting_approval: 'done' }))
          break
        case 'execution_confirmed':
          setHumanPending(null)
          setStepStates(prev => ({ ...prev, awaiting_execution: 'done' }))
          break
        case 'rejected':
          setStepStates(prev => ({ ...prev, awaiting_approval: 'error' }))
          setIsRunning(false)
          break
        case 'progress':
          setProgress(data.pct || 0)
          break
        case 'work_package_ready':
          setArtifacts(prev => ({ ...prev, incident: data.incident, pr: data.pr }))
          break
        case 'state':
          if (data.findings?.length) setFindings(data.findings)
          if (data.changeTicket) setArtifacts(prev => ({ ...prev, change: data.changeTicket }))
          if (data.incidentTicket) setArtifacts(prev => ({ ...prev, incident: data.incidentTicket }))
          if (data.githubPR) setArtifacts(prev => ({ ...prev, pr: data.githubPR }))
          if (data.kbArticle) setArtifacts(prev => ({ ...prev, kb: data.kbArticle }))
          if (data.step === 'completed') { setIsCompleted(true); setIsRunning(false); setTiming(t => ({ ...t, end: data.completedAt })) }
          break
        case 'error':
          setLogs(prev => [...prev, { ts: new Date().toISOString(), agent: 'System', type: 'error', message: data.message }])
          setIsRunning(false)
          break
        default: break
      }
    }

    ['step','log','human_required','approved','execution_confirmed','rejected','progress','work_package_ready','state','error','started'].forEach(evt => {
      es.addEventListener(evt, (e) => { try { handle(evt, JSON.parse(e.data)) } catch { /* ignore */ } })
    })

    es.onerror = () => { /* reconnect handled by browser */ }
  }

  const startWorkflow = async () => {
    setIsRunning(true)
    setIsCompleted(false)
    setLogs([])
    setFindings([])
    setStepStates({})
    setProgress(0)
    setArtifacts({})
    setHumanPending(null)
    setCurrentStep(0)
    setTiming({ start: new Date().toISOString(), end: null })

    const r = await fetch(`${API_URL}/api/cvit/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cluster: selectedCluster }),
    })
    const { workflowId: wfId } = await r.json()
    setWorkflowId(wfId)
    connectSSE(wfId)
  }

  const handleApprove = async () => {
    await fetch(`${API_URL}/api/cvit/approve/${workflowId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedBy: approverName }),
    })
    setHumanPending(null)
  }

  const handleReject = async () => {
    await fetch(`${API_URL}/api/cvit/reject/${workflowId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Rejected during demo — risk too high' }),
    })
    setHumanPending(null)
    setIsRunning(false)
  }

  const handleExecute = async () => {
    await fetch(`${API_URL}/api/cvit/execute/${workflowId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedBy: 'devops-engineer' }),
    })
    setHumanPending(null)
  }

  const elapsedSec = timing.start
    ? Math.round((Date.now() - new Date(timing.start).getTime()) / 1000)
    : 0
  const completedSec = timing.end && timing.start
    ? Math.round((new Date(timing.end) - new Date(timing.start)) / 1000)
    : null

  return (
    <div className="min-h-screen bg-humana-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Shield size={12} className="text-red-500" />
              UC #36 · Security Engineering
            </div>
            <h1 className="text-xl font-bold text-humana-navy">Container Vulnerability Intelligent Remediation (CVIT)</h1>
            <p className="text-sm text-gray-500 mt-0.5">10-step multi-agent workflow: Detect → Enrich → Approve → Remediate → Validate → KB</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={selectedCluster} onChange={e => setSelectedCluster(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-humana-green">
              {CLUSTERS.map(c => <option key={c}>{c}</option>)}
            </select>
            {isRunning && <LiveIndicator label="AGENTS RUNNING" color="green" />}
            <button onClick={startWorkflow} disabled={isRunning}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
              {isRunning ? 'Agents Running...' : 'Launch CVIT Workflow'}
            </button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-gray-500">LangGraph StateGraph · Groq tool calling · NVD API · ServiceNow · GitHub</span>
        {isRunning && timing.start && <span className="ml-auto text-amber-600 font-mono font-semibold">⏱ {elapsedSec}s</span>}
        {isCompleted && <span className="ml-auto text-humana-green font-mono font-bold">✓ Workflow complete</span>}
      </div>

      <div className="flex h-[calc(100vh-130px)]">

        {/* LEFT — 10-step timeline */}
        <div className="w-52 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <div className="px-3 pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Workflow Steps</div>
          {STEPS.map(step => {
            const state = stepStates[step.id]
            const isCurrent = currentStep === step.index
            const Icon = step.icon
            return (
              <div key={step.id} className={`flex items-start gap-2 px-3 py-2.5 mx-1.5 rounded-lg mb-0.5 transition-all ${isCurrent ? 'bg-humana-green/10 border border-humana-green/30' : ''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  state === 'done' ? 'bg-humana-green' : state === 'active' || isCurrent ? 'bg-humana-green/20 border-2 border-humana-green' : state === 'error' ? 'bg-red-500' : 'bg-gray-200'
                }`}>
                  {state === 'done' ? <CheckCircle2 size={10} className="text-white" /> :
                   state === 'active' || isCurrent ? <Loader2 size={10} className="text-humana-green animate-spin" /> :
                   <span className="text-xs text-gray-400 font-bold">{step.index}</span>}
                </div>
                <div>
                  <div className={`text-xs font-semibold leading-tight ${isCurrent ? 'text-humana-green' : state === 'done' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {step.label}
                  </div>
                  {step.human && (
                    <span className="text-xs text-amber-600 font-semibold">👤 Human-in-loop</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* CENTER — Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* CVE Findings */}
          {findings.length > 0 && (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase">CVITs Detected — {findings.length} vulnerabilities</div>
              <div className="flex flex-wrap gap-2">
                {findings.map(f => (
                  <div key={f.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-gray-200 shadow-sm">
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded ${SEV_BADGE[f.severity] || 'bg-gray-500 text-white'}`}>{f.severity}</span>
                    <span className="font-mono text-xs text-humana-navy font-semibold">{f.id}</span>
                    <span className="text-xs text-gray-500">{f.component} {f.version}</span>
                    <ChevronRight size={10} className="text-humana-green" />
                    <span className="text-xs text-humana-green font-semibold">{f.patchVersion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar for monitor step */}
          {progress > 0 && progress < 100 && (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-semibold">Remediation Progress — Agent monitoring live</span>
                <span className="text-humana-green font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} className="h-full bg-humana-green rounded-full" />
              </div>
            </div>
          )}

          {/* Artifacts row */}
          {(artifacts.change || artifacts.incident || artifacts.pr || artifacts.kb) && (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-3">
              {artifacts.change && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
                  <FileText size={12} className="text-amber-600" />
                  <span className="text-amber-700 font-semibold">{artifacts.change.number}</span>
                  <span className="text-gray-500">Change Request</span>
                  <span className={`text-xs font-semibold ${artifacts.change.source?.includes('live') ? 'text-humana-green' : 'text-gray-400'}`}>
                    {artifacts.change.source?.includes('live') ? '● Live' : '○ Demo'}
                  </span>
                </div>
              )}
              {artifacts.incident && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
                  <Shield size={12} className="text-blue-600" />
                  <span className="text-blue-700 font-semibold">{artifacts.incident.number}</span>
                  <span className="text-gray-500">ServiceNow Incident</span>
                  <span className={`text-xs font-semibold ${artifacts.incident.source?.includes('live') ? 'text-humana-green' : 'text-gray-400'}`}>
                    {artifacts.incident.source?.includes('live') ? '● Live' : '○ Demo'}
                  </span>
                </div>
              )}
              {artifacts.pr && (
                <a href={artifacts.pr.url !== '#' ? artifacts.pr.url : undefined} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-xs hover:bg-purple-100 transition-colors">
                  <GitPullRequest size={12} className="text-purple-600" />
                  <span className="text-purple-700 font-semibold">PR #{artifacts.pr.number}</span>
                  <span className="text-gray-500">GitHub PR</span>
                  <span className={`text-xs font-semibold ${artifacts.pr.source === 'github_live' ? 'text-humana-green' : 'text-gray-400'}`}>
                    {artifacts.pr.source === 'github_live' ? '● Live' : '○ Demo'}
                  </span>
                </a>
              )}
              {artifacts.kb && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs">
                  <FileText size={12} className="text-humana-green" />
                  <span className="text-humana-green font-semibold">{artifacts.kb.number}</span>
                  <span className="text-gray-500">KB Article</span>
                </div>
              )}
            </div>
          )}

          {/* Agent log stream */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                <Shield size={48} className="text-gray-200" />
                <div className="text-center">
                  <div className="text-gray-600 font-semibold mb-1">CVIT Multi-Agent Orchestrator</div>
                  <div className="text-gray-400">Select a cluster and click "Launch CVIT Workflow" to start</div>
                  <div className="text-gray-300 mt-2">LangGraph + Groq Tool Calling + Azure + ServiceNow + GitHub</div>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {logs.map((entry, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 leading-relaxed">
                    <span className="text-gray-400 shrink-0 w-20 text-right">{new Date(entry.ts).toLocaleTimeString()}</span>
                    <span className={`font-bold shrink-0 w-28 truncate ${
                      entry.agent === 'ScannerAgent' ? 'text-red-600' :
                      entry.agent === 'EnrichmentAgent' ? 'text-amber-600' :
                      entry.agent === 'WorkPackageAgent' ? 'text-purple-600' :
                      entry.agent === 'MonitorAgent' ? 'text-blue-600' :
                      entry.agent === 'KBAgent' ? 'text-humana-green' :
                      'text-humana-teal'
                    }`}>[{entry.agent}]</span>
                    <span className={`shrink-0 w-20 ${LOG_TYPE_COLOR[entry.type] || 'text-gray-500'}`}>{entry.type}</span>
                    <span className="text-gray-700 flex-1 break-all">{entry.message}</span>
                    {entry.data && entry.type === 'tool_result' && (
                      <span className="text-humana-green text-xs shrink-0">✓ {Object.keys(entry.data).slice(0,3).join(', ')}</span>
                    )}
                  </motion.div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Human-in-loop panel */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <div className="px-4 pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Human-in-Loop</div>

          <AnimatePresence>
            {humanPending?.action === 'approve' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-3 mb-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-700 font-bold text-sm">Approval Required</span>
                </div>
                <div className="text-xs text-gray-700 mb-3 leading-relaxed">
                  Change request <span className="font-mono text-amber-700">{humanPending.changeTicket?.number}</span> created in ServiceNow.
                  Risk level: <span className={`font-bold ${humanPending.cve?.cvss >= 8 ? 'text-red-600' : 'text-amber-600'}`}>
                    {humanPending.cve?.cvss >= 8 ? 'HIGH' : 'MEDIUM'} (CVSS {humanPending.cve?.cvss || humanPending.cve?.cvss_score})
                  </span>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-gray-500">CVE: <span className="text-gray-800 font-mono">{humanPending.cve?.id || humanPending.cve?.cve_id}</span></div>
                  <div className="text-xs text-gray-500">Component: <span className="text-gray-800">{humanPending.cve?.component} → {humanPending.cve?.patchVersion}</span></div>
                  <div className="text-xs text-gray-500">Namespace: <span className="text-humana-teal">{humanPending.cve?.namespace}</span></div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Approved by:</div>
                  <input value={approverName} onChange={e => setApproverName(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-humana-green" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApprove} className="flex-1 flex items-center justify-center gap-1.5 bg-humana-green hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                    <ThumbsUp size={12} />Approve
                  </button>
                  <button onClick={handleReject} className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                    <ThumbsDown size={12} />Reject
                  </button>
                </div>
              </motion.div>
            )}

            {humanPending?.action === 'execute' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-3 mb-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-700 font-bold text-sm">Execution Confirmation</span>
                </div>
                <div className="text-xs text-gray-700 mb-3 leading-relaxed">
                  Work package ready. Review the items below and confirm execution.
                </div>
                <div className="space-y-1.5 mb-3 text-xs">
                  {humanPending.pr && (
                    <div className="flex items-center gap-2">
                      <GitPullRequest size={11} className="text-purple-600" />
                      <span className="text-gray-600">PR #{humanPending.pr.number} created</span>
                      <span className={`${humanPending.pr.source === 'github_live' ? 'text-humana-green' : 'text-gray-300'}`}>
                        {humanPending.pr.source === 'github_live' ? '●' : '○'}
                      </span>
                    </div>
                  )}
                  {humanPending.incident && (
                    <div className="flex items-center gap-2">
                      <Shield size={11} className="text-blue-600" />
                      <span className="text-gray-600">{humanPending.incident.number} assigned</span>
                      <span className={`${humanPending.incident.source?.includes('live') ? 'text-humana-green' : 'text-gray-300'}`}>
                        {humanPending.incident.source?.includes('live') ? '●' : '○'}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={handleExecute}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                  <Play size={12} fill="currentColor" />Confirm & Execute Remediation
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completed summary */}
          {isCompleted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mx-3 mb-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-humana-green" />
                <span className="text-humana-green font-bold text-sm">Workflow Complete</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {isCompleted && <div className="text-humana-green font-semibold text-xs">✓ All 10 steps complete</div>}
                {artifacts.change && <div className="text-gray-500">📋 Change: <span className="font-mono text-gray-800">{artifacts.change.number}</span></div>}
                {artifacts.incident && <div className="text-gray-500">🎫 Incident: <span className="font-mono text-gray-800">{artifacts.incident.number}</span></div>}
                {artifacts.pr && <div className="text-gray-500">🔀 PR: <span className="font-mono text-gray-800">#{artifacts.pr.number}</span></div>}
                {artifacts.kb && <div className="text-gray-500">📚 KB: <span className="font-mono text-gray-800">{artifacts.kb.number}</span></div>}
              </div>
            </motion.div>
          )}

          {/* Tech stack info */}
          <div className="px-4 pt-2">
            <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Agent Framework</div>
            <div className="space-y-1.5 text-xs text-gray-500">
              {[
                { label: 'Orchestrator', value: 'LangGraph.js StateGraph' },
                { label: 'LLM',          value: 'Groq Llama 4 Scout' },
                { label: 'Tool Calling', value: 'Groq Function Calling' },
                { label: 'NVD API',      value: 'Real CVE enrichment' },
                { label: 'ServiceNow',   value: 'Live dev283388 instance' },
                { label: 'GitHub',       value: 'Real PR creation' },
                { label: 'Azure',        value: 'ARM API + Defender' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-gray-600 font-mono text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
