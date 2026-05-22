import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, AlertTriangle, Zap, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import MetricCounter from '../components/MetricCounter'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const SEV_BAR = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-400' }

export default function FinOpsCostAgent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisDone, setAnalysisDone] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/finops/summary`)
      const d = await r.json()
      setData(d)
      setMode(d.mode)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const runAnalysis = async () => {
    if (!data) return
    setAnalysis('')
    setIsAnalyzing(true)
    setAnalysisDone(false)
    const totalSpend = data.services?.reduce((s, sv) => s + Number(sv.amount), 0).toFixed(0)
    const topService = data.services?.[0]?.service

    try {
      const r = await fetch(`${API_URL}/api/finops/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomalies: data.anomalies, totalSpend, topService }),
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
            if (d.token) setAnalysis(p => p + d.token)
            if (d.done) setAnalysisDone(true)
          } catch { /* ignore */ }
        }
      }
    } finally { setIsAnalyzing(false) }
  }

  const totalSpend = data?.services?.reduce((s, sv) => s + Number(sv.amount), 0) || 0
  const anomalyCount = data?.anomalies?.length || 0

  const chartData = (data?.costs || []).map(c => ({
    date: c.date.slice(5),
    amount: Number(c.amount),
    anomaly: (data?.anomalies || []).some(a => a.date === c.date) ? Number(c.amount) : null,
  }))

  return (
    <div className="min-h-screen bg-humana-light">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign size={12} className="text-amber-600" />
              UC #35 · IT Infra Ops — FinOps
            </div>
            <h1 className="text-xl font-bold text-humana-navy">FinOps Cost Anomaly Detection & Budget Forecasting</h1>
            <p className="text-sm text-gray-500 mt-0.5">AI-powered Azure spend intelligence — detect anomalies before end-of-month billing surprises</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${mode === 'live' ? 'bg-green-50 text-humana-green border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${mode === 'live' ? 'bg-humana-green' : 'bg-amber-500'}`} />
              Azure {mode === 'live' ? 'Cost API (Live)' : 'Demo Mode'}
            </div>
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-humana-navy text-white px-6 py-3 flex flex-wrap items-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-white/60">Anomalies detected:</span>
          <span className={`font-black text-lg ${anomalyCount > 0 ? 'text-red-400' : 'text-humana-green'}`}>{anomalyCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60">Data source:</span>
          <span className="text-humana-green font-semibold">{data?.mode === 'live' ? 'Azure Cost Management (Live)' : 'Demo mode'}</span>
        </div>
        {data?.mode !== 'live' && (
          <span className="text-amber-400 text-xs">Add Cost Management Reader role to service principal for live data</span>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Cost trend chart + anomalies */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="card-humana p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-humana-navy flex items-center gap-2">
                <TrendingUp size={14} className="text-humana-teal" />Daily Azure Spend — Month to Date
              </h3>
              {anomalyCount > 0 && (
                <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">{anomalyCount} anomalies highlighted</span>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0099A8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0099A8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [Number(v).toLocaleString(), 'Daily Spend']} />
                  <Area type="monotone" dataKey="amount" stroke="#0099A8" strokeWidth={2} fill="url(#costGrad)" />
                  {chartData.filter(d => d.anomaly).map((d, i) => (
                    <ReferenceDot key={i} x={d.date} y={d.amount} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Service breakdown */}
          <div className="card-humana p-4">
            <h3 className="text-sm font-semibold text-humana-navy mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-amber-500" />Spend by Azure Service
            </h3>
            <div className="space-y-2.5">
              {(data?.services || []).map((svc, i) => {
                const pct = Math.round((Number(svc.amount) / totalSpend) * 100)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 truncate">{svc.service}</span>
                      <span className="font-bold text-humana-navy ml-2">{Number(svc.amount).toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.07, duration: 0.6 }}
                        className="h-full rounded-full" style={{ backgroundColor: ['#0099A8','#00A651','#002855','#F59E0B','#6366f1','#ec4899','#14b8a6','#94a3b8'][i] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Anomalies + AI Analysis */}
        <div className="flex flex-col gap-4">
          {/* Anomalies */}
          <div className="card-humana p-4">
            <h3 className="text-sm font-semibold text-humana-navy mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />Detected Anomalies
            </h3>
            {(data?.anomalies || []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No anomalies detected in current period</p>
            ) : (
              <div className="space-y-2">
                {(data?.anomalies || []).map((a, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500">{a.date}</span>
                      <span className="text-xs font-bold text-red-600">+{a.pct}% over expected</span>
                    </div>
                    <div className="text-sm font-bold text-humana-navy">Anomalous spend detected</div>
                    <div className="text-xs text-gray-500 mt-0.5">{a.reason || a.service}</div>
                    <div className="text-xs text-gray-400 mt-0.5">+{a.pct}% above daily baseline</div>
                  </motion.div>
                ))}
              </div>
            )}
            <button onClick={runAnalysis} disabled={isAnalyzing || !data} className="mt-3 w-full btn-primary text-sm justify-center">
              {isAnalyzing ? <><Loader2 size={13} className="animate-spin" />Analyzing...</> : <><Zap size={13} />AI Cost Analysis</>}
            </button>
          </div>

          {/* AI analysis output */}
          {(analysis || isAnalyzing) && (
            <div className="card-humana p-4 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-humana-navy">Groq AI Recommendations</span>
                {isAnalyzing && <LiveIndicator label="STREAMING" color="teal" />}
                {analysisDone && <CheckCircle2 size={14} className="text-humana-green" />}
              </div>
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-72">
                {analysis}
                {isAnalyzing && <span className="inline-block w-1.5 h-4 bg-humana-green ml-0.5 animate-pulse align-text-bottom" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
