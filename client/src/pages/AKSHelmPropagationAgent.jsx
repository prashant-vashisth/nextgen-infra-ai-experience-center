import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, GitPullRequest, CheckCircle2, XCircle, Clock, Loader2,
  ChevronRight, Send, Bot, User, AlertTriangle, Shield, Play,
  RefreshCw, ExternalLink, Server, Package, ArrowRight, Check,
  Search, Zap, Terminal, Info, ChevronDown, ChevronUp,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Static cluster + repo lists ─────────────────────────────────────────────

const CLUSTER_ENV_STYLE = {
  production:       { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
  staging:          { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
  development:      { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',  dot: 'bg-blue-500'   },
  nonprod:          { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  'disaster-recovery': { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-500'   },
}

const INITIAL_CLUSTERS = [
  { name: 'prod-aks',    env: 'production',       nodeCount: 1, vmSize: 'Standard_DC2s_v3', nginxVersion: '4.8.3', provisioningState: 'Succeeded' },
  { name: 'staging-aks', env: 'staging',          nodeCount: 1, vmSize: 'Standard_DC2s_v3', nginxVersion: '4.8.3', provisioningState: 'Succeeded' },
  { name: 'dev-aks',     env: 'development',      nodeCount: 1, vmSize: 'Standard_DC2s_v3', nginxVersion: '4.8.3', provisioningState: 'Creating'  },
  { name: 'nonprod-aks', env: 'nonprod',          nodeCount: 1, vmSize: 'Standard_DC2s_v3', nginxVersion: '4.8.3', provisioningState: 'Creating'  },
  { name: 'dr-aks',      env: 'disaster-recovery', nodeCount: 1, vmSize: 'Standard_DC2s_v3', nginxVersion: '4.8.3', provisioningState: 'Creating' },
]

const CHART_OPTIONS = [
  {
    chart: 'nginx-ingress',
    label: 'NGINX Ingress Controller',
    fromVersion: '4.8.3',
    toVersion: '4.9.1',
    risk: 'low',
    riskColor: 'text-green-600 bg-green-50 border-green-200',
    repoCount: 5,
    assessment: 'Minor version bump. Improved SSL/TLS session handling, memory leak fix in upstream health checks, enhanced Prometheus metrics. No breaking changes. Zero-downtime rolling restart.',
    rollback: 'helm rollback nginx-ingress -n ingress-nginx',
  },
  {
    chart: 'cert-manager',
    label: 'Cert-Manager (TLS)',
    fromVersion: '1.13.3',
    toVersion: '1.14.0',
    risk: 'medium',
    riskColor: 'text-amber-600 bg-amber-50 border-amber-200',
    repoCount: 1,
    assessment: 'Minor version with new CRD fields for cross-namespace cert issuance. Existing certificates remain valid. CRD update must run before the chart upgrade — review CRD diff carefully before applying to production.',
    rollback: 'helm rollback cert-manager -n cert-manager',
  },
  {
    chart: 'kube-prometheus-stack',
    label: 'Prometheus + Grafana Stack',
    fromVersion: '55.5.0',
    toVersion: '56.6.0',
    risk: 'medium',
    riskColor: 'text-amber-600 bg-amber-50 border-amber-200',
    repoCount: 2,
    assessment: 'Prometheus 2.49 → 2.50 and Grafana 10.3 → 10.4. Alert rule format unchanged. Expect a 2–3 minute metrics gap during rolling restart of Prometheus pods. Grafana dashboards remain intact.',
    rollback: 'helm rollback kube-prometheus-stack -n monitoring',
  },
  {
    chart: 'cluster-autoscaler',
    label: 'Cluster Autoscaler',
    fromVersion: '9.34.0',
    toVersion: '9.36.0',
    risk: 'low',
    riskColor: 'text-green-600 bg-green-50 border-green-200',
    repoCount: 3,
    assessment: 'Patch update with improved scale-down delay logic and better handling of spot node interruptions. No configuration schema changes. Safe to apply during off-peak hours.',
    rollback: 'helm rollback cluster-autoscaler -n kube-system',
  },
  {
    chart: 'external-secrets',
    label: 'External Secrets Operator',
    fromVersion: '0.9.11',
    toVersion: '0.10.0',
    risk: 'high',
    riskColor: 'text-red-600 bg-red-50 border-red-200',
    repoCount: 2,
    assessment: 'Minor version bump but includes a breaking change: ClusterSecretStore v1beta1 deprecation. All ClusterSecretStores must be migrated to v1 before upgrade. Secrets will stop syncing on affected clusters until migration is complete.',
    rollback: 'helm rollback external-secrets -n external-secrets',
  },
]

const STEPS = ['Define Change', 'Scan Repos', 'Human Review', 'Propagate', 'Complete']

const QUICK_ASKS = [
  'Which clusters need updates right now?',
  'Update nginx-ingress to 4.9.1 across all clusters',
  'What is the risk for the cert-manager upgrade?',
  'Approve staging and dev, hold prod for now',
]

const INTRO_MSG = {
  role: 'assistant',
  content: "I'm the Multi-Cluster Update Agent. I orchestrate Helm chart updates across your 5 AKS clusters and 12 GitHub repos — with AI risk assessment, human-in-loop approval, and real PR creation. Select a component below and I'll scan all repos, identify what needs updating, walk you through approval, and propagate the change end-to-end.",
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AKSHelmPropagationAgent() {
  const [phase, setPhase] = useState('define')   // define | scanning | review | propagating | awaiting_merge | complete
  const [clusters, setClusters] = useState(INITIAL_CLUSTERS)
  const [scanResults, setScanResults] = useState([])
  const [scanLogs, setScanLogs] = useState([])
  const [prs, setPrs] = useState([])
  const [propLogs, setPropLogs] = useState([])
  const [approvals, setApprovals] = useState({})
  const [auditLog, setAuditLog] = useState([])
  const [messages, setMessages] = useState([INTRO_MSG])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedOption, setSelectedOption] = useState(CHART_OPTIONS[0])
  const [changeReq, setChangeReq] = useState({ chart: 'nginx-ingress', fromVersion: '4.8.3', toVersion: '4.9.1' })
  const [expandedCluster, setExpandedCluster] = useState(null)
  const [mergeStatus, setMergeStatus] = useState({})

  const chatScrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (messages.length > 1 && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  // Fetch real cluster state
  useEffect(() => {
    fetch(`${API_URL}/api/helm/clusters`)
      .then(r => r.json())
      .then(d => setClusters(d.clusters))
      .catch(() => {})
  }, [])

  const addAudit = useCallback((msg, type = 'info') => {
    setAuditLog(prev => [...prev, { ts: new Date().toLocaleTimeString(), msg, type }])
  }, [])

  // ── Scan ──────────────────────────────────────────────────────────────────

  const startScan = async () => {
    setPhase('scanning')
    setScanResults([])
    setScanLogs([])
    addAudit(`Starting repo scan for ${changeReq.chart} v${changeReq.fromVersion}`)

    const resp = await fetch(`${API_URL}/api/helm/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changeReq),
    })

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const found = []

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const ev = JSON.parse(line.slice(6))
          if (ev.type === 'log') setScanLogs(p => [...p, { text: ev.msg, icon: 'info' }])
          if (ev.type === 'scanning') setScanLogs(p => [...p, { text: `Scanning ${ev.repo}...`, icon: 'search' }])
          if (ev.type === 'result' && ev.matches) {
            found.push(ev)
            setScanResults(p => [...p, ev])
            setScanLogs(p => [...p, { text: `✓ Found: ${ev.repo} (${ev.cluster}) — nginx-ingress ${ev.version}`, icon: 'match' }])
          }
          if (ev.type === 'skip') setScanLogs(p => [...p, { text: `→ Skip: ${ev.repo} (${ev.reason})`, icon: 'skip' }])
          if (ev.type === 'done') {
            addAudit(`Scan complete — ${ev.found} repos found with ${changeReq.chart} v${changeReq.fromVersion}`, 'success')
            setPhase('review')
            const initApprovals = {}
            found.forEach(r => { initApprovals[r.repo] = 'pending' })
            setApprovals(initApprovals)
          }
        } catch (_) {}
      }
    }
  }

  // ── Approve / Reject ───────────────────────────────────────────────────────

  const approveRepo = (repoName) => {
    setApprovals(p => ({ ...p, [repoName]: 'approved' }))
    addAudit(`Approved: ${repoName}`, 'success')
  }

  const rejectRepo = (repoName) => {
    setApprovals(p => ({ ...p, [repoName]: 'rejected' }))
    addAudit(`Rejected: ${repoName}`, 'warning')
  }

  const approveAll = () => {
    const updated = {}
    scanResults.forEach(r => { updated[r.repo] = 'approved' })
    setApprovals(updated)
    addAudit('All repos approved', 'success')
  }

  const approveNonProd = () => {
    const updated = { ...approvals }
    scanResults.forEach(r => {
      if (!r.env.includes('production')) updated[r.repo] = 'approved'
    })
    setApprovals(updated)
    addAudit('All non-production repos approved', 'success')
  }

  const allApproved = () => scanResults.every(r => approvals[r.repo] !== 'pending')
  const approvedRepos = () => scanResults.filter(r => approvals[r.repo] === 'approved').map(r => r.repo)

  // ── Propagate ──────────────────────────────────────────────────────────────

  const startPropagation = async () => {
    const targets = approvedRepos()
    if (!targets.length) return
    setPhase('propagating')
    setPropLogs([])
    setPrs([])
    addAudit(`Starting propagation for ${targets.length} repos`)

    const resp = await fetch(`${API_URL}/api/helm/propagate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repos: targets, ...changeReq, approvedBy: 'platform-engineer' }),
    })

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const ev = JSON.parse(line.slice(6))
          if (ev.type === 'log') setPropLogs(p => [...p, { text: ev.msg, icon: 'info' }])
          if (ev.type === 'progress') setPropLogs(p => [...p, { text: `[${ev.repo}] starting...`, icon: 'progress' }])
          if (ev.type === 'step') setPropLogs(p => [...p, { text: `[${ev.repo}] ${ev.step}`, icon: 'step' }])
          if (ev.type === 'pr_created') {
            setPrs(p => [...p, ev])
            setPropLogs(p => [...p, { text: `✓ PR #${ev.prNumber} created: ${ev.repo}`, icon: 'success', url: ev.prUrl }])
            addAudit(`PR #${ev.prNumber} created for ${ev.repo}`, 'success')
          }
          if (ev.type === 'error') {
            setPropLogs(p => [...p, { text: `✗ Error on ${ev.repo}: ${ev.msg}`, icon: 'error' }])
            addAudit(`Error on ${ev.repo}: ${ev.msg}`, 'error')
          }
          if (ev.type === 'done') {
            setPhase('awaiting_merge')
            addAudit(`Propagation complete — ${ev.results?.length || 0} PRs created`)
          }
        } catch (_) {}
      }
    }
  }

  // ── Merge ──────────────────────────────────────────────────────────────────

  const mergePR = async (pr) => {
    setMergeStatus(p => ({ ...p, [pr.repo]: 'merging' }))
    addAudit(`Merging PR #${pr.prNumber} for ${pr.repo}`)
    try {
      const resp = await fetch(`${API_URL}/api/helm/merge/${pr.repo}/${pr.prNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changeReq),
      })
      const data = await resp.json()
      if (data.success) {
        setMergeStatus(p => ({ ...p, [pr.repo]: 'merged' }))
        addAudit(`Merged: ${pr.repo} — ${changeReq.chart} updated to ${changeReq.toVersion}`, 'success')
      } else {
        setMergeStatus(p => ({ ...p, [pr.repo]: 'error' }))
        addAudit(`Merge failed: ${pr.repo} — ${data.error}`, 'error')
      }
    } catch (err) {
      setMergeStatus(p => ({ ...p, [pr.repo]: 'error' }))
    }
  }

  const mergeAll = async () => {
    for (const pr of prs.filter(p => p.status === 'pr_created' || p.prNumber)) {
      if (mergeStatus[pr.repo] !== 'merged') await mergePR(pr)
    }
    setPhase('complete')
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  const sendMessage = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg) return
    setInput('')
    setMessages(p => [...p, { role: 'user', content: userMsg }])
    setIsStreaming(true)

    // Detect propagation intent
    if (/update|upgrade|propagate|bump|4\.9\.1/i.test(userMsg) && phase === 'define') {
      setMessages(p => [...p, { role: 'assistant', content: "Got it — I'll start the scan now. Click **'Start Scan'** in the workflow panel, or I'll trigger it automatically." }])
      setIsStreaming(false)
      setTimeout(() => startScan(), 1500)
      return
    }

    const history = [...messages, { role: 'user', content: userMsg }]
    try {
      const resp = await fetch(`${API_URL}/api/helm/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantText = ''
      setMessages(p => [...p, { role: 'assistant', content: '' }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.token) {
              assistantText += ev.token
              setMessages(p => { const msgs = [...p]; msgs[msgs.length - 1] = { role: 'assistant', content: assistantText }; return msgs })
            }
          } catch (_) {}
        }
      }
    } catch (_) {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error. Please retry.' }])
    }
    setIsStreaming(false)
  }

  const reset = () => {
    setPhase('define')
    setScanResults([])
    setScanLogs([])
    setPrs([])
    setPropLogs([])
    setApprovals({})
    setMergeStatus({})
    addAudit('Demo reset')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-humana-light">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Server size={11} /> UC #47 · Cloud Engineering · Automation Engineering
            </div>
            <h1 className="text-xl font-bold text-humana-navy flex items-center gap-2">
              <GitBranch size={20} className="text-humana-teal" />
              Multi-Cluster Update Agent
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI-orchestrated component updates across {clusters.length} AKS clusters · 12 repos · Human-in-loop approval · Full audit trail
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <span className="w-2 h-2 rounded-full bg-humana-green animate-pulse" />
              {clusters.filter(c => c.provisioningState === 'Succeeded').length}/{clusters.length} clusters online
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RefreshCw size={12} />Reset demo
            </button>
          </div>
        </div>
      </div>

      {/* Cluster cards */}
      <div className="px-6 py-4 grid grid-cols-5 gap-3">
        {clusters.map(c => {
          const style = CLUSTER_ENV_STYLE[c.env] || CLUSTER_ENV_STYLE.development
          const isReady = c.provisioningState === 'Succeeded'
          return (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border ${style.border} ${style.bg} p-3 cursor-pointer transition-shadow hover:shadow-md ${expandedCluster === c.name ? 'ring-2 ring-humana-teal' : ''}`}
              onClick={() => setExpandedCluster(prev => prev === c.name ? null : c.name)}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                  {c.env === 'disaster-recovery' ? 'DR' : c.env.slice(0, 4).toUpperCase()}
                </span>
                <span className={`w-2 h-2 rounded-full mt-0.5 ${isReady ? style.dot : 'bg-yellow-400 animate-pulse'}`} />
              </div>
              <div className="text-xs font-bold text-humana-navy leading-tight mb-1">{c.name}</div>
              <div className="text-xs text-gray-400">
                {isReady ? (
                  <span className="text-humana-green font-semibold">● Running</span>
                ) : (
                  <span className="text-amber-500">⟳ Provisioning</span>
                )}
              </div>
              {c.nginxVersion && (
                <div className="mt-2 text-xs bg-white/70 rounded px-1.5 py-0.5 font-mono text-gray-600">
                  nginx {c.nginxVersion}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Main content: workflow + chat */}
      <div className="px-6 pb-6 grid grid-cols-3 gap-4">

        {/* Left/center — Propagation Wizard (2/3 width) */}
        <div className="col-span-2 flex flex-col gap-4">

          {/* Step progress bar */}
          <div className="card-humana p-4">
            <div className="flex items-center">
              {STEPS.map((s, i) => {
                const phaseIdx = ['define', 'scanning', 'review', 'propagating', 'awaiting_merge', 'complete'].indexOf(phase)
                const stepMap = [0, 1, 2, 3, 3, 4]
                const currentStep = stepMap[phaseIdx] ?? 0
                const done = i < currentStep
                const active = i === currentStep
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`flex items-center gap-1.5 ${active ? 'text-humana-teal' : done ? 'text-humana-green' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        done ? 'border-humana-green bg-humana-green text-white' :
                        active ? 'border-humana-teal bg-humana-teal text-white' :
                        'border-gray-300 text-gray-400'
                      }`}>
                        {done ? <Check size={10} /> : i + 1}
                      </div>
                      <span className="text-xs font-medium whitespace-nowrap hidden sm:block">{s}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-humana-green' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Phase content */}
          <div className="card-humana overflow-hidden">

            {/* Phase: Define Change */}
            {phase === 'define' && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Package size={16} className="text-humana-teal" />
                  <span className="font-semibold text-humana-navy">Select Component to Update</span>
                </div>

                {/* Chart option cards */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {CHART_OPTIONS.map(opt => (
                    <button
                      key={opt.chart}
                      onClick={() => {
                        setSelectedOption(opt)
                        setChangeReq({ chart: opt.chart, fromVersion: opt.fromVersion, toVersion: opt.toVersion })
                      }}
                      className={`text-left rounded-xl border-2 p-2.5 transition-all ${
                        selectedOption.chart === opt.chart
                          ? 'border-humana-teal bg-humana-teal/5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`text-xs font-bold px-1.5 py-0.5 rounded inline-block mb-1.5 border ${opt.riskColor}`}>
                        {opt.risk.toUpperCase()}
                      </div>
                      <div className="text-xs font-semibold text-humana-navy leading-tight">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">{opt.fromVersion} → {opt.toVersion}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.repoCount} repo{opt.repoCount > 1 ? 's' : ''}</div>
                    </button>
                  ))}
                </div>

                {/* Version fields — editable for custom overrides */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Chart</label>
                    <input className="input-humana text-sm w-full font-mono" value={changeReq.chart}
                      onChange={e => setChangeReq(p => ({ ...p, chart: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Current Version</label>
                    <input className="input-humana text-sm w-full font-mono" value={changeReq.fromVersion}
                      onChange={e => setChangeReq(p => ({ ...p, fromVersion: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Target Version</label>
                    <input className="input-humana text-sm w-full font-mono" value={changeReq.toVersion}
                      onChange={e => setChangeReq(p => ({ ...p, toVersion: e.target.value }))} />
                  </div>
                </div>

                {/* Dynamic AI assessment */}
                <div className={`border rounded-lg p-3 mb-4 text-xs ${selectedOption.riskColor}`}>
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <Info size={12} />
                    AI Assessment — Risk: {selectedOption.risk.charAt(0).toUpperCase() + selectedOption.risk.slice(1)}
                  </div>
                  <div className="leading-relaxed">{selectedOption.assessment}</div>
                  <div className="mt-1.5 font-mono opacity-70">Rollback: {selectedOption.rollback}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={startScan} className="btn-primary flex items-center gap-2">
                    <Search size={14} />Scan Repos
                  </button>
                  <span className="text-xs text-gray-400">
                    Scans all 12 repos for <span className="font-mono">{changeReq.chart} v{changeReq.fromVersion}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Phase: Scanning */}
            {phase === 'scanning' && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 size={16} className="text-humana-teal animate-spin" />
                  <span className="font-semibold text-humana-navy">Scanning 12 Repositories…</span>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 h-52 overflow-y-auto font-mono text-xs">
                  {scanLogs.map((l, i) => (
                    <div key={i} className={`mb-0.5 ${
                      l.icon === 'match' ? 'text-green-400' :
                      l.icon === 'skip' ? 'text-gray-500' :
                      l.icon === 'error' ? 'text-red-400' : 'text-gray-300'
                    }`}>{l.text}</div>
                  ))}
                  {scanLogs.length === 0 && <div className="text-gray-500">Initialising scan…</div>}
                </div>
              </div>
            )}

            {/* Phase: Review */}
            {phase === 'review' && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-amber-500" />
                    <span className="font-semibold text-humana-navy">Human Review — {scanResults.length} repos found</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={approveNonProd} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2.5 py-1 rounded font-medium">
                      Approve Non-Prod
                    </button>
                    <button onClick={approveAll} className="text-xs bg-humana-green text-white hover:bg-green-600 px-2.5 py-1 rounded font-medium">
                      Approve All
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {scanResults.map(r => {
                    const approval = approvals[r.repo]
                    const isProd = r.env === 'production'
                    return (
                      <motion.div key={r.repo} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        className={`border rounded-lg p-3 ${
                          approval === 'approved' ? 'border-green-300 bg-green-50' :
                          approval === 'rejected' ? 'border-red-300 bg-red-50' :
                          'border-gray-200 bg-white'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GitBranch size={13} className="text-humana-teal shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-humana-navy">{r.repo}</div>
                              <div className="text-xs text-gray-400">{r.cluster} · {r.env}
                                {isProd && <span className="ml-1.5 bg-red-100 text-red-700 text-xs px-1 py-0.5 rounded">Senior Review Required</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono text-gray-500 flex items-center gap-1">
                              <span className="text-red-500">{r.version}</span>
                              <ArrowRight size={10} />
                              <span className="text-green-600">{changeReq.toVersion}</span>
                            </div>
                            {approval === 'pending' ? (
                              <div className="flex gap-1.5">
                                <button onClick={() => approveRepo(r.repo)}
                                  className="text-xs bg-humana-green text-white px-2 py-0.5 rounded hover:bg-green-600">
                                  Approve
                                </button>
                                <button onClick={() => rejectRepo(r.repo)}
                                  className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200">
                                  Reject
                                </button>
                              </div>
                            ) : approval === 'approved' ? (
                              <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={13} />Approved</span>
                            ) : (
                              <span className="text-xs text-red-600 flex items-center gap-1"><XCircle size={13} />Rejected</span>
                            )}
                          </div>
                        </div>

                        {/* Diff preview */}
                        <div className="mt-2 bg-gray-900 rounded p-2 font-mono text-xs">
                          <div className="text-red-400">- version: {r.version}</div>
                          <div className="text-green-400">+ version: {changeReq.toVersion}</div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={startPropagation}
                    disabled={!approvedRepos().length}
                    className={`btn-primary flex items-center gap-2 ${!approvedRepos().length ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <GitPullRequest size={14} />
                    Propagate {approvedRepos().length} Repos
                  </button>
                  <span className="text-xs text-gray-400">
                    {approvedRepos().length} approved · {Object.values(approvals).filter(a => a === 'rejected').length} rejected · {Object.values(approvals).filter(a => a === 'pending').length} pending
                  </span>
                </div>
              </div>
            )}

            {/* Phase: Propagating */}
            {phase === 'propagating' && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 size={16} className="text-humana-teal animate-spin" />
                  <span className="font-semibold text-humana-navy">Creating Pull Requests…</span>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs">
                  {propLogs.map((l, i) => (
                    <div key={i} className={`mb-0.5 ${
                      l.icon === 'success' ? 'text-green-400' :
                      l.icon === 'error' ? 'text-red-400' :
                      l.icon === 'step' ? 'text-blue-300' : 'text-gray-300'
                    }`}>
                      {l.text}
                      {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="ml-1 text-humana-teal underline">↗ view PR</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase: Awaiting Merge */}
            {phase === 'awaiting_merge' && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitPullRequest size={16} className="text-humana-green" />
                    <span className="font-semibold text-humana-navy">{prs.length} Pull Requests Ready</span>
                  </div>
                  <button onClick={mergeAll} className="btn-primary text-sm flex items-center gap-1.5">
                    <Zap size={14} />Merge All &amp; Deploy
                  </button>
                </div>

                <div className="space-y-2">
                  {prs.map(pr => {
                    const ms = mergeStatus[pr.repo]
                    return (
                      <motion.div key={pr.repo} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={`border rounded-lg p-3 flex items-center justify-between ${
                          ms === 'merged' ? 'border-green-300 bg-green-50' :
                          ms === 'error' ? 'border-red-300 bg-red-50' :
                          'border-gray-200 bg-white'
                        }`}>
                        <div className="flex items-center gap-2">
                          {ms === 'merging' ? <Loader2 size={14} className="animate-spin text-humana-teal" /> :
                           ms === 'merged' ? <CheckCircle2 size={14} className="text-green-600" /> :
                           ms === 'error' ? <XCircle size={14} className="text-red-500" /> :
                           <GitPullRequest size={14} className="text-humana-teal" />}
                          <div>
                            <div className="text-sm font-semibold text-humana-navy">{pr.repo}</div>
                            <div className="text-xs text-gray-400">PR #{pr.prNumber}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pr.prUrl && (
                            <a href={pr.prUrl} target="_blank" rel="noreferrer"
                              className="text-xs text-humana-teal hover:underline flex items-center gap-1">
                              View PR <ExternalLink size={10} />
                            </a>
                          )}
                          {!ms && (
                            <button onClick={() => mergePR(pr)} className="text-xs bg-humana-green text-white px-2.5 py-1 rounded hover:bg-green-600">
                              Merge
                            </button>
                          )}
                          {ms === 'merged' && <span className="text-xs text-green-600 font-semibold">Merged ✓</span>}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Phase: Complete */}
            {phase === 'complete' && (
              <div className="p-5 text-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <CheckCircle2 size={48} className="text-humana-green mx-auto mb-3" />
                  <div className="text-lg font-bold text-humana-navy mb-1">Propagation Complete!</div>
                  <div className="text-sm text-gray-500 mb-4">
                    nginx-ingress updated from {changeReq.fromVersion} → {changeReq.toVersion} across {prs.filter(p => mergeStatus[p.repo] === 'merged').length} clusters
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-2xl font-black text-humana-green">{prs.filter(p => mergeStatus[p.repo] === 'merged').length}</div>
                      <div className="text-xs text-gray-500">PRs Merged</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-2xl font-black text-blue-600">4.9.1</div>
                      <div className="text-xs text-gray-500">New Version</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-2xl font-black text-gray-600">~3m</div>
                      <div className="text-xs text-gray-500">vs 4h manual</div>
                    </div>
                  </div>
                  <button onClick={reset} className="btn-primary flex items-center gap-2 mx-auto">
                    <RefreshCw size={14} />Run Another Update
                  </button>
                </motion.div>
              </div>
            )}
          </div>

          {/* Audit log */}
          {auditLog.length > 0 && (
            <div className="card-humana p-4">
              <div className="text-xs font-bold text-humana-navy mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                <Terminal size={12} />Audit Log
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {auditLog.slice().reverse().map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 font-mono shrink-0">{e.ts}</span>
                    <span className={e.type === 'success' ? 'text-green-600' : e.type === 'error' ? 'text-red-600' : e.type === 'warning' ? 'text-amber-600' : 'text-gray-600'}>
                      {e.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — AI Chat (1/3 width) */}
        <div className="flex flex-col gap-3">
          <div className="card-humana flex flex-col" style={{ height: 560 }}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
              <Bot size={15} className="text-humana-teal" />
              <span className="text-sm font-semibold text-humana-navy">Propagation Agent Chat</span>
              {isStreaming && <Loader2 size={12} className="animate-spin text-humana-teal ml-auto" />}
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-humana-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={12} className="text-humana-teal" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-humana-teal text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    {m.content || <span className="opacity-50">…</span>}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-humana-navy/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={12} className="text-humana-navy" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick asks */}
            <div className="px-3 pb-2 shrink-0">
              <div className="grid grid-cols-2 gap-1">
                {QUICK_ASKS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-left text-xs text-gray-500 hover:text-humana-teal bg-gray-50 hover:bg-humana-teal/5 border border-gray-200 hover:border-humana-teal/30 rounded px-2 py-1.5 transition-colors leading-tight">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 p-2 shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask the agent…"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-humana-teal"
                />
                <button onClick={() => sendMessage()} disabled={isStreaming || !input.trim()}
                  className="w-8 h-8 rounded-lg bg-humana-teal text-white flex items-center justify-center hover:bg-humana-teal/80 disabled:opacity-40">
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Repo summary card */}
          <div className="card-humana p-4">
            <div className="text-xs font-bold text-humana-navy mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <GitBranch size={12} />Managed Components (12 repos)
            </div>
            <div className="space-y-1.5">
              {CHART_OPTIONS.map(opt => (
                <button key={opt.chart} onClick={() => { setSelectedOption(opt); setChangeReq({ chart: opt.chart, fromVersion: opt.fromVersion, toVersion: opt.toVersion }) }}
                  className={`w-full text-left flex items-center justify-between text-xs rounded px-1.5 py-1 transition-colors ${selectedOption.chart === opt.chart ? 'bg-humana-teal/10' : 'hover:bg-gray-50'}`}>
                  <span className="font-medium text-humana-navy truncate">{opt.label}</span>
                  <span className={`text-xs px-1 py-0.5 rounded border ml-1 shrink-0 ${opt.riskColor}`}>{opt.risk}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
