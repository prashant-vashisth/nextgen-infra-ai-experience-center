import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { USE_CASES_TABLE } from '../data/dashboard2Data'

function StatusBadge({ count, label, color }) {
  if (!count) return null
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {count} {label}
    </span>
  )
}

function DonutChart({ live, inProgress, planned, color }) {
  const total = live + inProgress + planned
  if (total === 0) return null

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const liveAngle     = (live / total) * circumference
  const inProgAngle   = (inProgress / total) * circumference
  const plannedAngle  = (planned / total) * circumference

  const segments = [
    { value: liveAngle,    stroke: '#00A651', offset: 0 },
    { value: inProgAngle,  stroke: '#F59E0B', offset: liveAngle },
    { value: plannedAngle, stroke: '#D1D5DB', offset: liveAngle + inProgAngle },
  ]

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="10" />
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <circle
            key={i}
            cx="36" cy="36" r={radius}
            fill="none"
            stroke={seg.stroke}
            strokeWidth="10"
            strokeDasharray={`${seg.value} ${circumference - seg.value}`}
            strokeDashoffset={-seg.offset + circumference * 0.25}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        ))}
        <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#002855">{total}</text>
      </svg>
      <div className="flex items-center gap-2 text-xs">
        {live > 0      && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{live} Live</span>}
        {inProgress > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{inProgress} WIP</span>}
        {planned > 0   && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />{planned} Plan</span>}
      </div>
    </div>
  )
}

function MiniBarChart({ before, after, saved, pct, color, keyMetrics }) {
  if (!before && keyMetrics) {
    return (
      <div className="flex flex-col gap-2 justify-center h-full">
        {keyMetrics.map((m, i) => (
          <div key={i} className="text-sm font-semibold text-humana-navy">{m}</div>
        ))}
      </div>
    )
  }
  if (!before) return null

  const maxVal = before
  const beforePct = 100
  const afterPct  = Math.round((after / before) * 100)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12 shrink-0">Before</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${beforePct}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full rounded-full bg-red-200"
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-20 text-right">{before.toLocaleString()} Hrs/Mo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12 shrink-0">After</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${afterPct}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-20 text-right">{after.toLocaleString()} Hrs/Mo</span>
        </div>
      </div>
      <div className="text-sm font-bold text-humana-navy">
        {saved.toLocaleString()} Hrs/Mo saved
        <span className="text-humana-green ml-1">({pct}%)</span>
      </div>
    </div>
  )
}

function InlineUCTable({ towerUCs }) {
  const STATUS_STYLES = {
    live:        { bg: 'bg-green-100 text-green-800', dot: '●', dotColor: 'text-green-500 animate-pulse' },
    'in-progress':{ bg: 'bg-amber-100 text-amber-800',  dot: '●', dotColor: 'text-amber-400' },
    planned:     { bg: 'bg-gray-100 text-gray-600',   dot: '○', dotColor: 'text-gray-400' },
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-semibold w-28">#</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold">Use Case</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold hidden md:table-cell">Before</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold hidden md:table-cell">After</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold">Savings</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold">Status</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold w-20">Action</th>
          </tr>
        </thead>
        <tbody>
          {towerUCs.map((uc, i) => {
            const s = STATUS_STYLES[uc.status] || STATUS_STYLES.planned
            return (
              <motion.tr
                key={uc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="py-2 px-3 text-gray-400 font-mono">{uc.id}</td>
                <td className="py-2 px-3 font-semibold text-humana-navy">
                  {uc.name}
                  {uc.liveDemo && (
                    <span className="ml-1.5 bg-green-500 text-white text-xs px-1 rounded animate-pulse">LIVE</span>
                  )}
                </td>
                <td className="py-2 px-3 text-gray-600 hidden md:table-cell">{uc.before}</td>
                <td className="py-2 px-3 text-green-700 font-medium hidden md:table-cell">{uc.after}</td>
                <td className="py-2 px-3 font-bold text-green-700">{uc.savings}</td>
                <td className="py-2 px-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>
                    <span className={s.dotColor}>{s.dot}</span>
                    {uc.status === 'live' ? 'Live' : uc.status === 'in-progress' ? 'In Progress' : 'Planned'}
                  </span>
                </td>
                <td className="py-2 px-3">
                  {uc.liveDemo ? (
                    <a
                      href={uc.demoRoute}
                      onClick={e => { e.preventDefault(); window.location.href = uc.demoRoute }}
                      className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                    >
                      Open Demo →
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function TowerSummaryRow({ tower, index }) {
  const [expanded, setExpanded] = useState(false)
  const towerUCs = USE_CASES_TABLE.filter(uc => uc.tower === tower.id)

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-sm overflow-hidden"
      style={{ borderLeft: `4px solid ${tower.color}` }}
    >
      {/* Row header */}
      <div className="px-5 py-4 grid grid-cols-[1fr_1.4fr_auto] gap-6 items-center">

        {/* Left: tower info */}
        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-humana-navy text-sm leading-tight">{tower.name}</h3>
          <p className="text-xs text-gray-500">{tower.ucCount} use cases</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <StatusBadge count={tower.live}       label="Live"        color="bg-green-100 text-green-700" />
            <StatusBadge count={tower.inProgress} label="In Progress" color="bg-amber-100 text-amber-700" />
            <StatusBadge count={tower.planned}    label="Planned"     color="bg-gray-100 text-gray-600"  />
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {tower.tools.slice(0, 4).map(tool => (
              <span key={tool} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tool}</span>
            ))}
            {tower.tools.length > 4 && (
              <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">+{tower.tools.length - 4}</span>
            )}
          </div>
        </div>

        {/* Center: bar chart */}
        <div>
          <MiniBarChart
            before={tower.beforeHrs}
            after={tower.afterHrs}
            saved={tower.savedHrs}
            pct={tower.savedPct}
            color={tower.color}
            keyMetrics={tower.keyMetrics}
          />
        </div>

        {/* Right: donut + expand button */}
        <div className="flex flex-col items-center gap-3">
          <DonutChart
            live={tower.live}
            inProgress={tower.inProgress}
            planned={tower.planned}
            color={tower.color}
          />
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: tower.color, color: tower.color }}
          >
            {expanded ? 'Hide Use Cases' : 'View Use Cases'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable UC table */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
              <InlineUCTable towerUCs={towerUCs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
