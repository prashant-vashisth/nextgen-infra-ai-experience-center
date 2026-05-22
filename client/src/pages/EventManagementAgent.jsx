import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, AlertTriangle, CheckCircle2, Loader2, Play, Zap, Activity, RefreshCw, ChevronRight } from 'lucide-react'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const SEV = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-blue-100 text-blue-700 border-blue-200',
}
const SEV_DOT = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-blue-400' }

const SOURCE_COLORS = {
  Dynatrace:     'text-emerald-700 bg-emerald-50 border-emerald-200',
  Splunk:        'text-orange-700 bg-orange-50 border-orange-200',
  'Azure Monitor':'text-blue-700 bg-blue-50 border-blue-200',
}

export default function EventManagementAgent({ scenario }) {
  const [phase, setPhase] = useState('idle')      // idle | streaming | deduped | analyzing | done
  const [alerts, setAlerts] = useState([])
  const [incidents, setIncidents] = useState([])
  const [selectedInc, setSelectedInc] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [healState, setHealState] = useState({})   // incidentId → 'healing' | 'done'
  const [noiseStats, setNoiseStats] = useState(null)
  const alertEndRef = useRef(null)

  const startDemo = async () => {
    setPhase('streaming')
    setAlerts([])
    setIncidents([])
    setSelectedInc(null)
    setAnalysis('')
    setNoiseStats(null)

    try {
      const r = await fetch(`${API_URL}/api/events/stream-dedup`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type === 'alert') {
              setAlerts(prev => [...prev, d.alert])
              alertEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
            if (d.type === 'status') setPhase('deduping')
            if (d.type === 'incident') setIncidents(prev => [...prev, d.incident])
            if (d.type === 'done') {
              setNoiseStats({ raw: d.raw, incidents: d.incidents, noise: d.noise })
              setPhase('deduped')
            }
          } catch { /* ignore */ }
        }
      }
    } catch { setPhase('idle') }
  }

  const analyzeIncident = async (inc) => {
    setSelectedInc(inc)
    setAnalysis('')
    setIsAnalyzing(true)
    try {
      const r = await fetch(`${API_URL}/api/events/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: inc.id }),
      })
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type === 'token') setAnalysis(prev => prev + d.token)
          } catch { /* ignore */ }
        }
      }
    } finally { setIsAnalyzing(false) }
  }

  const selfHeal = async (inc) => {
    setHealState(prev => ({ ...prev, [inc.id]: 'healing' }))
    await fetch(`${API_URL}/api/events/self-heal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId: inc.id }),
    })
    setHealState(prev => ({ ...prev, [inc.id]: 'done' }))
  }

  return (
    <div className="min-h-screen bg-humana-light">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Bell size={12} className="text-amber-500" />
              UC #22 · IT Operations — TOC / AOC
            </div>
            <h1 className="text-xl font-bold text-humana-navy">Event Management, Anomaly Detection & Self-Heal</h1>
            <p className="text-sm text-gray-500 mt-0.5">AIOps: multi-source alert ingestion → AI correlation → actionable incident clusters → auto-remediation</p>
          </div>
          <div className="flex items-center gap-3">
            {phase !== 'idle' && <LiveIndicator label={phase === 'streaming' ? 'INGESTING' : 'LIVE'} color={phase === 'streaming' ? 'amber' : 'green'} />}
            <button onClick={startDemo} disabled={phase === 'streaming'} className="btn-primary text-sm">
              {phase === 'streaming' ? <><Loader2 size={14} className="animate-spin" />Streaming...</> : <><Play size={14} fill="currentColor" />Start Demo</>}
            </button>
          </div>
        </div>
      </div>


      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* LEFT — Raw alert feed */}
        <div className="card-humana overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-humana-navy flex items-center gap-2">
              <Activity size={14} className="text-red-500" />Raw Alert Feed
            </span>
            {alerts.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{alerts.length} alerts</span>
            )}
          </div>
          <div className="h-96 overflow-y-auto p-3 space-y-1.5 bg-gray-950">
            {alerts.length === 0 ? (
              <p className="text-gray-600 text-xs text-center pt-16">Click "Start Demo" to stream incoming alerts</p>
            ) : (
              alerts.map((alert, i) => (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 text-xs font-mono">
                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${SEV_DOT[alert.severity]}`} />
                  <div>
                    <span className="text-gray-400">[{alert.source}] </span>
                    <span className="text-green-300">{alert.title}</span>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={alertEndRef} />
          </div>
        </div>

        {/* CENTER — AI Deduplication */}
        <div className="flex flex-col gap-4">
          {noiseStats && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="card-humana p-4 bg-gradient-to-r from-humana-navy to-[#003d7a] text-white">
              <div className="text-xs font-bold uppercase tracking-wide text-white/60 mb-2">AI Deduplication Result</div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-3xl font-black text-red-400">{noiseStats.raw}</div>
                  <div className="text-xs text-white/60">Raw Alerts</div>
                </div>
                <Zap size={24} className="text-humana-green" />
                <div className="text-center">
                  <div className="text-3xl font-black text-humana-green">{noiseStats.incidents}</div>
                  <div className="text-xs text-white/60">Actionable Incidents</div>
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-amber-400 font-semibold">{noiseStats.noise} noise alerts suppressed — {Math.round(noiseStats.noise / noiseStats.raw * 100)}% noise reduction</div>
            </motion.div>
          )}

          {/* Correlated incidents */}
          <div className="card-humana overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-humana-navy">Correlated Incidents</span>
            </div>
            <div className="p-3 space-y-2">
              {incidents.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-8">Incidents will appear after deduplication</p>
              ) : (
                incidents.map(inc => (
                  <motion.div key={inc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => analyzeIncident(inc)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${selectedInc?.id === inc.id ? 'border-humana-green bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${SEV[inc.severity]}`}>{inc.severity}</span>
                      <span className="text-xs text-humana-green font-bold bg-green-50 px-2 py-0.5 rounded-full">{inc.confidence}% confidence</span>
                    </div>
                    <div className="text-sm font-semibold text-humana-navy leading-tight mb-1">{inc.title}</div>
                    <div className="text-xs text-gray-500">{inc.rootAlerts?.length} alerts correlated · {inc.affectedService}</div>
                    <div className="flex items-center justify-between mt-2">
                      <button onClick={e => { e.stopPropagation(); selfHeal(inc) }}
                        disabled={healState[inc.id] === 'healing' || healState[inc.id] === 'done'}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${healState[inc.id] === 'done' ? 'bg-green-100 text-humana-green' : healState[inc.id] === 'healing' ? 'bg-gray-100 text-gray-500' : 'bg-humana-green text-white hover:bg-green-700'}`}>
                        {healState[inc.id] === 'healing' ? <><Loader2 size={10} className="animate-spin" />Healing...</> : healState[inc.id] === 'done' ? <><CheckCircle2 size={10} />Resolved</> : <><Zap size={10} />Self-Heal</>}
                      </button>
                      <span className="text-xs text-gray-400 flex items-center gap-1">AI Analysis <ChevronRight size={10} /></span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — AI Analysis */}
        <div className="card-humana p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-humana-navy flex items-center gap-2">
              <Zap size={14} className="text-humana-green" />AI Deep Analysis
            </span>
            {isAnalyzing && <LiveIndicator label="ANALYZING" color="teal" />}
          </div>

          {selectedInc ? (
            <>
              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                <div className="font-bold text-humana-navy">{selectedInc.title}</div>
                <div className="text-gray-500">Affected: <span className="font-semibold text-humana-teal">{selectedInc.affectedService}</span></div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {(analysis || isAnalyzing) ? (
                  <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {analysis}
                    {isAnalyzing && <span className="inline-block w-1.5 h-4 bg-humana-green ml-0.5 animate-pulse align-text-bottom" />}
                  </div>
                ) : null}
              </div>
              {selectedInc.selfHeal && (
                <div className="border-t border-gray-100 pt-3">
                  <div className="text-xs font-bold text-humana-navy mb-2">Self-Heal Actions</div>
                  <ol className="space-y-1.5">
                    {selectedInc.selfHeal.map((step, i) => (
                      <li key={i} className={`flex gap-2 text-xs ${healState[selectedInc.id] === 'done' ? 'text-humana-green' : 'text-gray-600'}`}>
                        <span className={`w-4 h-4 rounded-full text-white text-xs flex items-center justify-center shrink-0 font-bold ${healState[selectedInc.id] === 'done' ? 'bg-humana-green' : 'bg-gray-400'}`}>{i+1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-sm py-8">
              Click a correlated incident to trigger AI deep analysis
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
