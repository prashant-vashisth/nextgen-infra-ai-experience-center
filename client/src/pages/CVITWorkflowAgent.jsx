import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, CheckCircle2, Loader2, Play, Zap, GitPullRequest, FileText,
  ThumbsUp, ThumbsDown, ChevronRight, Activity, Users, Database,
  AlertTriangle, ExternalLink, GitBranch, Server, Bell, RefreshCw,
  Package, Lock, ArrowRight, Cpu, RotateCcw, ShieldAlert,
} from 'lucide-react'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const WORKFLOW_STEPS = [
  { index: 1,  id: 'scan',               label: 'Detect & Classify CVITs',      agent: 'ScannerAgent',     icon: Shield   },
  { index: 2,  id: 'collect',            label: 'Requirement Collection',        agent: 'RequirementAgent', icon: Database },
  { index: 3,  id: 'enrich',             label: 'Auto-Enrichment (NVD)',         agent: 'EnrichmentAgent',  icon: Zap      },
  { index: 4,  id: 'awaiting_approval',  label: 'Approval Workflow',             agent: 'ApprovalAgent',    icon: Users,   human: true },
  { index: 5,  id: 'handover',           label: 'Handover to Expert',            agent: 'HandoverAgent',    icon: Users,   human: true },
  { index: 6,  id: 'work_package',       label: 'Work Package + Fix PR',         agent: 'WorkPackageAgent', icon: FileText },
  { index: 7,  id: 'awaiting_execution', label: 'Handover to DevOps',            agent: 'ExecutionAgent',   icon: Users,   human: true },
  { index: 8,  id: 'monitor',            label: 'Agent Monitors AKS Deploy',     agent: 'MonitorAgent',     icon: Activity },
  { index: 9,  id: 'close',             label: 'Close SNOW + Validate',          agent: 'ClosureAgent',     icon: CheckCircle2 },
  { index: 10, id: 'kb_update',          label: 'Knowledge Base Update',         agent: 'KBAgent',          icon: FileText },
]

const SEV_BADGE = { CRITICAL: 'bg-red-600 text-white', HIGH: 'bg-orange-500 text-white', MEDIUM: 'bg-amber-500 text-white', LOW: 'bg-blue-500 text-white' }
const LOG_COLOR = { thinking: 'text-gray-400', tool_call: 'text-humana-teal', tool_result: 'text-humana-green', action: 'text-blue-600', complete: 'text-gray-800', progress: 'text-amber-600', waiting: 'text-amber-500', created: 'text-humana-green', summary: 'text-gray-800', validated: 'text-humana-green', error: 'text-red-600' }
const AGENT_COLOR = { ScannerAgent: 'text-red-600', EnrichmentAgent: 'text-amber-600', WorkPackageAgent: 'text-purple-600', MonitorAgent: 'text-blue-600', KBAgent: 'text-humana-green' }

// ─── Stage Badge ──────────────────────────────────────────────────────────────
function StageBadge({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
      done   ? 'bg-humana-green/10 border-humana-green/40 text-humana-green' :
      active ? 'bg-humana-navy/10  border-humana-navy/30  text-humana-navy' :
               'bg-gray-50 border-gray-200 text-gray-400'
    }`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${done ? 'bg-humana-green text-white' : active ? 'bg-humana-navy text-white' : 'bg-gray-200 text-gray-500'}`}>
        {done ? '✓' : n}
      </span>
      {label}
    </div>
  )
}

// ─── CVE Table ────────────────────────────────────────────────────────────────
function CveTable({ cves }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500 font-semibold text-left">
            <th className="px-3 py-2">Component</th>
            <th className="px-3 py-2">Violation ID</th>
            <th className="px-3 py-2">CVSS</th>
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">Impact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cves.map(c => (
            <tr key={c.cve} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-mono font-semibold text-humana-navy">{c.pkg}</td>
              <td className="px-3 py-2 font-mono text-humana-teal">{c.cve}</td>
              <td className="px-3 py-2 font-bold text-red-600">{c.cvss}</td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${SEV_BADGE[c.severity]}`}>{c.severity}</span></td>
              <td className="px-3 py-2 text-gray-600">{c.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Agent Step Card ──────────────────────────────────────────────────────────
function AgentStepCard({ step, isActive, isDone, latestLog, stepArtifacts }) {
  const Icon = step.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border transition-all ${
        isActive ? 'bg-white border-humana-green/50 shadow-md' :
        isDone   ? 'bg-white border-gray-200' :
                   'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isDone   ? 'bg-humana-green' :
          isActive ? 'bg-humana-green/10 border-2 border-humana-green' :
                     'bg-gray-200'
        }`}>
          {isDone   ? <CheckCircle2 size={15} className="text-white" /> :
           isActive ? <Loader2 size={13} className="text-humana-green animate-spin" /> :
                      <Icon size={13} className="text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-xs font-bold ${AGENT_COLOR[step.agent] || 'text-humana-teal'}`}>{step.agent}</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-600 font-medium">{step.label}</span>
            {step.human && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">👤 Human-in-loop</span>}
            {isActive && <span className="ml-auto text-xs text-humana-green font-bold animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-humana-green inline-block" />Live</span>}
            {isDone   && <span className="ml-auto text-xs text-humana-green font-semibold">✓ Complete</span>}
          </div>
          {latestLog && (
            <div className={`text-xs mt-1.5 font-mono leading-relaxed line-clamp-2 ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
              {isActive && <span className="text-humana-green mr-1">▶</span>}
              {latestLog.message}
            </div>
          )}
          {isDone && stepArtifacts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {stepArtifacts.map((a, i) => (
                <a key={i} href={a.url || '#'} target="_blank" rel="noreferrer"
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-semibold hover:shadow-sm transition-all ${a.style}`}>
                  {a.icon}{a.label}<ExternalLink size={9} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CVITWorkflowAgent() {
  // ── Stage 1 state
  const [packages, setPackages]   = useState(null)
  const [loadingPkgs, setLoadingPkgs] = useState(false)
  const [pods, setPods]           = useState([])
  const [injecting, setInjecting] = useState(false)
  const [injected, setInjected]   = useState(null)   // { pr, cves }
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed]   = useState(null)   // { merged, run }
  const [actionsRuns, setActionsRuns] = useState([])

  // ── Stage 2 state
  const [creatingP1, setCreatingP1] = useState(false)
  const [p1Incident, setP1Incident] = useState(null)
  const [polling, setPolling]       = useState(false)
  const [pollCount, setPollCount]   = useState(0)
  const [cvitId, setCvitId]         = useState(null)   // e.g. CVIT-20260523-0003
  const [runSeq, setRunSeq]         = useState(null)   // sequence number 1, 2, 3…
  const [scenario, setScenario]     = useState(null)   // scenario id

  // ── Stage 3 (CVIT workflow) state
  const [workflowId, setWorkflowId]   = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStates, setStepStates]   = useState({})
  const [logs, setLogs]               = useState([])
  const [findings, setFindings]       = useState([])
  const [humanPending, setHumanPending] = useState(null)
  const [progress, setProgress]       = useState(0)
  const [artifacts, setArtifacts]     = useState({})
  const [isRunning, setIsRunning]     = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [approverName, setApproverName] = useState('security-manager')
  const [p1Closed, setP1Closed]       = useState(null)   // { url, number, notes }

  const [stepLogs, setStepLogs] = useState({})   // { stepId: latestLogEntry }

  const esRef           = useRef(null)
  const pollEsRef       = useRef(null)
  const logEndRef       = useRef(null)
  const stage3Ref       = useRef(null)
  const activeStepIdRef = useRef(null)

  const stage = isRunning || workflowId ? 3 : p1Incident ? 2 : injected ? 2 : 1
  const stage1Done = !!deployed
  const stage2Done = !!workflowId
  const stage3Done = isCompleted

  // Auto-scroll logs
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  // Load initial package state
  useEffect(() => {
    setLoadingPkgs(true)
    fetch(`${API_URL}/api/cvit/app-packages`)
      .then(r => r.json()).then(d => setPackages(d.pkg)).catch(() => {})
      .finally(() => setLoadingPkgs(false))

    fetch(`${API_URL}/api/cvit/aks-pods?state=clean`)
      .then(r => r.json()).then(d => setPods(d.pods || [])).catch(() => {})

    fetch(`${API_URL}/api/cvit/actions-status`)
      .then(r => r.json()).then(d => setActionsRuns(d.runs || [])).catch(() => {})
  }, [])

  // Poll actions status after deploy
  useEffect(() => {
    if (!deployed) return
    const iv = setInterval(() => {
      fetch(`${API_URL}/api/cvit/actions-status`)
        .then(r => r.json()).then(d => setActionsRuns(d.runs || [])).catch(() => {})
    }, 8000)
    return () => clearInterval(iv)
  }, [deployed])

  // ── Inject vulnerability ───────────────────────────────────────────────────
  const injectVulnerability = async () => {
    setInjecting(true)
    try {
      const r = await fetch(`${API_URL}/api/cvit/inject-vulnerability`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const d = await r.json()
      setInjected(d)
      if (d.cvitId)   setCvitId(d.cvitId)
      if (d.sequence) setRunSeq(d.sequence)
      if (d.scenario) setScenario(d.scenario)
      // Refresh packages to show vulnerable state
      fetch(`${API_URL}/api/cvit/app-packages`).then(r => r.json()).then(d => setPackages(d.pkg)).catch(() => {})
    } finally { setInjecting(false) }
  }

  // ── Deploy to AKS ─────────────────────────────────────────────────────────
  const deployVulnerable = async () => {
    setDeploying(true)
    fetch(`${API_URL}/api/cvit/aks-pods?state=deploying`).then(r => r.json()).then(d => setPods(d.pods || [])).catch(() => {})
    try {
      const r = await fetch(`${API_URL}/api/cvit/deploy-vulnerable`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prNumber: injected?.pr?.number, branch: injected?.pr?.branch }),
      })
      const d = await r.json()
      setDeployed(d)
      // After short delay show pods running (vulnerable)
      setTimeout(() => {
        fetch(`${API_URL}/api/cvit/aks-pods?state=vulnerable`).then(r => r.json()).then(d => setPods(d.pods || [])).catch(() => {})
      }, 3000)
    } finally { setDeploying(false) }
  }

  // ── Create P1 Incident ────────────────────────────────────────────────────
  const createP1 = async () => {
    setCreatingP1(true)
    try {
      const r = await fetch(`${API_URL}/api/cvit/create-p1-incident`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cves: injected?.cves || [], cluster: 'humana-prod-aks', prUrl: injected?.pr?.url, vulnImage: injected?.vulnImage, fixImage: injected?.fixImage }),
      })
      const d = await r.json()
      setP1Incident(d.incident)

      // Start SNOW polling immediately
      startPolling(d.incident)
    } finally { setCreatingP1(false) }
  }

  // ── Start SNOW polling ────────────────────────────────────────────────────
  const startPolling = async (incident) => {
    setPolling(true)
    setPollCount(0)

    await fetch(`${API_URL}/api/cvit/start-snow-polling`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentSysId: incident.sys_id, incidentNumber: incident.number, incidentUrl: incident.url, cves: injected?.cves || [], cvitId, scenario }),
    })

    // Connect SSE for polling updates
    if (pollEsRef.current) pollEsRef.current.close()
    const es = new EventSource(`${API_URL}/api/cvit/poll-stream/${incident.sys_id}`)
    pollEsRef.current = es

    es.addEventListener('poll', () => setPollCount(n => n + 1))
    es.addEventListener('workflow_started', (e) => {
      const d = JSON.parse(e.data)
      setPolling(false)
      es.close()
      connectWorkflowSSE(d.workflowId)
      setWorkflowId(d.workflowId)
      setTimeout(() => stage3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    })
  }

  // ── Connect workflow SSE ──────────────────────────────────────────────────
  const connectWorkflowSSE = (wfId) => {
    if (esRef.current) esRef.current.close()
    const es = new EventSource(`${API_URL}/api/cvit/stream/${wfId}`)
    esRef.current = es

    const handle = (event, data) => {
      switch (event) {
        case 'step':
          setCurrentStep(data.index)
          activeStepIdRef.current = data.step
          setStepStates(prev => ({ ...prev, [data.step]: 'active' }))
          if (data.index > 1) {
            const prev = WORKFLOW_STEPS[data.index - 2]
            if (prev) setStepStates(p => ({ ...p, [prev.id]: 'done' }))
          }
          break
        case 'log':
          setLogs(prev => [...prev.slice(-199), data])
          if (activeStepIdRef.current) {
            setStepLogs(prev => ({ ...prev, [activeStepIdRef.current]: data }))
          }
          break
        case 'human_required': setHumanPending(data); break
        case 'approved': setHumanPending(null); setStepStates(p => ({ ...p, awaiting_approval: 'done' })); break
        case 'execution_confirmed': setHumanPending(null); setStepStates(p => ({ ...p, awaiting_execution: 'done' })); break
        case 'rejected': setStepStates(p => ({ ...p, awaiting_approval: 'error' })); setIsRunning(false); break
        case 'progress': setProgress(data.pct || 0); break
        case 'work_package_ready': setArtifacts(prev => ({ ...prev, incident: data.incident, pr: data.pr })); break
        case 'p1_closed': setP1Closed(data); break
        case 'kb_ready':
          setArtifacts(p => ({ ...p, kb: data.kbArticle }))
          setStepStates(p => ({ ...p, kb_update: 'done' }))
          setIsCompleted(true)
          setIsRunning(false)
          break
        case 'state':
          if (data.findings?.length) setFindings(data.findings)
          if (data.changeTicket)   setArtifacts(p => ({ ...p, change: data.changeTicket }))
          if (data.incidentTicket) setArtifacts(p => ({ ...p, incident: data.incidentTicket }))
          if (data.githubPR)       setArtifacts(p => ({ ...p, pr: data.githubPR }))
          if (data.kbArticle)      setArtifacts(p => ({ ...p, kb: data.kbArticle }))
          // Restore step timeline position on reconnect
          if (data.stepIndex > 0) {
            setCurrentStep(data.stepIndex)
            activeStepIdRef.current = data.step
            const doneSteps = {}
            WORKFLOW_STEPS.forEach(s => { if (s.index < data.stepIndex) doneSteps[s.id] = 'done' })
            setStepStates(p => ({ ...p, ...doneSteps, [data.step]: 'active' }))
            setIsRunning(true)
          }
          // Restore approval panel if workflow is paused awaiting human approval (e.g. SSE reconnect)
          if (data.step === 'awaiting_approval' && data.changeTicket && !data.humanApproval) {
            setHumanPending({ action: 'approve', changeTicket: data.changeTicket, cve: data.enrichedCVE || {} })
          }
          if (data.step === 'completed') {
            setIsCompleted(true)
            setIsRunning(false)
            setStepStates(p => ({ ...p, kb_update: 'done' }))
          }
          break
        case 'error':
          setLogs(prev => [...prev, { ts: new Date().toISOString(), agent: 'System', type: 'error', message: data.message }])
          setIsRunning(false)
          break
        default: break
      }
    }

    ['step','log','human_required','approved','execution_confirmed','rejected','progress','work_package_ready','p1_closed','state','error','started']
      .forEach(evt => es.addEventListener(evt, (e) => { try { handle(evt, JSON.parse(e.data)) } catch {} }))
    es.addEventListener('started', () => setIsRunning(true))
  }

  const handleApprove = async () => {
    await fetch(`${API_URL}/api/cvit/approve/${workflowId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvedBy: approverName }) })
    setHumanPending(null)
  }
  const handleReject = async () => {
    await fetch(`${API_URL}/api/cvit/reject/${workflowId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Rejected during demo' }) })
    setHumanPending(null); setIsRunning(false)
  }
  const handleExecute = async () => {
    await fetch(`${API_URL}/api/cvit/execute/${workflowId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmedBy: 'devops-engineer' }) })
    setHumanPending(null)
  }

  const latestRun = actionsRuns[0]
  const vulnDeps = injected?.cves || []
  const isVulnerable = vulnDeps.length > 0

  const getStepArtifacts = (step) => {
    const arts = []
    if (step.id === 'enrich' && findings.length > 0) {
      arts.push({ url: null, icon: <Shield size={10} />, label: `${findings.length} CVEs enriched`, style: 'bg-red-50 border-red-200 text-red-700 cursor-default' })
    }
    if (step.id === 'awaiting_approval' && artifacts.change?.url) {
      arts.push({ url: artifacts.change.url, icon: <FileText size={10} />, label: artifacts.change.number, style: 'bg-amber-50 border-amber-200 text-amber-700' })
    }
    if (step.id === 'work_package') {
      if (artifacts.incident?.url) arts.push({ url: artifacts.incident.url, icon: <Shield size={10} />, label: artifacts.incident.number, style: 'bg-blue-50 border-blue-200 text-blue-700' })
      if (artifacts.pr?.url && artifacts.pr.url !== '#') {
        arts.push({ url: artifacts.pr.url, icon: <GitPullRequest size={10} />, label: `PR #${artifacts.pr.number}`, style: 'bg-purple-50 border-purple-200 text-purple-700' })
        arts.push({ url: `${artifacts.pr.url}/files`, icon: <GitBranch size={10} />, label: 'Code Diff', style: 'bg-indigo-50 border-indigo-200 text-indigo-700' })
      }
    }
    if (step.id === 'awaiting_execution' && artifacts.pr?.url && artifacts.pr.url !== '#') {
      arts.push({ url: artifacts.pr.url, icon: <GitPullRequest size={10} />, label: `Review PR #${artifacts.pr.number}`, style: 'bg-purple-50 border-purple-200 text-purple-700' })
    }
    if (step.id === 'monitor' && latestRun?.url) {
      arts.push({ url: latestRun.url, icon: <Activity size={10} />, label: `AKS Deploy ${latestRun.conclusion === 'success' ? '✓' : '⟳'}`, style: 'bg-gray-100 border-gray-300 text-gray-700' })
    }
    if (step.id === 'close' && p1Incident?.url) {
      arts.push({ url: p1Incident.url, icon: <Bell size={10} />, label: `${p1Incident.number} Closed`, style: 'bg-green-50 border-green-200 text-humana-green' })
    }
    if (step.id === 'kb_update' && artifacts.kb?.url) {
      arts.push({ url: artifacts.kb.url, icon: <FileText size={10} />, label: `KB ${artifacts.kb.number}`, style: 'bg-green-50 border-green-200 text-humana-green' })
    }
    return arts
  }

  return (
    <div className="min-h-screen bg-humana-light">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Shield size={12} className="text-red-500" />UC #36 · Security Engineering
            </div>
            <h1 className="text-xl font-bold text-humana-navy">Container Vulnerability Intelligent Remediation (CVIT)</h1>
            <p className="text-sm text-gray-500 mt-0.5">End-to-end: inject EOL runtime → AKS deploy → ServiceNow P1 → 10-step agent remediation</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-humana-green px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-humana-green animate-pulse" />GitHub Live
            </span>
            <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Azure AKS
            </span>
            <span className="flex items-center gap-1.5 bg-humana-teal/10 border border-humana-teal/30 text-humana-teal px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-humana-teal animate-pulse" />ServiceNow Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Stage progress bar ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 flex-wrap">
        <StageBadge n={1} label="Inject EOL Runtime"        active={stage === 1} done={stage1Done} />
        <ArrowRight size={14} className="text-gray-300 shrink-0" />
        <StageBadge n={2} label="Create ServiceNow P1"     active={stage === 2 && !stage2Done} done={stage2Done} />
        <ArrowRight size={14} className="text-gray-300 shrink-0" />
        <StageBadge n={3} label="CVIT Multi-Agent Workflow" active={stage === 3 && !stage3Done} done={stage3Done} />
      </div>

      {/* ── Scale-of-Problem Stats Bar ──────────────────────────────────────── */}
      <div className="bg-humana-navy border-b border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
          <span className="text-white/50 text-xs font-semibold uppercase tracking-widest mr-2">Humana · Live as of May 26, 2026</span>
          {[
            { label: 'Open Tickets',           value: '6,189',  sub: 'total backlog',         color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
            { label: 'Open Avg / Month',        value: '432',    sub: 'monthly run rate',      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
            { label: 'Closed This Month',       value: '243',    sub: 'May 2026',              color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
            { label: 'Closed Avg / Month',      value: '316.85', sub: 'historical avg',        color: 'text-humana-green', bg: 'bg-green-500/10 border-green-500/30' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2.5 border rounded-lg px-3 py-1.5 ${s.bg}`}>
              <div>
                <div className={`text-base font-black leading-none ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-white/40 leading-tight mt-0.5">{s.sub}</div>
              </div>
              <div className="text-white/40 text-[10px] font-semibold leading-tight max-w-20">{s.label}</div>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-white/40 italic hidden lg:block">
            At current close rate, backlog clears in <span className="text-white/70 font-semibold">~14 months</span> without AI
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* STAGE 1 — Inject Vulnerability & Deploy to AKS                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="card-humana overflow-hidden">
          <div className="bg-humana-navy px-5 py-3 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black">1</div>
            <span className="text-white font-bold text-sm">Inject EOL Runtime into AKS App</span>
            {cvitId && (
              <span className="ml-2 bg-white/10 border border-white/20 text-white/90 text-xs font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{cvitId} · Run #{runSeq}
              </span>
            )}
            {stage1Done && <span className="ml-auto text-humana-green text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} />Complete</span>}
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Current app state */}
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Server size={12} />Current App — aks-nodeapp-demo
              </div>

              {/* Pods */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                  <Activity size={11} />AKS Pods — claims-processing
                </div>
                {pods.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <span className="font-mono text-gray-500 truncate max-w-36">{p.name}</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                      p.status === 'Running' ? 'bg-green-100 text-green-700' :
                      p.status === 'Pending' || p.status === 'ContainerCreating' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>

              {/* Container Runtime */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                  <Package size={11} />Container Runtime (app/Dockerfile)
                </div>
                {injected?.vulnImage ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-red-50 border border-red-200">
                      <span className="font-mono text-gray-500">FROM</span>
                      <span className="font-mono text-red-600 font-bold">{injected.vulnImage} ⚠</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold px-1">
                      <AlertTriangle size={10} />EOL Runtime — Compliance Violation
                    </div>
                    <div className="text-xs text-gray-400 px-1">
                      Fix target: <span className="font-mono text-humana-green">{injected.fixImage || 'node:20-alpine'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-white border border-gray-100">
                      <span className="font-mono text-gray-500">FROM</span>
                      <span className="font-mono text-humana-green font-semibold">node:20-alpine</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-humana-green font-semibold px-1">
                      <CheckCircle2 size={10} />LTS — Supported &amp; Compliant
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* GitHub & Actions */}
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <GitBranch size={12} />GitHub — prashant-vashisth/aks-nodeapp-demo
              </div>

              <a href="https://github.com/prashant-vashisth/aks-nodeapp-demo" target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-humana-teal hover:underline font-medium">
                <ExternalLink size={11} />View repo on GitHub
              </a>

              {/* Inject button */}
              {!injected ? (
                <button onClick={injectVulnerability} disabled={injecting}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                  {injecting ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  {injecting ? 'Creating PR...' : 'Inject EOL Runtime → GitHub PR'}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-700 mb-2">
                      <AlertTriangle size={12} />Vulnerability PR Created
                    </div>
                    <a href={injected.pr?.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-humana-teal hover:underline font-semibold">
                      <GitPullRequest size={11} />PR #{injected.pr?.number} — {injected.pr?.title?.slice(0, 40)}…
                      <ExternalLink size={10} />
                    </a>
                    <div className="text-xs text-gray-500 mt-1">Branch: <span className="font-mono">{injected.pr?.branch}</span></div>
                  </div>

                  {!deployed ? (
                    <button onClick={deployVulnerable} disabled={deploying}
                      className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                      {deploying ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                      {deploying ? 'Merging & Deploying...' : 'Merge PR → Deploy to AKS'}
                    </button>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs">
                      <div className="font-bold text-orange-700 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 size={11} />PR Merged — AKS Deployment Triggered
                      </div>
                      {deployed.run && (
                        <a href={deployed.run.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-humana-teal hover:underline">
                          <ExternalLink size={10} />View GitHub Actions run
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Latest Actions runs */}
              {actionsRuns.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Recent Actions Runs</div>
                  {actionsRuns.slice(0, 3).map(run => (
                    <a key={run.id} href={run.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs py-1 hover:text-humana-navy">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${run.conclusion === 'success' ? 'bg-green-500' : run.status === 'in_progress' ? 'bg-amber-400 animate-pulse' : run.conclusion === 'failure' ? 'bg-red-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600 truncate flex-1">{run.commitMsg || run.name}</span>
                      <span className="text-gray-400 shrink-0">{run.status === 'in_progress' ? 'running' : run.conclusion || run.status}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* CVE summary */}
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Lock size={12} />Compliance Violations Detected
              </div>
              {injected?.cves ? (
                <CveTable cves={injected.cves} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-xs py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Click "Inject Vulnerability" to simulate<br />an EOL runtime compliance violation
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* STAGE 2 — Create ServiceNow P1                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {(stage1Done || stage === 2) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-humana overflow-hidden">
              <div className="bg-gradient-to-r from-orange-700 to-orange-900 px-5 py-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black">2</div>
                <span className="text-white font-bold text-sm">ServiceNow P1 Incident — Automatic Detection</span>
                {polling && <LiveIndicator label="POLLING SNOW" color="teal" />}
                {stage2Done && <span className="ml-auto text-humana-green text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} />Agents dispatched</span>}
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-4">
                  {!p1Incident ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        EOL runtime build is running on AKS. Click below to create a real <strong>P1 Compliance Incident</strong> in ServiceNow — the CVIT polling agent will detect it and automatically trigger the remediation workflow.
                      </p>
                      <button onClick={createP1} disabled={creatingP1 || !deployed}
                        className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors">
                        {creatingP1 ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                        {creatingP1 ? 'Creating P1 in ServiceNow...' : 'Create ServiceNow P1 Compliance Incident'}
                      </button>
                      {!deployed && <p className="text-xs text-gray-400 text-center">Deploy to AKS first (Stage 1)</p>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-red-700 font-bold text-sm">P1 Incident Created</span>
                          <span className="ml-auto text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{p1Incident.priority}</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-20">Number:</span>
                            <span className="font-mono font-bold text-red-700">{p1Incident.number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-20">State:</span>
                            <span className="font-semibold text-gray-800">{p1Incident.state}</span>
                          </div>
                          {p1Incident.url && (
                            <a href={p1Incident.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-humana-teal hover:underline font-semibold mt-2">
                              <ExternalLink size={10} />View in ServiceNow
                            </a>
                          )}
                        </div>
                      </div>

                      {polling && (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs">
                          <Loader2 size={14} className="animate-spin text-amber-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-amber-700">Polling agent watching ServiceNow...</div>
                            <div className="text-amber-600">Poll {pollCount} — will auto-trigger CVIT workflow when P1 confirmed</div>
                          </div>
                        </div>
                      )}

                      {workflowId && !polling && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs">
                          <CheckCircle2 size={14} className="text-humana-green shrink-0" />
                          <div className="font-semibold text-humana-green">P1 ticket confirmed — CVIT agents dispatched automatically ↓</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-xs">
                  <div className="font-bold text-gray-600 mb-3 uppercase tracking-widest">P1 Incident Details</div>
                  <div className="space-y-2 text-gray-600">
                    <div><span className="font-semibold">Instance:</span> dev283388.service-now.com</div>
                    <div><span className="font-semibold">Priority:</span> P1 — Critical Compliance</div>
                    <div><span className="font-semibold">Category:</span> Security / EOL Runtime</div>
                    <div><span className="font-semibold">Cluster:</span> humana-prod-aks</div>
                    <div><span className="font-semibold">Namespace:</span> claims-processing</div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="font-semibold mb-1">Violations detected:</div>
                      {(injected?.cves || [{ pkg: 'node:16-alpine', cve: 'EOL-2023-NODE16', cvss: 9.1 }]).map(c => (
                        <div key={c.cve} className="flex items-center gap-2 py-0.5">
                          <span className="text-red-500">●</span>
                          <span className="font-mono">{c.pkg}</span>
                          <span className="text-gray-400">{c.cve}</span>
                          <span className="font-bold text-red-600">CVSS {c.cvss}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* STAGE 3 — CVIT Multi-Agent Workflow                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {workflowId && (
            <motion.div ref={stage3Ref} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-humana overflow-hidden">
              <div className="bg-gradient-to-r from-humana-navy to-[#003d7a] px-5 py-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black">3</div>
                <span className="text-white font-bold text-sm">CVIT Multi-Agent Orchestration — LangChain + Claude Opus 4</span>
                {cvitId && (
                  <span className="bg-white/10 border border-white/20 text-white/90 text-xs font-mono px-2 py-0.5 rounded-full">{cvitId}</span>
                )}
                {isRunning && <LiveIndicator label="AGENTS RUNNING" color="green" />}
                {isCompleted && <span className="ml-auto text-humana-green text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} />All 10 steps complete</span>}
              </div>

              {/* CVE findings strip */}
              {findings.length > 0 && (
                <div className="bg-red-50 border-b border-red-100 px-4 py-3">
                  <div className="text-xs font-bold text-red-700 mb-2">CVITs Detected — {findings.length} vulnerabilities</div>
                  <div className="flex flex-wrap gap-2">
                    {findings.map(f => (
                      <div key={f.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-red-200 text-xs shadow-sm">
                        <span className={`font-black px-1.5 py-0.5 rounded text-xs ${SEV_BADGE[f.severity]}`}>{f.severity}</span>
                        <span className="font-mono font-semibold text-humana-navy">{f.id}</span>
                        <span className="text-gray-500">{f.component} {f.version}</span>
                        <ChevronRight size={10} className="text-humana-green" />
                        <span className="text-humana-green font-semibold">{f.patchVersion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Live Artifacts bar — all clickable links */}
              {(artifacts.change || artifacts.incident || artifacts.pr || artifacts.kb || p1Incident) && (
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Live Artifacts — click to open</div>
                  <div className="flex flex-wrap gap-2">
                    {/* P1 Incident (Stage 2) */}
                    {p1Incident && (
                      <a href={p1Incident.url || '#'} target="_blank" rel="noreferrer"
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs border transition-colors hover:shadow-sm ${p1Closed ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300 hover:bg-red-100'}`}>
                        <Bell size={12} className={p1Closed ? 'text-humana-green' : 'text-red-600'} />
                        <span className={`font-semibold ${p1Closed ? 'text-humana-green' : 'text-red-700'}`}>{p1Incident.number}</span>
                        <span className="text-gray-500">P1 Incident</span>
                        <span className={`font-bold ${p1Closed ? 'text-humana-green' : 'text-red-500'}`}>{p1Closed ? '✓ Closed' : '● Open'}</span>
                        <ExternalLink size={9} className="text-gray-400" />
                      </a>
                    )}
                    {/* Change Request */}
                    {artifacts.change && (
                      <a href={artifacts.change.url || '#'} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg px-3 py-1.5 text-xs transition-colors hover:shadow-sm">
                        <FileText size={12} className="text-amber-600" />
                        <span className="text-amber-700 font-semibold">{artifacts.change.number}</span>
                        <span className="text-gray-500">Change Request</span>
                        <span className={`font-semibold ${artifacts.change.source?.includes('live') ? 'text-humana-green' : 'text-gray-400'}`}>{artifacts.change.source?.includes('live') ? '● Live' : '○ Demo'}</span>
                        <ExternalLink size={9} className="text-gray-400" />
                      </a>
                    )}
                    {/* Work Package Incident */}
                    {artifacts.incident && (
                      <a href={artifacts.incident.url || '#'} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg px-3 py-1.5 text-xs transition-colors hover:shadow-sm">
                        <Shield size={12} className="text-blue-600" />
                        <span className="text-blue-700 font-semibold">{artifacts.incident.number}</span>
                        <span className="text-gray-500">Work Package</span>
                        <span className={`font-semibold ${artifacts.incident.source?.includes('live') ? 'text-humana-green' : 'text-gray-400'}`}>{artifacts.incident.source?.includes('live') ? '● Live' : '○ Demo'}</span>
                        <ExternalLink size={9} className="text-gray-400" />
                      </a>
                    )}
                    {/* Fix PR + Code Diff */}
                    {artifacts.pr && artifacts.pr.url !== '#' && (
                      <>
                        <a href={artifacts.pr.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg px-3 py-1.5 text-xs transition-colors hover:shadow-sm">
                          <GitPullRequest size={12} className="text-purple-600" />
                          <span className="text-purple-700 font-semibold">PR #{artifacts.pr.number}</span>
                          <span className="text-gray-500">Fix PR</span>
                          <span className={`font-semibold ${artifacts.pr.source === 'github_live' ? 'text-humana-green' : 'text-gray-400'}`}>{artifacts.pr.source === 'github_live' ? '● Live' : '○ Demo'}</span>
                          <ExternalLink size={9} className="text-gray-400" />
                        </a>
                        <a href={`${artifacts.pr.url}/files`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg px-3 py-1.5 text-xs transition-colors hover:shadow-sm">
                          <GitBranch size={12} className="text-indigo-600" />
                          <span className="text-indigo-700 font-semibold">Code Diff</span>
                          <span className="text-gray-500">See AI changes</span>
                          <ExternalLink size={9} className="text-gray-400" />
                        </a>
                      </>
                    )}
                    {/* KB Article */}
                    {artifacts.kb && (
                      <a href={artifacts.kb.url || '#'} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg px-3 py-1.5 text-xs transition-colors hover:shadow-sm">
                        <FileText size={12} className="text-humana-green" />
                        <span className="text-humana-green font-semibold">{artifacts.kb.number}</span>
                        <span className="text-gray-500">KB Article</span>
                        <ExternalLink size={9} className="text-gray-400" />
                      </a>
                    )}
                    {/* Latest GH Actions deploy run */}
                    {latestRun?.url && (
                      <a href={latestRun.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 bg-gray-100 border border-gray-300 hover:bg-gray-200 rounded-lg px-3 py-1.5 text-xs transition-colors hover:shadow-sm">
                        <Activity size={12} className={latestRun.status === 'in_progress' ? 'text-amber-500 animate-pulse' : 'text-gray-500'} />
                        <span className="text-gray-700 font-semibold">AKS Deploy</span>
                        <span className={`font-semibold ${latestRun.conclusion === 'success' ? 'text-humana-green' : latestRun.status === 'in_progress' ? 'text-amber-600' : latestRun.conclusion === 'failure' ? 'text-red-500' : 'text-gray-400'}`}>
                          {latestRun.status === 'in_progress' ? '⟳ Running' : latestRun.conclusion === 'success' ? '✓ Done' : latestRun.conclusion === 'failure' ? '✗ Failed' : latestRun.status}
                        </span>
                        <ExternalLink size={9} className="text-gray-400" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Horizontal 10-step pipeline tracker */}
              <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center">
                {WORKFLOW_STEPS.map((step, i) => {
                  const state    = stepStates[step.id]
                  const isActive = currentStep === step.index || state === 'active'
                  const isDone   = state === 'done' || (currentStep > step.index && currentStep > 0)
                  const isErr    = state === 'error'
                  const lineGreen = isDone && i < WORKFLOW_STEPS.length - 1
                  return (
                    <div key={step.id} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-0.5 shrink-0" title={step.label}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition-all ${
                          isDone   ? 'bg-humana-green text-white' :
                          isActive ? 'border-2 border-humana-green bg-white' :
                          isErr    ? 'bg-red-500 text-white' :
                                     'bg-gray-100 text-gray-400'
                        }`}>
                          {isDone   ? <CheckCircle2 size={11} className="text-white" /> :
                           isActive ? <Loader2 size={10} className="text-humana-green animate-spin" /> :
                                      <span style={{ fontSize: '7px' }} className="leading-none">{step.agent.replace('Agent', '').slice(0, 4)}</span>}
                        </div>
                        <div className={`text-center leading-tight truncate max-w-14 ${
                          isDone ? 'text-humana-green' : isActive ? 'text-humana-green font-semibold' : 'text-gray-400'
                        }`} style={{ fontSize: '9px' }}>
                          {step.human ? <span className="text-amber-500">👤</span> : null}{step.agent.replace('Agent', '')}
                        </div>
                      </div>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div className={`flex-1 h-px mx-1 transition-colors ${lineGreen ? 'bg-humana-green' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex h-[calc(100vh-260px)] min-h-96">
                {/* CENTER — Agent Activity Feed */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                      <Loader2 size={32} className="text-gray-200 animate-spin" />
                      <div className="text-center">
                        <div className="text-gray-600 font-semibold text-sm">Workflow started</div>
                        <div className="text-gray-400 text-xs mt-1">Step 1 · ScannerAgent scanning claims-processing namespace...</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {WORKFLOW_STEPS.map(step => {
                        const state = stepStates[step.id]
                        const isActive = currentStep === step.index
                        const isDone = state === 'done'
                        if (!isActive && !isDone && state !== 'active') return null
                        return (
                          <AgentStepCard
                            key={step.id}
                            step={step}
                            isActive={isActive || state === 'active'}
                            isDone={isDone}
                            latestLog={stepLogs[step.id]}
                            stepArtifacts={getStepArtifacts(step)}
                          />
                        )
                      })}

                      {/* AKS rolling deploy progress inside monitor step */}
                      {progress > 0 && (
                        <div className="bg-white rounded-xl border border-blue-200 px-4 py-3">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-700 font-semibold flex items-center gap-1.5">
                              <Activity size={12} className="text-blue-500" />AKS Rolling Deployment
                            </span>
                            <span className={`font-bold ${progress === 100 ? 'text-humana-green' : 'text-blue-600'}`}>{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} className="h-full bg-humana-green rounded-full" />
                          </div>
                          {stepLogs['monitor'] && (
                            <div className="text-xs text-gray-500 font-mono mt-1.5 line-clamp-1">{stepLogs['monitor'].message}</div>
                          )}
                        </div>
                      )}

                      <div ref={logEndRef} />

                      {/* Collapsible raw logs */}
                      <details className="bg-white rounded-xl border border-gray-200 overflow-hidden text-xs">
                        <summary className="px-4 py-2.5 text-gray-500 cursor-pointer hover:text-gray-700 font-semibold flex items-center gap-2 select-none">
                          <RefreshCw size={11} />Full agent logs ({logs.length} entries)
                        </summary>
                        <div className="p-3 bg-gray-900 max-h-64 overflow-y-auto space-y-0.5 font-mono">
                          {logs.map((entry, i) => (
                            <div key={i} className="flex items-start gap-2 leading-relaxed">
                              <span className="text-gray-500 shrink-0 w-20 text-right">{new Date(entry.ts).toLocaleTimeString()}</span>
                              <span className={`font-bold shrink-0 w-28 truncate ${AGENT_COLOR[entry.agent] || 'text-cyan-400'}`}>[{entry.agent}]</span>
                              <span className={`shrink-0 w-20 ${LOG_COLOR[entry.type] || 'text-gray-400'}`}>{entry.type}</span>
                              <span className="text-gray-200 flex-1 break-all">{entry.message}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* RIGHT — human-in-loop + summary */}
                <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">
                  <div className="px-4 pt-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Human-in-Loop</div>

                  <AnimatePresence>
                    {humanPending?.action === 'approve' && (() => {
                      const cve       = humanPending.cve || {}
                      const cvss      = cve.cvss_score || cve.cvss || 0
                      const isHigh    = cvss >= 9
                      const riskLabel = isHigh ? 'CRITICAL' : cvss >= 7 ? 'HIGH' : 'MEDIUM'
                      const riskColor = isHigh ? 'bg-red-600 text-white' : cvss >= 7 ? 'bg-orange-500 text-white' : 'bg-amber-500 text-white'
                      const hipaaNS   = ['claims-processing', 'member-portal', 'pharmacy-services', 'auth-gateway']
                      const isHipaa   = hipaaNS.includes(cve.namespace)
                      const snowBase  = 'https://dev249496.service-now.com'
                      const chgUrl    = humanPending.changeTicket?.number
                        ? `${snowBase}/nav_to.do?uri=change_request.do?sysparm_query=number=${humanPending.changeTicket.number}`
                        : null
                      const summary   = cve.agentSummary || ''
                      return (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mx-3 mb-3 bg-amber-50 border border-amber-300 rounded-xl overflow-hidden">
                          {/* Header */}
                          <div className="px-4 py-2.5 bg-amber-100 border-b border-amber-200 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span className="text-amber-800 font-bold text-sm">Approval Required</span>
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${riskColor}`}>{riskLabel} {cvss}</span>
                          </div>

                          <div className="p-3 space-y-3">
                            {/* Change ticket link */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Change Request</span>
                              {chgUrl ? (
                                <a href={chgUrl} target="_blank" rel="noreferrer"
                                  className="font-mono text-amber-700 hover:underline flex items-center gap-1">
                                  {humanPending.changeTicket.number}<ExternalLink size={9} />
                                </a>
                              ) : (
                                <span className="font-mono text-amber-700">{humanPending.changeTicket?.number}</span>
                              )}
                            </div>

                            {/* CVE details card */}
                            <div className="bg-white rounded-lg border border-amber-200 p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-red-700">{cve.id || cve.cve_id}</span>
                                {cve.published && <span className="text-[10px] text-gray-400">{cve.published}</span>}
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {cve.description || 'Vulnerability requires upgrade to patched component version.'}
                              </p>
                              {cve.exploitability && (
                                <div className="flex items-center gap-3 pt-0.5 text-xs">
                                  <span className="text-gray-500">Exploit score: <span className="font-semibold text-orange-600">{cve.exploitability}/4.0</span></span>
                                </div>
                              )}
                            </div>

                            {/* Affected resources */}
                            <div className="space-y-1 text-xs">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Affected Resources</div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Component</span>
                                <span className="text-gray-800">
                                  <span className="text-red-500">{cve.component} {cve.version}</span>
                                  <span className="text-gray-400 mx-1">→</span>
                                  <span className="text-green-600">{cve.patchVersion}</span>
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Namespace</span>
                                <span className="text-humana-teal font-medium">{cve.namespace}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Pods at risk</span>
                                <span className="text-gray-800">3 pods</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Cluster</span>
                                <span className="text-gray-700 text-[10px]">humana-prod-aks-eastus</span>
                              </div>
                            </div>

                            {/* HIPAA compliance flag */}
                            {isHipaa && (
                              <div className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                                  <ShieldAlert size={11} />HIPAA-Regulated Namespace
                                </div>
                                <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">
                                  Unpatched CVE in <span className="font-semibold">{cve.namespace}</span> risks PHI exposure. Violates HIPAA §164.312(a)(1) technical safeguards.
                                </p>
                              </div>
                            )}

                            {/* AI risk assessment */}
                            {summary && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-wide">
                                  <Cpu size={10} />AI Risk Assessment
                                </div>
                                <p className="text-[11px] text-gray-700 leading-relaxed">
                                  {summary.length > 290 ? summary.slice(0, 290) + '…' : summary}
                                </p>
                              </div>
                            )}

                            {/* Rollback safety */}
                            <div className="flex items-start gap-1.5 text-[11px] text-gray-500">
                              <RotateCcw size={10} className="shrink-0 mt-0.5" />
                              <span>Zero-downtime rolling update. Auto-rollback on readiness probe failure.</span>
                            </div>

                            {/* Approver input */}
                            <input value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="Your name (approver)"
                              className="w-full bg-white border border-gray-300 text-gray-800 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-humana-green" />

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button onClick={handleApprove} className="flex-1 flex items-center justify-center gap-1.5 bg-humana-green hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg">
                                <ThumbsUp size={12} />Approve
                              </button>
                              <button onClick={handleReject} className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg">
                                <ThumbsDown size={12} />Reject
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })()}

                    {humanPending?.action === 'execute' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mx-3 mb-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-blue-700 font-bold text-sm">Confirm Execution</span>
                        </div>
                        <p className="text-xs text-gray-700 mb-3">AI-generated fix PR is ready. Review the code changes then confirm zero-downtime rolling deployment to AKS.</p>
                        {humanPending.pr && humanPending.pr.url !== '#' && (
                          <div className="flex flex-col gap-1.5 mb-3">
                            <a href={humanPending.pr.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-purple-600 hover:underline font-semibold">
                              <GitPullRequest size={11} />PR #{humanPending.pr.number} — View on GitHub <ExternalLink size={9} />
                            </a>
                            <a href={`${humanPending.pr.url}/files`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-indigo-600 hover:underline font-semibold">
                              <GitBranch size={11} />Review code diff — AI-generated fix <ExternalLink size={9} />
                            </a>
                          </div>
                        )}
                        <button onClick={handleExecute}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg">
                          <Play size={12} fill="currentColor" />Confirm — Deploy Fix to AKS
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isCompleted && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-3 mb-3 bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 size={16} className="text-humana-green" />
                        <span className="text-humana-green font-bold text-sm">Fully Remediated</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="text-humana-green font-semibold mb-2">✓ All 10 steps complete — zero downtime</div>
                        {p1Incident && (
                          <a href={p1Incident.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                            <Bell size={10} className="text-humana-green shrink-0" />
                            <span className="text-gray-500">P1 Incident</span>
                            <span className="font-mono text-gray-800 flex-1">{p1Incident.number}</span>
                            <span className="text-humana-green font-bold">Closed ↗</span>
                          </a>
                        )}
                        {artifacts.change && (
                          <a href={artifacts.change.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                            <FileText size={10} className="text-amber-600 shrink-0" />
                            <span className="text-gray-500">Change Req</span>
                            <span className="font-mono text-gray-800 flex-1">{artifacts.change.number}</span>
                            <ExternalLink size={9} className="text-gray-400" />
                          </a>
                        )}
                        {artifacts.incident && (
                          <a href={artifacts.incident.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                            <Shield size={10} className="text-blue-600 shrink-0" />
                            <span className="text-gray-500">Work Pkg</span>
                            <span className="font-mono text-gray-800 flex-1">{artifacts.incident.number}</span>
                            <ExternalLink size={9} className="text-gray-400" />
                          </a>
                        )}
                        {artifacts.pr && artifacts.pr.url !== '#' && (
                          <>
                            <a href={artifacts.pr.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                              <GitPullRequest size={10} className="text-purple-600 shrink-0" />
                              <span className="text-gray-500">Fix PR</span>
                              <span className="font-mono text-gray-800 flex-1">#{artifacts.pr.number}</span>
                              <ExternalLink size={9} className="text-gray-400" />
                            </a>
                            <a href={`${artifacts.pr.url}/files`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline pl-4">
                              <GitBranch size={10} className="text-indigo-500 shrink-0" />
                              <span className="text-indigo-600 font-semibold">View code diff ↗</span>
                            </a>
                          </>
                        )}
                        {artifacts.kb && (
                          <a href={artifacts.kb.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                            <FileText size={10} className="text-humana-green shrink-0" />
                            <span className="text-gray-500">KB Article</span>
                            <span className="font-mono text-gray-800 flex-1">{artifacts.kb.number}</span>
                            <ExternalLink size={9} className="text-gray-400" />
                          </a>
                        )}
                        {p1Closed?.notes && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="text-gray-500 font-semibold mb-1">AI Closure Notes:</div>
                            <div className="text-gray-600 leading-relaxed italic">{p1Closed.notes.slice(0, 200)}{p1Closed.notes.length > 200 ? '…' : ''}</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div className="px-4 pt-2 mt-auto">
                    <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Stack</div>
                    <div className="space-y-1.5 text-xs">
                      {[['Orchestrator','LangGraph StateGraph'],['LLM','Claude Opus 4.7'],['Tools','Claude Tool Use'],['CVE Data','NVD API — Live'],['Ticketing','ServiceNow Live'],['Source','GitHub Real PRs'],['Infra','Azure AKS']].map(([k,v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span className="text-gray-400">{k}</span>
                          <span className="text-gray-600 font-mono text-xs">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
