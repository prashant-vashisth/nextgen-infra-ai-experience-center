import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Server, AlertTriangle, CheckCircle2, XCircle, Loader2, Clock, TrendingDown, Bell, RefreshCw, Zap, PlayCircle, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import MetricCounter from '../components/MetricCounter'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const SYSTEMS = [
  { id: 'controlm', label: 'Control-M', before: 573, after: 229 },
  { id: 'mainframe', label: 'Mainframe', before: 606, after: 242 },
  { id: 'toad', label: 'Toad/Oracle', before: 289.5, after: 116 },
  { id: 'informatica', label: 'Informatica ETL', before: 508, after: 152 },
  { id: 'nabu', label: 'Nabu Pipeline', before: 304, after: 91 },
]

const STATUS_CONFIG = {
  success: { color: 'text-humana-green', bg: 'bg-green-100', border: 'border-green-200', label: 'Healthy', icon: CheckCircle2 },
  warning: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Warning', icon: AlertTriangle },
  failed: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Failed', icon: XCircle },
  running: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Running', icon: Loader2 },
  pending: { color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Pending', icon: Clock },
}

function RiskBar({ risk }) {
  const color = risk >= 70 ? 'bg-red-500' : risk >= 40 ? 'bg-amber-500' : 'bg-humana-green'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${risk}%` }} />
      </div>
      <span className={`text-xs font-semibold ${risk >= 70 ? 'text-red-600' : risk >= 40 ? 'text-amber-600' : 'text-humana-green'}`}>{risk}</span>
    </div>
  )
}

export default function BatchHealthAnalyzer({ scenario }) {
  const [activeSystem, setActiveSystem] = useState('controlm')
  const [jobs, setJobs] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisDuration, setAnalysisDuration] = useState(null)
  const [showBeforeAfter, setShowBeforeAfter] = useState(true) // true = after AI
  const [alerts, setAlerts] = useState(generateAlerts())
  const [incidentCreated, setIncidentCreated] = useState(null)
  const [isRemediating, setIsRemediating] = useState(false)
  const aiPanelRef = useRef(null)

  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scenario === 'trigger-batch-failure') {
      const failedJob = jobs.find(j => j.status === 'success')
      if (failedJob) analyzeJob({ ...failedJob, status: 'failed', error: 'Simulated failure for demo', risk: 95 })
    }
  }, [scenario])

  const loadJobs = async () => {
    try {
      const r = await fetch(`${API_URL}/api/batch/jobs`)
      const data = await r.json()
      setJobs(data.jobs || [])
      setSummary(data.summary || {})
    } catch { /* use empty */ }
  }

  const analyzeJob = async (job) => {
    setSelectedJob(job)
    setAiAnalysis('')
    setIsAnalyzing(true)
    setAnalysisDuration(null)
    setIncidentCreated(null)
    aiPanelRef.current?.scrollIntoView({ behavior: 'smooth' })

    const start = Date.now()
    try {
      const r = await fetch(`${API_URL}/api/groq/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are an AI batch operations analyst for Humana infrastructure. Provide concise, actionable analysis.',
          prompt: `Analyze this batch job failure and provide RCA + remediation:

Job: ${job.name}
System: ${job.system?.toUpperCase()}
Status: ${job.status}
Duration: ${job.duration} min (SLA: ${job.sla} min)
Risk Score: ${job.risk}/100
Error: ${job.error || job.warning || 'N/A'}

Provide: 1) Root cause (2 sentences), 2) Immediate remediation steps (3-4 steps), 3) Prevention recommendation. Keep under 300 words.`,
        }),
      })

      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) setAiAnalysis(prev => prev + data.token)
            if (data.done) setAnalysisDuration(data.duration || Date.now() - start)
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
    setIsAnalyzing(false)
  }

  const createIncident = async () => {
    if (!selectedJob) return
    try {
      const r = await fetch(`${API_URL}/api/snow/incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortDescription: `Batch job failure: ${selectedJob.name} — ${selectedJob.error || selectedJob.warning}`,
          urgency: selectedJob.risk >= 80 ? '1' : '2',
          assignmentGroup: 'Cloud Operations',
        }),
      })
      const data = await r.json()
      setIncidentCreated(data.incident)
    } catch { /* ignore */ }
  }

  const handleRemediate = async (job) => {
    setIsRemediating(true)
    try {
      await fetch(`${API_URL}/api/batch/remediate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id }) })
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'success', risk: 10 } : j))
    } finally {
      setIsRemediating(false)
    }
  }

  const systemJobs = jobs.filter(j => j.system === activeSystem)
  const chartData = SYSTEMS.map(s => ({
    name: s.label,
    'Before AI': s.before,
    'After AI': s.after,
    savings: Math.round(((s.before - s.after) / s.before) * 100),
  }))

  return (
    <div className="min-h-screen bg-humana-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Server size={12} className="text-emerald-600" />
              UC #25 · Infra Ops / ESC
            </div>
            <h1 className="text-xl font-bold text-humana-navy">AI Batch Health Analyzer</h1>
            <p className="text-sm text-gray-500 mt-0.5">Unified NOC dashboard: Control-M · Mainframe · Toad/Oracle · Informatica ETL · Nabu Pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <LiveIndicator label="LIVE NOC" color="green" />
            <button onClick={loadJobs} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-humana-navy px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      {summary && (
        <div className="bg-humana-navy px-6 py-3 grid grid-cols-3 md:grid-cols-7 gap-4 text-white text-sm">
          {[
            { label: 'Total Jobs', value: summary.total, color: 'text-white' },
            { label: 'Healthy', value: summary.healthy, color: 'text-humana-green' },
            { label: 'Running', value: summary.running, color: 'text-blue-300' },
            { label: 'Warning', value: summary.warning, color: 'text-amber-400' },
            { label: 'Failed', value: summary.failed, color: 'text-red-400' },
            { label: 'SLA At Risk', value: summary.slaAtRisk, color: 'text-red-300' },
            { label: 'Saved hrs/mo', value: summary.savedHoursThisMonth, color: 'text-humana-green' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <div className={`text-xl font-black ${m.color}`}>
                <MetricCounter value={m.value || 0} duration={1000} />
              </div>
              <div className="text-xs text-white/50">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* LEFT: System Tabs + Jobs Table */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* System Tabs */}
          <div className="card-humana overflow-hidden">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {SYSTEMS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSystem(s.id)}
                  className={`flex-1 min-w-24 px-3 py-3 text-xs font-semibold transition-colors whitespace-nowrap ${activeSystem === s.id ? 'border-b-2 border-humana-green text-humana-navy bg-green-50/50' : 'text-gray-500 hover:text-humana-navy hover:bg-gray-50'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 font-semibold">
                    <th className="px-4 py-2.5 text-left">Job Name</th>
                    <th className="px-4 py-2.5 text-left">Start</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Duration</th>
                    <th className="px-4 py-2.5 text-left">SLA</th>
                    <th className="px-4 py-2.5 text-left min-w-24">Risk</th>
                    <th className="px-4 py-2.5 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {systemJobs.map((job, i) => {
                    const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending
                    const slaOk = job.duration <= job.sla
                    return (
                      <motion.tr
                        key={job.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedJob?.id === job.id ? 'bg-blue-50' : ''}`}
                        onClick={() => analyzeJob(job)}
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs font-semibold text-humana-navy">{job.name}</span>
                          {(job.error || job.warning) && (
                            <div className="text-xs text-red-600 truncate max-w-48">{(job.error || job.warning)?.slice(0, 60)}...</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{job.startTime || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>
                            {job.status === 'running' ? <Loader2 size={10} className="animate-spin" /> : null}
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 font-mono">{job.duration > 0 ? `${job.duration}m` : '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold ${slaOk ? 'text-humana-green' : 'text-red-600'}`}>
                            {slaOk ? '✓' : '⚠'} {job.sla}m
                          </span>
                        </td>
                        <td className="px-4 py-2.5 w-28"><RiskBar risk={job.risk} /></td>
                        <td className="px-4 py-2.5">
                          {(job.status === 'failed' || job.status === 'warning') && (
                            <button
                              onClick={e => { e.stopPropagation(); handleRemediate(job) }}
                              disabled={isRemediating}
                              className="text-xs btn-primary py-1 px-2"
                            >
                              {isRemediating ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                              Fix
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                  {systemJobs.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Loading batch jobs...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Before/After Chart */}
          <div className="card-humana p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-humana-navy text-sm flex items-center gap-2">
                <TrendingDown size={14} className="text-humana-green" />
                FTE Hours Savings by System
              </h3>
              <button
                onClick={() => setShowBeforeAfter(p => !p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${showBeforeAfter ? 'bg-humana-green text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {showBeforeAfter ? 'After AI (Current)' : 'Before AI'}
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="h" />
                <Tooltip formatter={(v, n) => [`${v} hr/mo`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {!showBeforeAfter && <Bar dataKey="Before AI" fill="#ef4444" radius={[3,3,0,0]} />}
                <Bar dataKey="After AI" fill="#00A651" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {SYSTEMS.map(s => {
                const savings = Math.round(((s.before - s.after) / s.before) * 100)
                return (
                  <div key={s.id} className="text-center bg-green-50 rounded-lg p-2">
                    <div className="text-sm font-black text-humana-green">{savings}%</div>
                    <div className="text-xs text-gray-500 leading-tight">{s.label.split(' ')[0]}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: AI Analysis Panel + Alerts */}
        <div className="flex flex-col gap-4" ref={aiPanelRef}>
          {/* AI Analysis */}
          <div className="card-humana p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-humana-navy text-sm flex items-center gap-2">
                <Zap size={14} className="text-humana-green" />
                AI Job Analysis
              </h3>
              {isAnalyzing && <LiveIndicator label="ANALYZING" color="teal" />}
              {analysisDuration && !isAnalyzing && (
                <span className="text-xs text-gray-400">Groq: {(analysisDuration / 1000).toFixed(2)}s</span>
              )}
            </div>

            {selectedJob && (
              <div className="bg-gray-50 rounded-lg p-2.5 mb-3 text-xs">
                <span className="font-mono font-bold text-humana-navy">{selectedJob.name}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${STATUS_CONFIG[selectedJob.status]?.bg} ${STATUS_CONFIG[selectedJob.status]?.color}`}>
                  {selectedJob.status}
                </span>
              </div>
            )}

            {(aiAnalysis || isAnalyzing) ? (
              <div>
                <div className="prose prose-sm max-w-none text-gray-700 text-xs leading-relaxed whitespace-pre-wrap min-h-12">
                  {aiAnalysis}
                  {isAnalyzing && <span className="inline-block w-1.5 h-4 bg-humana-green ml-0.5 animate-pulse align-text-bottom" />}
                </div>
                {!isAnalyzing && aiAnalysis && (
                  <div className="mt-3 flex flex-col gap-2">
                    <button onClick={createIncident} className="btn-primary text-xs py-1.5 justify-center">
                      <Bell size={12} />
                      Create ServiceNow Incident
                    </button>
                    {incidentCreated && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-50 border border-green-200 rounded p-2 text-xs flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-humana-green" />
                        <span className="font-semibold">{incidentCreated.number}</span>
                        <span className="text-gray-500">created in ServiceNow</span>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-6">
                Click any job row to trigger AI analysis
              </div>
            )}
          </div>

          {/* Alert Intelligence */}
          <div className="card-humana p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-humana-navy text-sm flex items-center gap-2">
                <Bell size={14} className="text-amber-500" />
                Alert Intelligence
              </h3>
              <div className="flex items-center gap-1 text-xs font-semibold text-humana-green bg-green-50 px-2 py-0.5 rounded-full">
                {alerts.raw} alerts → {alerts.actionable} incidents
              </div>
            </div>
            <div className="space-y-2">
              {alerts.incidents.map((inc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-2.5 rounded-lg border text-xs ${inc.severity === 'critical' ? 'bg-red-50 border-red-200' : inc.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${inc.severity === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>{inc.title}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-semibold ${inc.confidence >= 90 ? 'bg-green-100 text-humana-green' : 'bg-gray-100 text-gray-600'}`}>{inc.confidence}%</span>
                  </div>
                  <div className="text-gray-600">{inc.next}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function generateAlerts() {
  return {
    raw: 15,
    actionable: 3,
    incidents: [
      { title: 'Informatica ETL Connection Pool Exhausted', severity: 'critical', confidence: 96, next: 'Restart connection pool on humana-claims-db-01 · ETL auto-restart at 03:47' },
      { title: 'Mainframe ABEND — MF-PROVIDER-XREF', severity: 'critical', confidence: 91, next: 'Invalid packed decimal in PROVIDER-ID field · Apply PRVIDXP patch' },
      { title: 'Oracle Tablespace Claims_Data at 87%', severity: 'warning', confidence: 88, next: 'Schedule tablespace extension · Monitor for next 2 hrs' },
    ],
  }
}
