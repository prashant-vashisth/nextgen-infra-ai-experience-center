import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { QUARTERS, CUMULATIVE_SAVINGS_DATA, TOWERS } from '../data/dashboard2Data'

const QUARTER_W = 190

function StatusDot({ status }) {
  if (status === 'live')        return <span className="w-2 h-2 rounded-full bg-humana-green animate-pulse inline-block" />
  if (status === 'in-progress') return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
  return <span className="w-2 h-2 rounded-full border-2 border-gray-300 inline-block" />
}

function NodeTooltip({ milestone, onClose }) {
  const towerMeta = TOWERS.find(t => t.id === milestone.tower)
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-52 bg-white rounded-xl shadow-xl border border-gray-200 p-3 text-xs pointer-events-auto">
      <div className="font-semibold text-humana-navy leading-snug mb-1">{milestone.name}</div>
      <div className="flex items-center gap-1 mb-1">
        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: towerMeta?.color || '#00A651' }} />
        <span className="text-gray-500">{milestone.tower}</span>
      </div>
      {milestone.savingsLabel && (
        <div className="text-humana-green font-medium mb-1">{milestone.savingsLabel}</div>
      )}
      <div className="mb-2">
        {milestone.status === 'live' && (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />Live
          </span>
        )}
        {milestone.status === 'in-progress' && (
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">In Progress</span>
        )}
        {milestone.status === 'planned' && (
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Planned</span>
        )}
      </div>
      {milestone.liveDemo && milestone.demoRoute && (
        <Link
          to={milestone.demoRoute}
          className="block text-center bg-humana-green text-white rounded-lg px-2 py-1 font-semibold hover:bg-green-700 transition-colors"
        >
          Open Demo →
        </Link>
      )}
    </div>
  )
}

function MilestoneNode({ milestone, index }) {
  const [hover, setHover] = useState(false)

  const nodeColor =
    milestone.status === 'live'        ? '#00A651' :
    milestone.status === 'in-progress' ? '#F59E0B' : 'transparent'
  const nodeBorder =
    milestone.status === 'planned' ? '#d1d5db' : nodeColor

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 2 + index * 0.06, duration: 0.25 }}
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Vertical connector */}
      <div className="w-px h-3 bg-gray-200" />

      {/* Node circle */}
      <div
        className="w-4 h-4 rounded-full border-2 cursor-pointer transition-transform hover:scale-125"
        style={{ backgroundColor: nodeColor, borderColor: nodeBorder, boxShadow: hover ? `0 0 0 3px ${nodeBorder}40` : 'none' }}
      />

      {/* Label */}
      <div className="mt-1.5 text-center px-1" style={{ maxWidth: QUARTER_W - 8 }}>
        <p className="text-xs font-medium text-gray-700 leading-tight line-clamp-2">{milestone.name}</p>
        {milestone.savingsLabel && (
          <p className="text-xs text-humana-green font-medium mt-0.5 leading-tight">{milestone.savingsLabel}</p>
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <NodeTooltip milestone={milestone} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-humana-navy mb-1">{label}</p>
      {payload.map(p => p.value != null && (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-gray-600">{p.name === 'actual' ? 'Actual' : 'Projected'}:</span>
          <span className="font-bold text-humana-navy">{p.value.toLocaleString()} Hrs/Mo</span>
        </div>
      ))}
    </div>
  )
}

export default function AITimeline({ milestones, selectedTower }) {
  const totalWidth = QUARTERS.length * QUARTER_W

  const byQuarter = useMemo(() => {
    const map = {}
    QUARTERS.forEach(q => { map[q] = [] })
    milestones.forEach(m => { if (map[m.quarter]) map[m.quarter].push(m) })
    return map
  }, [milestones])

  let nodeIndex = 0

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-bold text-humana-navy">Implementation Timeline</h2>
        <span className="text-xs text-gray-400">
          {selectedTower === 'all' ? 'All Towers' : TOWERS.find(t => t.id === selectedTower)?.fullName}
        </span>
      </div>

      {/* Cumulative savings curve */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Cumulative Hours/Month Saved (global)</p>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={CUMULATIVE_SAVINGS_DATA} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00A651" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#00A651" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00A651" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00A651" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
              tickFormatter={v => `${v.toLocaleString()}`} width={48} />
            <ReTooltip content={<CustomTooltip />} />
            <ReferenceLine x="Q2 FY26" stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: 'Today', fontSize: 9, fill: '#9ca3af' }} />
            <Area
              type="monotone" dataKey="actual" name="actual"
              stroke="#00A651" strokeWidth={2} fill="url(#actualGrad)"
              connectNulls={false} dot={false} activeDot={{ r: 4, fill: '#00A651' }}
            />
            <Area
              type="monotone" dataKey="projected" name="projected"
              stroke="#00A651" strokeWidth={2} strokeDasharray="5 4" fill="url(#projGrad)"
              connectNulls={false} dot={false} activeDot={{ r: 4, fill: '#00A651' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-right text-xs font-semibold text-humana-green mt-1">
          Projected: 4,500+ Hrs/Mo by Q4 FY26
        </p>
      </div>

      {/* Horizontal scrollable timeline */}
      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: totalWidth }}>

          {/* Quarter column headers */}
          <div className="flex border-b border-gray-100 pb-2 mb-1">
            {QUARTERS.map(q => (
              <div key={q} style={{ width: QUARTER_W }} className="text-center text-xs font-semibold text-gray-500 shrink-0">
                {q}
              </div>
            ))}
          </div>

          {/* Timeline line + line animation */}
          <div className="relative flex items-center" style={{ height: 20 }}>
            <svg width={totalWidth} height={20} className="absolute top-0 left-0">
              {/* Background grey line */}
              <line x1={QUARTER_W / 2} y1={10} x2={totalWidth - QUARTER_W / 2} y2={10}
                stroke="#e5e7eb" strokeWidth={2} />
              {/* Animated green line */}
              <motion.path
                d={`M${QUARTER_W / 2},10 L${totalWidth - QUARTER_W / 2},10`}
                stroke="#00A651" strokeWidth={2.5} fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
              {/* Quarter tick marks */}
              {QUARTERS.map((_, i) => (
                <line key={i}
                  x1={i * QUARTER_W + QUARTER_W / 2} y1={6}
                  x2={i * QUARTER_W + QUARTER_W / 2} y2={14}
                  stroke="#d1d5db" strokeWidth={1.5} />
              ))}
            </svg>
          </div>

          {/* Milestone nodes per quarter */}
          <div className="flex mt-1">
            {QUARTERS.map(q => {
              const nodes = byQuarter[q]
              return (
                <div key={q} style={{ width: QUARTER_W }} className="flex flex-col items-center gap-3 shrink-0 pt-1">
                  {nodes.map(m => {
                    const idx = nodeIndex++
                    return <MilestoneNode key={m.id} milestone={m} index={idx} />
                  })}
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-humana-green inline-block" /> Live
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> In Progress
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full border-2 border-gray-300 inline-block" /> Planned
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
          <span className="w-4 border-t-2 border-dashed border-humana-green inline-block" /> Projected savings
        </span>
      </div>
    </div>
  )
}
