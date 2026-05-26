import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChevronDown, Minimize2, Maximize2, Search, X } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildLabels(range) {
  const now = new Date()
  if (range === '1H') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getTime() - (55 - i * 5) * 60000)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  }
  if (range === '7D') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000)
      return d.toLocaleDateString([], { month: 'short', day: '2-digit' })
    })
  }
  // 24H — 12 points, every 2 hrs
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getTime() - (22 - i * 2) * 3600000)
    return d.toLocaleTimeString([], { hour: '2-digit' })
  })
}

function walk(val, step, min, max) {
  const next = val + (Math.random() * 2 - 1) * step
  return Math.round(Math.max(min, Math.min(max, next)) * 10) / 10
}

function seedSeries(n, base, variance) {
  const out = []
  let v = base
  for (let i = 0; i < n; i++) {
    v = walk(v, variance, base - variance * 4, base + variance * 4)
    out.push(Math.round(v * 10) / 10)
  }
  return out
}

// Representative KPI baselines per time window
const RANGE_SEEDS = {
  '1H':  { agentEff: 94, effortSaved: 83, mttrMin: 27, activeInc: 2, noiseRed: 69, coverage: 99, logsPerDayM: 8.5 },
  '24H': { agentEff: 91, effortSaved: 78, mttrMin: 43, activeInc: 3, noiseRed: 63, coverage: 98, logsPerDayM: 7.8 },
  '7D':  { agentEff: 85, effortSaved: 72, mttrMin: 61, activeInc: 6, noiseRed: 55, coverage: 95, logsPerDayM: 7.0 },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Gauge({ value, label, color }) {
  const data = [
    { value,           fill: color    },
    { value: 100 - value, fill: '#EEF2F7' },
  ]
  return (
    <div className="relative flex flex-col items-center">
      <PieChart width={152} height={86}>
        <Pie data={data} cx={76} cy={80}
          startAngle={180} endAngle={0}
          innerRadius={50} outerRadius={68}
          paddingAngle={0} dataKey="value"
          stroke="none" isAnimationActive={false}>
          {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
        </Pie>
      </PieChart>
      <div className="absolute bottom-1.5 flex flex-col items-center"
        style={{ left: '50%', transform: 'translateX(-50%)' }}>
        <span className="text-[19px] font-black leading-none" style={{ color }}>{value}%</span>
        <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-gray-400">{label}</span>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="text-gray-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="font-bold" style={{ color: p.color ?? p.fill }}>
          {p.value}{unit}
        </div>
      ))}
    </div>
  )
}

function SevPill({ level }) {
  const cls = {
    Critical : 'bg-red-50 text-red-700 border-red-200',
    Degraded : 'bg-amber-50 text-amber-700 border-amber-200',
    Stable   : 'bg-green-50 text-green-700 border-green-200',
  }[level] ?? ''
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cls}`}>
      {level}
    </span>
  )
}

// ─── Drill-down modal ─────────────────────────────────────────────────────────

const SAMPLE_INCIDENTS = {
  P1: [
    { title: 'Payments API latency spike',       owner: 'SRE',      eta: '25m' },
    { title: 'Authentication outage (regional)', owner: 'IAM',      eta: '40m' },
    { title: 'Database failover instability',    owner: 'DBA',      eta: '55m' },
  ],
  P2: [
    { title: 'Customer Portal intermittent errors', owner: 'AppOps',   eta: '2h'  },
    { title: 'Edge packet loss (ISP route)',         owner: 'NetOps',   eta: '3h'  },
    { title: 'Queue backlog rising',                 owner: 'Platform', eta: '90m' },
  ],
  P3: [
    { title: 'Disk nearing threshold (non-prod)', owner: 'InfraOps', eta: '1d' },
    { title: 'Noisy alert rule needs tuning',     owner: 'Obs',      eta: '8h' },
    { title: 'Certificate renewal upcoming',      owner: 'SecOps',   eta: '2d' },
  ],
}

function DrillModal({ priority, onClose }) {
  return (
    <AnimatePresence>
      {priority && (
        <motion.div key="backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div key="panel"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <span className="text-sm font-bold text-humana-navy uppercase tracking-wider">
                Incident Drill-down — {priority}
              </span>
              <button onClick={onClose}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500">
                <X size={14} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[11px] text-gray-400 mb-4">
                Sample incident feed — wire to live ServiceNow / PagerDuty for production.
              </p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">
                  <span>Incident</span><span>Owner</span><span>ETA</span>
                </div>
                {SAMPLE_INCIDENTS[priority]?.map((inc, i) => (
                  <div key={i} className={`grid grid-cols-3 gap-3 px-4 py-3 text-[11px] text-gray-700 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <span>{inc.title}</span>
                    <span className="font-semibold text-humana-navy">{inc.owner}</span>
                    <span>{inc.eta}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Panel card ───────────────────────────────────────────────────────────────

function Panel({ accentBg = '#F0FDF8', title, badge, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden flex flex-col bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100"
        style={{ background: accentBg }}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-humana-navy">{title}</span>
        {badge && (
          <span className="text-[10px] px-2.5 py-1 rounded-full border border-gray-200 font-semibold text-gray-400 bg-white">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ITOpsCommandCenter({ towersRef }) {
  const [expanded, setExpanded] = useState(true)
  const [range, setRange]       = useState('24H')
  const [search, setSearch]     = useState('')
  const [modalPriority, setModalPriority] = useState(null)

  // Keep a ref so the live-tick closure always sees the current range
  const rangeRef = useRef(range)
  useEffect(() => { rangeRef.current = range }, [range])

  const [kpi, setKpi] = useState(RANGE_SEEDS['24H'])

  // Series length driven by current range
  const seriesLen = buildLabels(range).length

  const [obsSeries,   setObsSeries]   = useState(() => seedSeries(seriesLen, 7.8, 0.25))
  const [mttrSeries,  setMttrSeries]  = useState(() => seedSeries(seriesLen, 42,  2.5))
  const [noiseSeries, setNoiseSeries] = useState(() => seedSeries(seriesLen, 62,  2.0))

  // Re-seed KPIs and all chart series when range changes
  useEffect(() => {
    const seeds = RANGE_SEEDS[range]
    setKpi(seeds)
    const n = buildLabels(range).length
    const v = range === '7D' ? { obs: 0.35, mttr: 3.5, noise: 2.5 } : range === '1H' ? { obs: 0.15, mttr: 1.8, noise: 1.5 } : { obs: 0.25, mttr: 2.5, noise: 2.0 }
    setObsSeries(seedSeries(n, seeds.logsPerDayM, v.obs))
    setMttrSeries(seedSeries(n, seeds.mttrMin,    v.mttr))
    setNoiseSeries(seedSeries(n, seeds.noiseRed,  v.noise))
  }, [range])

  // Live simulation — uses rangeRef so it always matches current range length
  useEffect(() => {
    const id = setInterval(() => {
      const expectedLen = buildLabels(rangeRef.current).length

      setKpi(prev => ({
        agentEff    : walk(prev.agentEff,     1.2, 70,  98),
        effortSaved : walk(prev.effortSaved,  1.0, 55,  92),
        mttrMin     : walk(prev.mttrMin,      2.2, 18, 110),
        noiseRed    : walk(prev.noiseRed,     1.8, 20,  85),
        coverage    : walk(prev.coverage,     0.4, 85,  99),
        logsPerDayM : walk(prev.logsPerDayM,  0.2, 4.0, 12.0),
        activeInc   : Math.max(0, Math.min(12,
          prev.activeInc + (Math.random() < 0.55 ? 0 : Math.random() < 0.5 ? 1 : -1))),
      }))

      // Push one new point; if length drifted (range changed) re-seed to correct length
      const pushPoint = (setter, fallback, step, lo, hi) => {
        setter(s => {
          if (s.length !== expectedLen) return seedSeries(expectedLen, s[s.length - 1] ?? fallback, step)
          const a = [...s]
          a.shift()
          a.push(walk(a[a.length - 1] ?? fallback, step, lo, hi))
          return a
        })
      }
      pushPoint(setObsSeries,   7.8, 0.25, 3.5,  12.5)
      pushPoint(setMttrSeries,  42,  2.5,  15,   130)
      pushPoint(setNoiseSeries, 62,  2.0,  10,   90)
    }, 3000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Build labelled chart data (labels derived from range, never stale)
  const toPoints = (arr) => {
    const ls = buildLabels(range)
    return arr.map((v, i) => ({ t: ls[i] ?? '', v }))
  }

  const incCounts = [
    { label: 'P1', count: Math.max(0, Math.min(4,  Math.round(kpi.activeInc * 0.25))), fill: '#EF4444' },
    { label: 'P2', count: Math.max(0, Math.min(6,  Math.round(kpi.activeInc * 0.45))), fill: '#F59E0B' },
    { label: 'P3', count: Math.max(0, Math.min(12, Math.round(kpi.activeInc * 1.10))), fill: '#0099A8' },
  ]

  const KPI_TILES = [
    { label: 'Agent Efficiency',       value: `${Math.round(kpi.agentEff)}%`,    hint: 'Autonomous resolution + enrichment',  color: '#00A651', dot: '#00A651' },
    { label: 'Effort Saved',           value: `${Math.round(kpi.effortSaved)}%`, hint: 'L1/L2 deflection & automation',       color: '#0099A8', dot: '#0099A8' },
    { label: 'MTTR',                   value: `${Math.round(kpi.mttrMin)}m`,      hint: 'Mean time to restore service',        color: '#F59E0B', dot: '#F59E0B' },
    { label: 'Active Incidents',       value: `${kpi.activeInc}`,                 hint: 'P1/P2 aging & blast radius',          color: '#EF4444', dot: '#EF4444' },
    { label: 'Alert Noise Reduction',  value: `${Math.round(kpi.noiseRed)}%`,    hint: 'Correlation, suppression, dedupe',    color: '#F59E0B', dot: '#F59E0B' },
    { label: 'Observability Coverage', value: `${Math.round(kpi.coverage)}%`,    hint: 'Infra + app + business KPIs',         color: '#0891B2', dot: '#0891B2' },
  ]

  const SERVICES = [
    { name: 'Customer Portal', health: 'Degraded', risk: 'Medium', riskColor: '#F59E0B' },
    { name: 'Payments API',    health: 'Critical', risk: 'High',   riskColor: '#EF4444' },
    { name: 'Network Edge',    health: 'Stable',   risk: 'Low',    riskColor: '#00A651' },
  ].filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))

  const gridColor = 'rgba(0,0,0,0.05)'

  return (
    <>
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 pt-5 pb-0">

          {/* ── Top bar ── */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-humana-green animate-pulse-slow" />
                <h2 className="text-[13px] font-black uppercase tracking-[0.10em] text-humana-teal">
                  IT Operations AI Control Panel
                </h2>
              </div>
              <p className="text-[11px] text-gray-400">
                Agentic efficiency · effort saved · SRE signals · incident health
                &nbsp;·&nbsp;
                <span className="font-semibold text-humana-navy">SYSTEM STATUS: OPTIMAL</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Time range */}
              <div className="flex gap-0.5 rounded-full border border-gray-200 bg-gray-50 p-1">
                {['1H', '24H', '7D'].map(r => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      range === r
                        ? 'bg-white text-humana-navy shadow ring-1 ring-gray-200'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 min-w-[172px]">
                <Search size={11} className="text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search service / region…"
                  className="bg-transparent outline-none text-[11px] flex-1 text-gray-700 placeholder:text-gray-400"
                />
              </div>

              {/* Expand / collapse */}
              <button onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm transition-all">
                {expanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                {expanded ? 'Minimize' : 'Expand'}
              </button>
            </div>
          </div>

          {/* ── KPI tiles (always visible) ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {KPI_TILES.map(tile => (
              <div key={tile.label}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tile.dot }} />
                  <span className="text-[10px] font-semibold text-gray-500 leading-tight">{tile.label}</span>
                </div>
                <div className="text-[22px] font-black leading-none" style={{ color: tile.color }}>{tile.value}</div>
                <div className="text-[10px] text-gray-400 leading-snug">{tile.hint}</div>
              </div>
            ))}
          </div>

          {/* ── Expandable charts ── */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div key="charts"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.30, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                  {/* LEFT — gauges + service health */}
                  <div className="flex flex-col gap-3">
                    <Panel title="AI Agent Performance" badge="LIVE" accentBg="#F0FDF8">
                      <div className="grid grid-cols-2 gap-1 p-4">
                        <Gauge value={Math.round(kpi.agentEff)}    label="Agent Eff."   color="#00A651" />
                        <Gauge value={Math.round(kpi.effortSaved)} label="Effort Saved" color="#0099A8" />
                      </div>
                    </Panel>

                    <Panel title="Service Health" accentBg="#F0F9FF">
                      <div>
                        <div className="grid grid-cols-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">
                          <span>Service</span><span>Health</span><span>Risk</span>
                        </div>
                        {SERVICES.length === 0 ? (
                          <div className="px-4 py-3 text-[11px] text-gray-400">No matches for "{search}"</div>
                        ) : SERVICES.map((s, i) => (
                          <div key={i} className={`grid grid-cols-3 items-center px-4 py-3 text-[11px] text-gray-700 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                            <span className="font-medium truncate pr-1">{s.name}</span>
                            <span><SevPill level={s.health} /></span>
                            <span className="font-bold" style={{ color: s.riskColor }}>{s.risk}</span>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>

                  {/* MIDDLE — telemetry + MTTR */}
                  <div className="flex flex-col gap-3">
                    <Panel title="Telemetry Volume" badge={`${kpi.logsPerDayM.toFixed(1)}M logs/day`} accentBg="#F0F9FF">
                      <div className="p-3" style={{ height: 188 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={toPoints(obsSeries)} margin={{ top: 4, right: 6, bottom: 0, left: -14 }}>
                            <defs>
                              <linearGradient id="obsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#0099A8" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="#0099A8" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                            <Tooltip content={<ChartTooltip unit="M" />} />
                            <Area type="monotone" dataKey="v" stroke="#0099A8" strokeWidth={1.8}
                              fill="url(#obsGrad)" dot={false} isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>

                    <Panel title="Service Recovery — MTTR" badge={`${Math.round(kpi.mttrMin)}m avg`} accentBg="#F0FDF8">
                      <div className="p-3" style={{ height: 166 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={toPoints(mttrSeries)} margin={{ top: 4, right: 6, bottom: 0, left: -14 }}>
                            <defs>
                              <linearGradient id="mttrGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#00A651" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="#00A651" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                            <Tooltip content={<ChartTooltip unit="m" />} />
                            <Area type="monotone" dataKey="v" stroke="#00A651" strokeWidth={1.8}
                              fill="url(#mttrGrad)" dot={false} isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>
                  </div>

                  {/* RIGHT — incidents + noise */}
                  <div className="flex flex-col gap-3">
                    <Panel title="Open Incidents by Priority" badge="click to drill" accentBg="#FFF8F0">
                      <div className="p-3" style={{ height: 188 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={incCounts}
                            margin={{ top: 4, right: 6, bottom: 0, left: -14 }}
                            onClick={d => { if (d?.activePayload?.[0]) setModalPriority(d.activePayload[0].payload.label) }}
                            style={{ cursor: 'pointer' }}>
                            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                              {incCounts.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>

                    <Panel title="Alert Noise Reduction" badge="correlation & dedupe" accentBg="#FFFBF0">
                      <div className="p-3" style={{ height: 166 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={toPoints(noiseSeries)} margin={{ top: 4, right: 6, bottom: 0, left: -14 }}>
                            <defs>
                              <linearGradient id="noiseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip content={<ChartTooltip unit="%" />} />
                            <Area type="monotone" dataKey="v" stroke="#F59E0B" strokeWidth={1.8}
                              fill="url(#noiseGrad)" dot={false} isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Transition bridge ── */}
        <div className="border-t border-gray-100 flex flex-col items-center gap-1.5 py-4">
          <button
            onClick={() => towersRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full border border-humana-green/30 bg-humana-green/10 text-humana-green text-xs font-bold hover:bg-humana-green/20 transition-all">
            Explore AI Capabilities by Tower
            <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform duration-150" />
          </button>
          <p className="text-[10px] text-gray-400">45 use cases across 2 towers · 9 live demos</p>
        </div>
      </section>

      <DrillModal priority={modalPriority} onClose={() => setModalPriority(null)} />
    </>
  )
}
