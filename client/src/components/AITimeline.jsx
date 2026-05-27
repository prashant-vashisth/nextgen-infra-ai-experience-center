import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Link } from 'react-router-dom'
import { TIMELINE_MILESTONES, QUARTERS, SAVINGS_CURVE, TOWERS } from '../data/dashboard2Data'

// ── Gantt Roadmap (All Towers view) ───────────────────────────────────────────

const GANTT_LANES = [
  {
    id: 'foundation',
    label: 'AI Foundation\n& Platform',
    color: '#059669',
    rows: [
      {
        label: 'AI Platform Stabilization',
        bars: [
          { start: 1, end: 3, color: '#10B981', label: 'Platform Consolidation' },
          { start: 3, end: 6, color: '#34D399', label: 'AI Enhancement & Scaling' },
        ],
      },
    ],
  },
  {
    id: 'observability',
    label: 'AI Agents\n(Enterprise Observability)',
    color: '#1D4ED8',
    rows: [
      { label: 'Knowledge Assistant',            bars: [{ start: 1, end: 6, color: '#1D4ED8', label: 'Knowledge Assistant' }] },
      { label: 'Triaging / RCA Agents',          bars: [{ start: 1, end: 5, color: '#2563EB', label: 'Triaging / RCA Agents' }] },
      { label: 'SPL Copilot / Dashboard Agents', bars: [{ start: 1, end: 6, color: '#3B82F6', label: 'SPL Copilot / Dashboard Agents' }] },
    ],
  },
  {
    id: 'eai',
    label: 'AI Agents (EAI)',
    color: '#4F46E5',
    rows: [
      { label: 'Cert Renewal + Patching', bars: [{ start: 1, end: 6, color: '#4F46E5', label: 'Cert Renewal + Patching (continuous)' }] },
      { label: 'Self Healing',             bars: [{ start: 1, end: 5, color: '#6366F1', label: 'Self Healing' }] },
      { label: 'API Hub',                  bars: [{ start: 2, end: 6, color: '#818CF8', label: 'API Hub' }] },
    ],
  },
  {
    id: 'tcs',
    label: 'TCS AI Delivery\n(Q3 FY26 onward)',
    color: '#F59E0B',
    rows: [
      { label: 'TOC Intelligence Suite (8 UCs)', bars: [{ start: 1, end: 6, color: '#F59E0B', label: 'TOC AI Agents — 8 Use Cases' }] },
      { label: 'Network Ops Agents (4 UCs)',      bars: [{ start: 1, end: 5, color: '#FBBF24', label: 'Network Remediation & Self-Heal' }] },
      { label: 'ITSM Automation Suite (16 UCs)',  bars: [{ start: 1, end: 6, color: '#FCD34D', label: 'ITSM 16 Use Cases' }] },
    ],
  },
  {
    id: 'agent-obs',
    label: 'Agent Observability\n& Governance',
    color: '#0099A8',
    rows: [
      {
        label: 'Observability Pipeline',
        bars: [
          { start: 1, end: 3, color: '#0099A8', label: 'Cross-Agent Tracing' },
          { start: 3, end: 5, color: '#0EA5E9', label: 'Safety Visibility' },
          { start: 5, end: 6, color: '#38BDF8', label: 'Agent Governance Layer' },
        ],
      },
    ],
  },
]

const GANTT_MILESTONES = [
  { q: 0,   label: 'NOW',  color: '#00A651', lines: ['Q2 FY26 Active',  '2,764 Hrs/Mo saved',   '28 FTE equivalent'] },
  { q: 1,   label: 'TCS',  color: '#F59E0B', lines: ['TCS Engagement',  'Begins Q3 FY26',        '11 Towers in Scope'] },
  { q: 2.5, label: 'M3',   color: '#4F46E5', lines: ['40% MTTR reduction', '50–60% onboarding',  '3,905 Hrs/Mo'] },
  { q: 4.5, label: 'M4',   color: '#002855', lines: ['AI handles 60%+', 'work volume',            '5,500+ Hrs/Mo'] },
]

const Q_LABELS = ['Q2 FY26', 'Q3 FY26', 'Q4 FY26', 'Q1 FY27', 'Q2 FY27', 'Q3 FY27']
const N_Q = 6
const LABEL_W = 176

function GanttBar({ start, end, color, label, delay }) {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay, duration: 0.45, ease: 'easeOut' }}
      title={label}
      style={{
        position: 'absolute',
        top: 5,
        bottom: 5,
        left: `${(start / N_Q) * 100}%`,
        width: `calc(${((end - start) / N_Q) * 100}% - 2px)`,
        backgroundColor: color,
        borderRadius: 4,
        transformOrigin: 'left center',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 6,
        overflow: 'hidden',
      }}
    >
      <span style={{ fontSize: 9, color: 'white', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
    </motion.div>
  )
}

function QuarterGuides() {
  return Q_LABELS.map((_, qi) => (
    qi > 0 && (
      <div
        key={qi}
        style={{
          position: 'absolute',
          left: `${(qi / N_Q) * 100}%`,
          top: 0, bottom: 0,
          borderLeft: '1px solid #F3F4F6',
          pointerEvents: 'none',
        }}
      />
    )
  ))
}

function GanttRoadmap() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="text-base font-bold text-humana-navy">Integrated Implementation Roadmap</h3>
          <p className="text-xs text-gray-400 mt-0.5">Q2 FY26 – Q3 FY27 · TCS AI engagement from Q3 FY26</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {[
            { color: '#059669', label: 'Foundation' },
            { color: '#1D4ED8', label: 'Observability Agents' },
            { color: '#4F46E5', label: 'EAI Agents' },
            { color: '#F59E0B', label: 'TCS Delivery' },
            { color: '#0099A8', label: 'Agent Observability' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1">
              <span style={{ display: 'inline-block', width: 14, height: 8, borderRadius: 2, backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* TODAY / TCS markers strip */}
      <div className="flex mb-3">
        <div style={{ width: LABEL_W, flexShrink: 0 }} />
        <div className="flex-1 flex">
          {Q_LABELS.map((q, qi) => (
            <div key={q} style={{ flex: 1 }} className="flex justify-center">
              {qi === 0 && (
                <span style={{ fontSize: 9, fontWeight: 800, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: 4, border: '1px solid #86EFAC' }}>
                  ▼ TODAY
                </span>
              )}
              {qi === 1 && (
                <span style={{ fontSize: 9, fontWeight: 800, color: '#92400E', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: 4, border: '1px solid #FCD34D' }}>
                  TCS ▶
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 980 }}>

          {/* Quarter header */}
          <div className="flex mb-2">
            <div style={{ width: LABEL_W, flexShrink: 0 }} />
            <div className="flex-1 flex border-b-2 border-gray-200 pb-2">
              {Q_LABELS.map((q, qi) => (
                <div
                  key={q}
                  style={{
                    flex: 1,
                    backgroundColor: qi === 0 ? '#F0FDF4' : qi === 1 ? '#FFFBEB' : 'transparent',
                    borderRadius: 4,
                  }}
                  className="text-center text-xs font-bold"
                >
                  <span style={{ color: qi === 0 ? '#15803D' : qi === 1 ? '#92400E' : '#6B7280' }}>{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Swim lanes */}
          {GANTT_LANES.map((lane, laneIdx) => (
            <div key={lane.id} className="mb-2.5">

              {/* Lane header */}
              <div
                className="flex items-stretch rounded-t-lg"
                style={{ backgroundColor: lane.color + '18' }}
              >
                <div
                  style={{ width: LABEL_W, flexShrink: 0, borderLeft: `3px solid ${lane.color}` }}
                  className="px-3 py-2 flex items-center"
                >
                  <span className="text-xs font-bold leading-tight" style={{ color: lane.color }}>
                    {lane.label.split('\n').map((line, i, arr) => (
                      <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                    ))}
                  </span>
                </div>
                <div className="flex-1 flex relative">
                  {Q_LABELS.map((_, qi) => (
                    <div key={qi} style={{ flex: 1, borderLeft: qi > 0 ? `1px solid ${lane.color}20` : 'none', backgroundColor: qi === 0 ? '#F0FDF408' : qi === 1 ? '#FFFBEB10' : 'transparent' }} />
                  ))}
                </div>
              </div>

              {/* Data rows */}
              {lane.rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-stretch"
                  style={{ backgroundColor: rowIdx % 2 === 0 ? 'white' : '#FAFAFA', height: 34 }}
                >
                  <div
                    style={{ width: LABEL_W, flexShrink: 0, borderLeft: `3px solid ${lane.color}25` }}
                    className="px-3 flex items-center"
                  >
                    <span style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.3 }}>
                      {row.label}
                    </span>
                  </div>
                  <div className="flex-1 relative">
                    <QuarterGuides />
                    {row.bars.map((bar, bi) => (
                      <GanttBar
                        key={bi}
                        start={bar.start}
                        end={bar.end}
                        color={bar.color}
                        label={bar.label}
                        delay={laneIdx * 0.12 + rowIdx * 0.07 + bi * 0.04}
                      />
                    ))}
                  </div>
                </div>
              ))}

            </div>
          ))}

          {/* Milestone divider */}
          <div className="border-t-2 border-dashed border-gray-200 mt-3 mb-0" />

          {/* Milestones row */}
          <div className="flex">
            <div
              style={{ width: LABEL_W, flexShrink: 0 }}
              className="px-3 pt-3 flex items-start"
            >
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Milestones</span>
            </div>
            <div className="flex-1 relative" style={{ height: 100 }}>
              <QuarterGuides />
              {GANTT_MILESTONES.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1, duration: 0.35 }}
                  style={{
                    position: 'absolute',
                    left: `${(m.q / N_Q) * 100}%`,
                    top: 10,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 12, height: 12,
                    backgroundColor: m.color,
                    transform: 'rotate(45deg)',
                    marginBottom: 5,
                    boxShadow: `0 0 0 3px ${m.color}30`,
                    flexShrink: 0,
                  }} />
                  <div style={{ fontSize: 10, fontWeight: 800, color: m.color, letterSpacing: '0.04em', marginBottom: 2 }}>
                    {m.label}
                  </div>
                  <div style={{ width: 88, textAlign: 'center' }}>
                    {m.lines.map((l, li) => (
                      <div key={li} style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.4 }}>{l}</div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Single-tower SVG node timeline ────────────────────────────────────────────

const QUARTER_WIDTH = 240
const CENTER_Y = 175         // horizontal timeline spine Y
const ABOVE_Y_BASE = CENTER_Y - 62   // first above-line node Y
const BELOW_Y_BASE = CENTER_Y + 62   // first below-line node Y
const SLOT_STEP = 36         // extra offset per additional same-quarter node
const LABEL_H = 52           // height of label foreignObject
const PADDING = 70

// Quarters that precede TCS engagement — items here get spread across Q3/Q4/Q1 FY27
// Q3 FY26 is the TCS start marker — no use cases sit there or earlier
const PRE_TCS_QUARTERS = new Set(['Q1 FY25', 'Q2 FY25', 'Q3 FY25', 'Q4 FY25', 'Q1 FY26', 'Q2 FY26', 'Q3 FY26'])
const SPREAD_BUCKETS   = ['Q4 FY26', 'Q1 FY27', 'Q2 FY27']

function spreadMilestones(milestones) {
  const early = milestones.filter(m => PRE_TCS_QUARTERS.has(m.quarter))
  const later = milestones.filter(m => !PRE_TCS_QUARTERS.has(m.quarter))
  // Distribute early items evenly across the 3 post-TCS quarters
  const spread = early.map((m, i) => ({
    ...m,
    quarter: SPREAD_BUCKETS[Math.min(Math.floor(i * 3 / Math.max(early.length, 1)), 2)],
  }))
  return [...spread, ...later]
}

function getTowerColor(towerId) {
  const t = TOWERS.find(t => t.id === towerId)
  return t ? t.color : '#9CA3AF'
}

function nodeStyle(status) {
  switch (status) {
    case 'live':        return { fill: '#00A651', stroke: '#00A651', r: 9 }
    case 'in-progress': return { fill: '#F59E0B', stroke: '#F59E0B', r: 8 }
    default:            return { fill: 'white',   stroke: '#D1D5DB', r: 7 }
  }
}

function TooltipCard({ milestone, x, onClose }) {
  if (!milestone) return null
  const towerColor = getTowerColor(milestone.tower)
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="absolute z-30 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-64"
      style={{ left: Math.max(0, x - 120), top: CENTER_Y + 30 }}
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: towerColor }}>
          {milestone.tower}
        </span>
        <span className="text-xs text-gray-400">{milestone.quarter}</span>
      </div>
      <div className="font-semibold text-humana-navy text-sm mb-1">{milestone.name}</div>
      <div className="text-xs text-gray-500 mb-1">{milestone.id}</div>
      {milestone.savingsLabel && (
        <div className="text-xs font-bold text-green-700 mb-2">{milestone.savingsLabel}</div>
      )}
      <div className="flex items-center gap-1.5">
        {milestone.status === 'live' && (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />Live
          </span>
        )}
        {milestone.status === 'in-progress' && (
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-semibold">In Progress</span>
        )}
        {milestone.status === 'planned' && (
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">Planned</span>
        )}
      </div>
      {milestone.liveDemo && milestone.demoRoute && (
        <Link
          to={milestone.demoRoute}
          className="mt-3 block text-center bg-green-600 text-white text-xs py-1.5 rounded-lg hover:bg-green-700 transition-colors font-semibold"
        >
          Open Demo →
        </Link>
      )}
    </motion.div>
  )
}

function CustomAreaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <div className="font-bold text-humana-navy">{d.quarter}</div>
      <div className="text-green-700 font-semibold">{d.cumulative.toLocaleString()} Hrs/Mo saved</div>
      {d.projected && <div className="text-gray-400 mt-0.5">Projected</div>}
    </div>
  )
}

function TowerTimeline({ activeTower }) {
  const scrollRef = useRef(null)
  const [lineProgress, setLineProgress] = useState(0)
  const [activeNode, setActiveNode] = useState(null)
  const [tooltipX, setTooltipX] = useState(0)
  const [hoveredQuarter, setHoveredQuarter] = useState(null)

  const milestones = spreadMilestones(
    TIMELINE_MILESTONES.filter(m => m.tower === activeTower)
  ).filter(m => QUARTERS.includes(m.quarter))

  const totalWidth = QUARTERS.length * QUARTER_WIDTH

  useEffect(() => {
    setLineProgress(0)
    setActiveNode(null)
    const start = performance.now()
    const duration = 2000
    let raf
    function step(now) {
      const t = Math.min((now - start) / duration, 1)
      setLineProgress(t)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [activeTower])

  function quarterX(q) {
    const idx = QUARTERS.indexOf(q)
    if (idx < 0) return PADDING
    return PADDING + idx * QUARTER_WIDTH + QUARTER_WIDTH / 2
  }

  // Span the full column area so the line doesn't look clipped at the edges
  const lineStart = PADDING
  const lineEnd   = PADDING + QUARTERS.length * QUARTER_WIDTH

  const byQuarter = {}
  milestones.forEach(m => {
    if (!byQuarter[m.quarter]) byQuarter[m.quarter] = []
    byQuarter[m.quarter].push(m)
  })

  // Compute raw node positions — alternate above/below the centre line
  const nodeRawPositions = milestones.map(m => {
    const group = byQuarter[m.quarter]
    const slot  = group.indexOf(m)
    const above = slot % 2 === 0
    const level = Math.floor(slot / 2)
    const rawY  = above
      ? ABOVE_Y_BASE - level * SLOT_STEP
      : BELOW_Y_BASE + level * SLOT_STEP
    return { ...m, x: quarterX(m.quarter), rawY, above }
  })

  // Shift everything down if any above-label would go off-screen
  const minTopY = nodeRawPositions.length > 0
    ? Math.min(...nodeRawPositions.filter(n => n.above).map(n => n.rawY - LABEL_H - 8))
    : CENTER_Y
  const yShift = minTopY < 20 ? 20 - minTopY : 0

  const nodePositions = nodeRawPositions.map(n => ({ ...n, y: n.rawY + yShift }))
  const adjCenter     = CENTER_Y + yShift

  const maxY = nodePositions.length > 0
    ? Math.max(...nodePositions.map(n => n.above ? n.y + 16 : n.y + LABEL_H + 16))
    : adjCenter + 80
  const svgHeight = Math.max(maxY + 40, adjCenter + 100)

  const currentLineX = lineStart + (lineEnd - lineStart) * lineProgress

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-base font-bold text-humana-navy mb-0.5">Implementation Timeline</h3>
      <p className="text-xs text-gray-500 mb-3">AI use case delivery roadmap · Current picture from Q2 FY26</p>

      {/* Savings curve */}
      <div className="mb-2" style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={SAVINGS_CURVE} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00A651" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#00A651" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="quarter" hide />
            <YAxis hide />
            <Tooltip content={<CustomAreaTooltip />} />
            <ReferenceLine x="Q3 FY26" stroke="#F59E0B" strokeDasharray="4 2" label={{ value: 'TCS', position: 'top', fontSize: 9, fill: '#92400E' }} />
            <Area type="monotone" dataKey="cumulative" stroke="#00A651" strokeWidth={2} fill="url(#savingsGrad)" dot={false} animationDuration={1800} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="text-right text-xs text-green-700 font-bold -mt-1 pr-4">
          Projected: 6,800+ Hrs/Mo by Q2 FY27
        </div>
      </div>

      {/* Timeline SVG */}
      <div ref={scrollRef} className="overflow-x-auto pb-2" style={{ position: 'relative' }}>
        <svg
          width={totalWidth + PADDING * 2}
          height={svgHeight}
          className="select-none"
        >
          {/* Invisible quarter hover columns — rendered first so nodes stay on top */}
          {QUARTERS.map((q, i) => (
            <rect
              key={`hit-${q}`}
              x={PADDING + i * QUARTER_WIDTH}
              y={0}
              width={QUARTER_WIDTH}
              height={svgHeight}
              fill="rgba(0,0,0,0.001)"
              style={{ cursor: 'default' }}
              onMouseEnter={() => setHoveredQuarter(q)}
              onMouseLeave={() => setHoveredQuarter(null)}
            />
          ))}

          {/* Quarter labels */}
          {QUARTERS.map((q, i) => (
            <text
              key={q}
              x={PADDING + i * QUARTER_WIDTH + QUARTER_WIDTH / 2}
              y={22}
              textAnchor="middle"
              fontSize={11}
              fill={hoveredQuarter === q ? '#002855' : q === 'Q2 FY26' ? '#15803D' : q === 'Q3 FY26' ? '#92400E' : '#9CA3AF'}
              fontWeight={hoveredQuarter === q ? '900' : '700'}
              style={{ transition: 'fill 0.15s' }}
            >
              {q}
            </text>
          ))}

          {/* Vertical quarter guides */}
          {QUARTERS.map((q, i) => (
            <line
              key={q}
              x1={PADDING + i * QUARTER_WIDTH + QUARTER_WIDTH / 2}
              y1={30}
              x2={PADDING + i * QUARTER_WIDTH + QUARTER_WIDTH / 2}
              y2={adjCenter - 16}
              stroke="#F3F4F6"
              strokeWidth={1}
            />
          ))}

          {/* TODAY dashed marker */}
          {QUARTERS.includes('Q2 FY26') && (() => {
            const x = quarterX('Q2 FY26')
            return (
              <g>
                <line x1={x} y1={28} x2={x} y2={svgHeight - 32}
                  stroke="#00A651" strokeWidth={1} strokeDasharray="4 3" opacity={0.35} />
                <rect x={x - 20} y={svgHeight - 32} width={40} height={14} rx={3} fill="#DCFCE7" />
                <text x={x} y={svgHeight - 21} textAnchor="middle" fontSize={8} fill="#15803D" fontWeight="800">TODAY</text>
              </g>
            )
          })()}

          {/* TCS Begins dashed marker */}
          {QUARTERS.includes('Q3 FY26') && (() => {
            const x = quarterX('Q3 FY26')
            return (
              <g>
                <line x1={x} y1={28} x2={x} y2={svgHeight - 32}
                  stroke="#F59E0B" strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />
                <rect x={x - 30} y={svgHeight - 32} width={60} height={14} rx={3} fill="#FEF3C7" />
                <text x={x} y={svgHeight - 21} textAnchor="middle" fontSize={8} fill="#92400E" fontWeight="800">TCS Begins</text>
              </g>
            )
          })()}

          {/* Timeline spine — grey base then animated green */}
          <line x1={lineStart} y1={adjCenter} x2={lineEnd} y2={adjCenter} stroke="#E5E7EB" strokeWidth={3} strokeLinecap="round" />
          <line x1={lineStart} y1={adjCenter} x2={currentLineX} y2={adjCenter} stroke="#00A651" strokeWidth={3} strokeLinecap="round" />

          {/* Nodes */}
          {nodePositions.map(node => {
            const ns = nodeStyle(node.status)
            const nodeReached = quarterX(node.quarter) <= currentLineX + 5
            const towerColor  = getTowerColor(node.tower)
            const labelY      = node.above
              ? node.y - ns.r - LABEL_H - 4
              : node.y + ns.r + 4

            return (
              <g
                key={node.id}
                style={{ cursor: 'pointer', opacity: nodeReached ? 1 : 0.25, transition: 'opacity 0.3s' }}
                onClick={() => {
                  setTooltipX(node.x)
                  setActiveNode(activeNode?.id === node.id ? null : node)
                }}
              >
                {/* Connector from spine to node */}
                <line
                  x1={node.x}
                  y1={node.above ? adjCenter - 2 : adjCenter + 2}
                  x2={node.x}
                  y2={node.above ? node.y + ns.r + 2 : node.y - ns.r - 2}
                  stroke="#E5E7EB"
                  strokeWidth={1.5}
                />

                {/* Node circle */}
                <circle
                  cx={node.x} cy={node.y} r={ns.r}
                  fill={nodeReached ? ns.fill : 'white'}
                  stroke={nodeReached ? ns.stroke : '#D1D5DB'}
                  strokeWidth={2}
                />

                {/* Live demo dot */}
                {node.liveDemo && nodeReached && (
                  <circle cx={node.x + ns.r - 2} cy={node.y - ns.r + 2} r={3} fill="#00A651" stroke="white" strokeWidth={1} />
                )}

                {/* Label */}
                <foreignObject x={node.x - 58} y={labelY} width={116} height={LABEL_H}>
                  <div xmlns="http://www.w3.org/1999/xhtml" className="text-center" style={{ fontSize: 9, lineHeight: '1.3' }}>
                    <div style={{ fontWeight: 600, color: '#002855', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {node.name}
                    </div>
                    <span className="inline-block text-white rounded px-1 mt-0.5" style={{ fontSize: 8, backgroundColor: towerColor }}>
                      {node.tower}
                    </span>
                    {node.savingsLabel && (
                      <div style={{ color: '#00A651', fontWeight: 700, fontSize: 8, marginTop: 1 }}>{node.savingsLabel}</div>
                    )}
                  </div>
                </foreignObject>
              </g>
            )
          })}

          {/* Quarter savings tooltip — rendered last to float above all nodes */}
          {hoveredQuarter && (() => {
            const cx      = quarterX(hoveredQuarter)
            const saving  = SAVINGS_CURVE.find(s => s.quarter === hoveredQuarter)
            if (!saving) return null
            const idx       = SAVINGS_CURVE.indexOf(saving)
            const prev      = idx > 0 ? SAVINGS_CURVE[idx - 1] : null
            const increment = prev ? saving.cumulative - prev.cumulative : null
            const TW = 154
            const TH = prev ? 84 : 70
            const tx = Math.max(4, Math.min(cx - TW / 2, totalWidth + PADDING * 2 - TW - 4))
            const ty = adjCenter - TH - 22
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tx} y={ty} width={TW} height={TH} rx={8} fill="#002855" />
                <polygon points={`${cx - 7},${adjCenter - 22} ${cx + 7},${adjCenter - 22} ${cx},${adjCenter - 10}`} fill="#002855" />
                <foreignObject x={tx + 10} y={ty + 8} width={TW - 20} height={TH - 16}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{ textAlign: 'center', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 9, color: '#93C5FD', fontWeight: 600, marginBottom: 3 }}>{saving.quarter}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                      {saving.cumulative.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 9, color: '#6EE7B7', marginTop: 2 }}>Hrs/Mo cumulative savings</div>
                    {increment !== null && (
                      <div style={{ fontSize: 9, color: '#4ADE80', marginTop: 3 }}>
                        +{increment.toLocaleString()} Hrs vs prior quarter
                      </div>
                    )}
                    {saving.projected && (
                      <div style={{ fontSize: 8, color: '#FCD34D', marginTop: 3 }}>▲ Projected</div>
                    )}
                  </div>
                </foreignObject>
              </g>
            )
          })()}
        </svg>

        <AnimatePresence>
          {activeNode && (
            <TooltipCard milestone={activeNode} x={tooltipX} onClose={() => setActiveNode(null)} />
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-5 mt-2 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Live / Completed
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />In Progress
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300 inline-block" />Planned
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span style={{ display: 'inline-block', width: 18, height: 2, borderTop: '2px dashed #F59E0B' }} />TCS Q3 FY26
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
          Click any node for details
        </div>
      </div>
    </div>
  )
}

// ── Exported component ─────────────────────────────────────────────────────────

export default function AITimeline({ activeTower }) {
  if (activeTower === 'all') return <GanttRoadmap />
  return <TowerTimeline activeTower={activeTower} />
}
