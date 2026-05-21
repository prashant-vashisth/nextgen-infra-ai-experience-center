import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Database, Search, CheckCircle2, Loader2, ChevronDown, ChevronUp, Plus, RefreshCw, Zap, AlertTriangle, FileText, Network } from 'lucide-react'
import MetricCounter from '../components/MetricCounter'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const TABS = ['RCA Investigation', 'CMDB Health Dashboard']

const CMDB_CIS = [
  { id: 'CI-001245', name: 'humana-prod-aks-eastus', type: 'Kubernetes Cluster', env: 'Production', owner: null, lastSeen: '2 days ago', issues: ['Missing Owner', 'Missing Classification'], similarity: null, score: 42 },
  { id: 'CI-001246', name: 'claims-processing-svc', type: 'Application', env: null, owner: 'Platform Engineering', lastSeen: '4 hrs ago', issues: ['Missing Environment'], similarity: null, score: 71 },
  { id: 'CI-001247', name: 'CLAIMS-ADJUD-NIGHTLY_OLD', type: 'Batch Job', env: 'Production', owner: null, lastSeen: '94 days ago', issues: ['Stale CI', 'No Relationships'], similarity: 'CLAIMS-ADJUD-NIGHTLY (87%)', score: 28 },
  { id: 'CI-001248', name: 'humana-auth-gateway-v1', type: 'Service', env: 'Production', owner: 'Security Assurance', lastSeen: '1 hr ago', issues: ['Duplicate detected'], similarity: 'auth-gateway (92%)', score: 55 },
  { id: 'CI-001249', name: 'nabu-data-flow-prod', type: 'Pipeline', env: null, owner: null, lastSeen: '30 min ago', issues: ['Missing Owner', 'Missing Environment'], similarity: null, score: 38 },
]

const HEALTH_METRICS = [
  { label: 'Completeness', value: 67, target: 95, color: '#ef4444' },
  { label: 'Accuracy', value: 74, target: 95, color: '#f59e0b' },
  { label: 'Staleness', value: 81, target: 95, color: '#00A651' },
  { label: 'Orphan CIs', value: 12, target: 0, color: '#ef4444', isCount: true },
  { label: 'Rel. Gaps', value: 23, target: 0, color: '#f97316', isCount: true },
]

function DonutChart({ value, color, label, size = 60 }) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f0f0f0" strokeWidth={6} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
    </div>
  )
}

function FiveWhyCard({ fiveWhy, index }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className="border border-gray-200 rounded-lg overflow-hidden"
    >
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-left transition-colors">
        <span className="w-6 h-6 rounded-full bg-humana-navy text-white text-xs font-bold flex items-center justify-center shrink-0">{fiveWhy.why}</span>
        <span className="text-xs font-semibold text-humana-navy flex-1">{fiveWhy.question}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 py-2.5 text-xs text-gray-700 bg-white border-t border-gray-100">
              {fiveWhy.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function RCAandCMDB({ scenario }) {
  const [activeTab, setActiveTab] = useState(0)
  const [rcaState, setRcaState] = useState('idle') // idle, loading, done
  const [rcaContent, setRcaContent] = useState(null)
  const [rcaDuration, setRcaAnalysisDuration] = useState(null)
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [problems, setProblems] = useState([])
  const [kbModal, setKbModal] = useState(false)
  const [kbContent, setKbContent] = useState('')
  const [isGeneratingKB, setIsGeneratingKB] = useState(false)
  const [workNotes, setWorkNotes] = useState('')
  const [enrichingCI, setEnrichingCI] = useState(null)
  const [enrichedCIs, setEnrichedCIs] = useState({})
  const [cmdbHealth, setCmdbHealth] = useState(67)

  useEffect(() => {
    fetch(`${API_URL}/api/snow/problems`).then(r => r.json()).then(d => {
      setProblems(d.problems || [])
      if (d.problems?.[0]) setSelectedProblem(d.problems[0])
    }).catch(() => setProblems(getMockProblems()))
  }, [])

  useEffect(() => {
    if (scenario === 'create-problem') {
      fetch(`${API_URL}/api/snow/problem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shortDescription: 'Demo: Injected problem ticket for RCA', priority: '1' }) })
        .then(r => r.json()).then(d => {
          if (d.problem) {
            setProblems(prev => [d.problem, ...prev])
            setSelectedProblem(d.problem)
          }
        }).catch(() => {})
    }
  }, [scenario])

  const runRCA = async (problem) => {
    setSelectedProblem(problem)
    setRcaState('loading')
    setRcaContent(null)

    const start = Date.now()

    try {
      const r = await fetch(`${API_URL}/api/groq/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are an RCA expert for Humana infrastructure. Return valid JSON only.',
          prompt: `Perform a complete root cause analysis for this ServiceNow problem:

Problem: ${problem.short_description || problem.shortDescription}
Priority: ${problem.priority}
Linked Incidents: ${(problem.linked_incidents || []).join(', ')}
Impacted Services: ${(problem.impacted_services || []).join(', ')}

Return JSON with:
{
  "rootCause": "Clear single-sentence root cause",
  "confidence": 94,
  "fiveWhy": [
    {"why": 1, "question": "Why did X fail?", "answer": "Because Y"},
    {"why": 2, "question": "...", "answer": "..."},
    {"why": 3, "question": "...", "answer": "..."},
    {"why": 4, "question": "...", "answer": "..."},
    {"why": 5, "question": "...", "answer": "..."}
  ],
  "evidence": [
    {"signal": "Alert type", "detail": "Description", "timestamp": "03:15 AM"}
  ],
  "capa": ["Action 1", "Action 2", "Action 3"],
  "workaround": "Immediate workaround description",
  "similarIncidents": [
    {"number": "INC4XXXXXX", "date": "2024-03-15", "resolution": "Short summary"}
  ]
}`,
          maxTokens: 1800,
          temperature: 0.2,
        }),
      })
      const data = await r.json()
      let content = data.content?.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      try {
        setRcaContent(JSON.parse(content))
      } catch {
        setRcaContent(getFallbackRCA(problem))
      }
    } catch {
      setRcaContent(getFallbackRCA(problem))
    }

    setRcaAnalysisDuration(Date.now() - start)
    setRcaState('done')
  }

  const generateKB = async () => {
    if (!rcaContent || !selectedProblem) return
    setIsGeneratingKB(true)
    setKbModal(true)
    setKbContent('')

    try {
      const r = await fetch(`${API_URL}/api/groq/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a ServiceNow Knowledge Base article for this resolved problem:
Problem: ${selectedProblem.short_description || selectedProblem.shortDescription}
Root Cause: ${rcaContent.rootCause}
Resolution: ${rcaContent.capa?.join('; ')}

Format as a KB article with sections: Overview, Symptoms, Root Cause, Resolution Steps, Prevention. Max 400 words.`,
        }),
      })
      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try { const d = JSON.parse(line.slice(6)); if (d.token) setKbContent(p => p + d.token) } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
    setIsGeneratingKB(false)
  }

  const enrichCI = async (ci) => {
    setEnrichingCI(ci.id)
    try {
      const r = await fetch(`${API_URL}/api/groq/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Suggest missing CMDB attribute values for this CI:
Name: ${ci.name}, Type: ${ci.type}, Issues: ${ci.issues.join(', ')}
Return JSON: {"owner": "team name", "environment": "env name", "classification": "classification", "description": "one line"}`,
          maxTokens: 200,
          temperature: 0.2,
        }),
      })
      const data = await r.json()
      try {
        const vals = JSON.parse(data.content?.replace(/```json\n?/, '').replace(/\n?```/, '') || '{}')
        setEnrichedCIs(prev => ({ ...prev, [ci.id]: vals }))
        setCmdbHealth(prev => Math.min(prev + 3, 94))
      } catch { /* ignore */ }
    } catch { /* ignore */ }
    setEnrichingCI(null)
  }

  return (
    <div className="min-h-screen bg-humana-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Activity size={12} className="text-purple-600" />
              UC #41 · ESC / ITSM
            </div>
            <h1 className="text-xl font-bold text-humana-navy">AI RCA Agent + CMDB Enrichment</h1>
            <p className="text-sm text-gray-500 mt-0.5">Problem management intelligence + continuous CMDB health improvement</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">ServiceNow Connected</span>
            <span className="w-2 h-2 rounded-full bg-humana-green animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === i ? 'border-humana-green text-humana-navy' : 'border-transparent text-gray-500 hover:text-humana-navy'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: RCA */}
      {activeTab === 0 && (
        <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Left: Problem Ticket */}
          <div className="flex flex-col gap-4">
            <div className="card-humana p-4">
              <h3 className="font-semibold text-humana-navy text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Problem Tickets
              </h3>
              <div className="space-y-2">
                {problems.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => runRCA(p)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedProblem === p ? 'border-humana-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-humana-navy">{p.number}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${p.state === 'Assess' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{p.state}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-tight line-clamp-2">{p.short_description || p.shortDescription}</p>
                    {(p.impacted_services || p.linked_incidents) && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {(p.impacted_services || []).slice(0, 2).map(s => (
                          <span key={s} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => problems[0] && runRCA(problems[0])}
                disabled={rcaState === 'loading'}
                className="mt-3 w-full btn-primary text-sm justify-center"
              >
                {rcaState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {rcaState === 'loading' ? 'Analyzing...' : 'Run AI RCA'}
              </button>
            </div>
          </div>

          {/* Center: RCA Engine */}
          <div className="flex flex-col gap-4">
            {rcaState === 'loading' && (
              <div className="card-humana p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Loader2 size={16} className="animate-spin text-humana-green" />
                  <span className="text-sm font-semibold text-humana-navy">AI RCA Engine Processing</span>
                  <LiveIndicator label="LIVE" />
                </div>
                {['Querying incident database...', 'Correlating change records...', 'Analyzing monitoring alerts...', 'Cross-referencing CMDB...', 'Ingesting vendor advisories...', 'Building 5-Why chain...'].map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }}
                    className="flex items-center gap-2 py-1.5 text-xs text-gray-600">
                    <CheckCircle2 size={12} className="text-humana-green" />
                    {step}
                  </motion.div>
                ))}
              </div>
            )}

            {rcaContent && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                {/* Root Cause */}
                <div className="card-humana p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Probable Root Cause</span>
                    {rcaContent.confidence && (
                      <span className="text-xs bg-green-100 text-humana-green font-bold px-2 py-0.5 rounded-full">{rcaContent.confidence}% confidence</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-humana-navy">{rcaContent.rootCause}</p>
                  {rcaDuration && <p className="text-xs text-gray-400 mt-1">Groq analyzed in {(rcaDuration / 1000).toFixed(2)}s</p>}
                </div>

                {/* 5-Why */}
                <div className="card-humana p-4">
                  <h4 className="text-xs font-bold text-humana-navy uppercase tracking-wide mb-3">5-Why Analysis</h4>
                  <div className="space-y-1.5">
                    {(rcaContent.fiveWhy || []).map((item, i) => <FiveWhyCard key={i} fiveWhy={item} index={i} />)}
                  </div>
                </div>

                {/* Evidence */}
                {rcaContent.evidence?.length > 0 && (
                  <div className="card-humana p-4">
                    <h4 className="text-xs font-bold text-humana-navy uppercase tracking-wide mb-3">Supporting Evidence</h4>
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-400 text-left"><th className="pb-1">Signal</th><th className="pb-1">Detail</th><th className="pb-1">Time</th></tr></thead>
                      <tbody>
                        {rcaContent.evidence.map((e, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="py-1 text-humana-navy font-semibold">{e.signal}</td>
                            <td className="py-1 text-gray-600">{e.detail}</td>
                            <td className="py-1 font-mono text-gray-400">{e.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right: Actions + CAPA */}
          <div className="flex flex-col gap-4">
            {rcaContent && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                {/* CAPA */}
                <div className="card-humana p-4">
                  <h4 className="text-xs font-bold text-humana-navy uppercase tracking-wide mb-3">CAPA Recommendations</h4>
                  <ol className="space-y-2">
                    {(rcaContent.capa || []).map((item, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-humana-navy text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Workaround */}
                {rcaContent.workaround && (
                  <div className="card-humana p-4 bg-amber-50 border border-amber-200">
                    <h4 className="text-xs font-bold text-amber-700 mb-2">Immediate Workaround</h4>
                    <p className="text-xs text-gray-700">{rcaContent.workaround}</p>
                  </div>
                )}

                {/* Similar incidents */}
                {rcaContent.similarIncidents?.length > 0 && (
                  <div className="card-humana p-4">
                    <h4 className="text-xs font-bold text-humana-navy uppercase tracking-wide mb-3">Similar Historical Incidents</h4>
                    <div className="space-y-2">
                      {rcaContent.similarIncidents.map((inc, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                          <div className="flex justify-between mb-0.5">
                            <span className="font-mono font-bold text-humana-navy">{inc.number}</span>
                            <span className="text-gray-400">{inc.date}</span>
                          </div>
                          <p className="text-gray-600">{inc.resolution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <button onClick={generateKB} disabled={isGeneratingKB} className="btn-primary text-sm justify-center">
                    <FileText size={14} />
                    Generate KEDB Article
                  </button>
                  <div>
                    <textarea value={workNotes} onChange={e => setWorkNotes(e.target.value)}
                      placeholder="Add work notes to ServiceNow ticket..."
                      className="w-full text-xs p-2.5 rounded-lg border border-gray-200 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-humana-green/30" />
                    <button className="mt-1 w-full btn-secondary text-xs py-1.5 justify-center">Post Work Notes</button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CMDB */}
      {activeTab === 1 && (
        <div className="p-4">
          {/* Health Scoreboard */}
          <div className="card-humana p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-humana-navy text-sm flex items-center gap-2">
                <Database size={14} className="text-humana-teal" />
                CMDB Health Dashboard
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Overall Health:</span>
                <span className="text-2xl font-black text-amber-600">
                  <MetricCounter value={cmdbHealth} duration={1000} suffix="%" />
                </span>
                <span className="text-xs text-gray-400">(target: 95%)</span>
              </div>
            </div>
            <div className="flex justify-around flex-wrap gap-4">
              {HEALTH_METRICS.map(m => (
                <DonutChart key={m.label} value={m.value} color={m.color} label={m.label} size={72} />
              ))}
            </div>
          </div>

          {/* CI Quality Table */}
          <div className="card-humana overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-humana-navy text-sm">CI Data Quality Issues</h3>
              <span className="text-xs text-gray-400">{CMDB_CIS.length} CIs with issues</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 font-semibold">
                    <th className="px-4 py-2.5 text-left">CI Name</th>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-left">Issues</th>
                    <th className="px-4 py-2.5 text-left">Last Seen</th>
                    <th className="px-4 py-2.5 text-left">Similar CI</th>
                    <th className="px-4 py-2.5 text-left">Quality</th>
                    <th className="px-4 py-2.5 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {CMDB_CIS.map((ci, i) => (
                    <motion.tr key={ci.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-humana-navy">{ci.name}</div>
                        <div className="text-xs text-gray-400">{ci.id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{ci.type}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ci.issues.map(issue => (
                            <span key={issue} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">{issue}</span>
                          ))}
                        </div>
                        {enrichedCIs[ci.id] && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.entries(enrichedCIs[ci.id]).map(([k, v]) => (
                              <span key={k} className="text-xs bg-green-50 text-humana-green px-1.5 py-0.5 rounded border border-green-100">
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{ci.lastSeen}</td>
                      <td className="px-4 py-3 text-xs">
                        {ci.similarity ? <span className="text-amber-600 font-semibold">{ci.similarity}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden" style={{ width: 48 }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${ci.score}%`, backgroundColor: ci.score >= 70 ? '#00A651' : ci.score >= 40 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: ci.score >= 70 ? '#00A651' : ci.score >= 40 ? '#f59e0b' : '#ef4444' }}>{enrichedCIs[ci.id] ? Math.min(ci.score + 25, 100) : ci.score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => enrichCI(ci)}
                          disabled={enrichingCI === ci.id || !!enrichedCIs[ci.id]}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${enrichedCIs[ci.id] ? 'bg-green-100 text-humana-green' : 'bg-humana-navy text-white hover:bg-blue-900'}`}
                        >
                          {enrichingCI === ci.id ? <Loader2 size={10} className="animate-spin" /> : enrichedCIs[ci.id] ? <CheckCircle2 size={10} /> : <Zap size={10} />}
                          {enrichedCIs[ci.id] ? 'Enriched' : 'AI Enrich'}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {Object.keys(enrichedCIs).length} CIs enriched — CMDB health: <span className="text-humana-green font-semibold">{cmdbHealth}%</span>
              </span>
              <button className="btn-primary text-xs py-1.5">Batch Approve All AI Suggestions</button>
            </div>
          </div>
        </div>
      )}

      {/* KB Modal */}
      <AnimatePresence>
        {kbModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-humana-navy">Generated KEDB Article Draft</h2>
                <button onClick={() => setKbModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {isGeneratingKB ? (
                  <div className="flex items-center gap-2 text-xs text-humana-green mb-3"><Loader2 size={12} className="animate-spin" /> Generating KB article...</div>
                ) : null}
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{kbContent}{isGeneratingKB && <span className="inline-block w-2 h-4 bg-humana-green animate-pulse ml-0.5" />}</pre>
              </div>
              <div className="px-6 py-4 border-t flex gap-2">
                <button className="btn-primary text-sm"><CheckCircle2 size={14} /> Publish to ServiceNow KB</button>
                <button onClick={() => setKbModal(false)} className="btn-secondary text-sm">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getMockProblems() {
  return [
    { number: 'PRB0098234', short_description: 'Recurring OOMKilled events in claims-processing namespace during peak hours', state: 'Assess', priority: '1', impacted_services: ['claims-processing', 'pharmacy-services'], linked_incidents: ['INC4782341', 'INC4779012', 'INC4774533'], assigned_to: 'Platform Engineering' },
    { number: 'PRB0097891', short_description: 'Intermittent Terraform state lock conflicts during concurrent deployments', state: 'Root Cause Analysis', priority: '2', impacted_services: ['Automation Engineering', 'Platform Build'], linked_incidents: ['INC4780234', 'INC4776102'], assigned_to: 'Automation Engineering' },
  ]
}

function getFallbackRCA(problem) {
  return {
    rootCause: 'Recurring OOMKilled events caused by batch job CLAIMS-ADJUD-NIGHTLY processing 3x normal volume due to duplicate records from upstream ETL misconfiguration, combined with insufficient memory limits on claims-processing pods.',
    confidence: 94,
    fiveWhy: [
      { why: 1, question: 'Why did the claims-processing service fail?', answer: 'Pods were OOMKilled when memory usage exceeded configured limits of 4Gi' },
      { why: 2, question: 'Why did memory usage exceed limits?', answer: 'Batch job CLAIMS-ADJUD-NIGHTLY was processing 3x normal record volume (5.4M vs 1.8M expected)' },
      { why: 3, question: 'Why was volume 3x normal?', answer: 'Upstream Informatica ETL sent duplicate records due to a misconfigured deduplication transformation rule' },
      { why: 4, question: 'Why was the transformation rule misconfigured?', answer: 'Change ticket CHG0045231 applied an incorrect ETL mapping rule during the weekly maintenance window' },
      { why: 5, question: 'Why was the incorrect rule not caught in change review?', answer: 'The ETL change bypassed the mandatory peer review step due to an emergency change escalation, and post-change validation only checked row count, not deduplication output' },
    ],
    evidence: [
      { signal: 'Dynatrace Alert', detail: 'OOMKilled events × 47 in claims-processing namespace', timestamp: '01:23 AM' },
      { signal: 'Informatica Log', detail: 'Deduplication rule DEDUP_ELIGIBILITY output: 5.4M records (3x baseline)', timestamp: '01:15 AM' },
      { signal: 'Change Record', detail: 'CHG0045231 — ETL mapping rule update approved via emergency CAB', timestamp: 'Yesterday 11:45 PM' },
      { signal: 'Kubernetes Event', detail: 'Pod claims-adjud-worker-7f8b9 killed: OOMKilled (limit: 4Gi, used: 4.1Gi)', timestamp: '01:24 AM' },
    ],
    capa: [
      'Revert ETL transformation rule to CHG0045230 configuration immediately',
      'Implement deduplication validation at Informatica ingestion layer with threshold alerting',
      'Increase claims-processing pod memory limits to 8Gi with HPA autoscaling',
      'Enforce mandatory peer review for all ETL change types — remove emergency bypass option',
      'Add post-change validation rule to verify deduplication output row count vs baseline',
    ],
    workaround: 'Restart CLAIMS-ADJUD-NIGHTLY from checkpoint record 1,200,001 after reverting ETL rule. Monitor memory usage for first 30 minutes of execution.',
    similarIncidents: [
      { number: 'INC4612345', date: '2024-01-15', resolution: 'ETL duplicate records caused OOM on pharmacy-services — resolved by restarting from checkpoint after ETL correction' },
      { number: 'INC4534211', date: '2023-11-08', resolution: 'claims-processing memory spike traced to eligibility feed volume spike — resolved by horizontal pod autoscaling' },
    ],
  }
}
