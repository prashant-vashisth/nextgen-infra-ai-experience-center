import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'

function StatusBadge({ status }) {
  if (status === 'live') return (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
      Live
    </span>
  )
  if (status === 'in-progress') return (
    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">In Progress</span>
  )
  return (
    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">Planned</span>
  )
}

function DonutChart({ live, inProgress, planned, color }) {
  const total = live + inProgress + planned
  if (total === 0) return null
  const r = 28
  const circ = 2 * Math.PI * r
  const liveLen     = (live / total) * circ
  const ipLen       = (inProgress / total) * circ
  const plannedLen  = (planned / total) * circ

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      {planned > 0 && (
        <circle cx="36" cy="36" r={r} fill="none" stroke="#d1d5db" strokeWidth="7"
          strokeDasharray={`${plannedLen} ${circ}`}
          strokeDashoffset={-(liveLen + ipLen)}
          transform="rotate(-90 36 36)" />
      )}
      {inProgress > 0 && (
        <circle cx="36" cy="36" r={r} fill="none" stroke="#F59E0B" strokeWidth="7"
          strokeDasharray={`${ipLen} ${circ}`}
          strokeDashoffset={-liveLen}
          transform="rotate(-90 36 36)" />
      )}
      {live > 0 && (
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${liveLen} ${circ}`}
          strokeDashoffset={0}
          transform="rotate(-90 36 36)" />
      )}
      <text x="36" y="33" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#002855">{total}</text>
      <text x="36" y="46" textAnchor="middle" fontSize="8" fill="#9ca3af">UCs</text>
    </svg>
  )
}

function MiniBarChart({ before, after, savedHrs, savedPct }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12 shrink-0">Before</span>
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="h-full rounded-full bg-red-300"
          />
        </div>
        <span className="text-xs text-gray-500 w-18 shrink-0">{before.toLocaleString()} Hrs</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12 shrink-0">After</span>
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(after / before) * 100}%` }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="h-full rounded-full bg-humana-green"
          />
        </div>
        <span className="text-xs text-humana-green w-18 shrink-0">{after.toLocaleString()} Hrs</span>
      </div>
      <div className="text-xs font-semibold text-humana-green pt-0.5">
        {savedHrs.toLocaleString()} Hrs/Mo saved ({savedPct}%)
      </div>
    </div>
  )
}

function ToolChip({ name }) {
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{name}</span>
  )
}

function MiniUCTable({ useCases, color }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left pb-2 pr-3 text-gray-400 font-medium">ID</th>
            <th className="text-left pb-2 pr-3 text-gray-400 font-medium">Use Case</th>
            <th className="text-left pb-2 pr-3 text-gray-400 font-medium">Before</th>
            <th className="text-left pb-2 pr-3 text-gray-400 font-medium">After</th>
            <th className="text-left pb-2 pr-3 text-gray-400 font-medium">Savings</th>
            <th className="text-left pb-2 text-gray-400 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {useCases.map((uc, i) => (
            <motion.tr
              key={uc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="border-b border-gray-100 hover:bg-white"
            >
              <td className="py-2 pr-3 font-mono text-gray-400 whitespace-nowrap">{uc.id}</td>
              <td className="py-2 pr-3 text-gray-700 font-medium">
                <span>{uc.name}</span>
                {uc.liveDemo && (
                  <Link
                    to={uc.demoRoute}
                    className="ml-2 text-humana-green font-bold hover:underline"
                    onClick={e => e.stopPropagation()}
                  >→</Link>
                )}
              </td>
              <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{uc.before}</td>
              <td className="py-2 pr-3 text-green-700 whitespace-nowrap">{uc.after}</td>
              <td className="py-2 pr-3 font-semibold text-green-700 whitespace-nowrap">{uc.savings}</td>
              <td className="py-2 whitespace-nowrap"><StatusBadge status={uc.status} /></td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TowerSummaryRow({ tower, isVisible, delay, useCases }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={tower.id}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, delay: delay / 1000 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4"
          style={{ borderLeftColor: tower.color }}
        >
          {/* Main row */}
          <div className="flex items-start p-5 gap-5">

            {/* Left — 30% */}
            <div className="w-[30%] min-w-0 shrink-0">
              <h3 className="font-bold text-humana-navy text-sm leading-snug">{tower.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{tower.totalUCs} use cases</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  {tower.live} Live
                </span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">{tower.inProgress} In Progress</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{tower.planned} Planned</span>
              </div>
            </div>

            {/* Center — 40% */}
            <div className="flex-1 min-w-0">
              {tower.beforeHrs ? (
                <>
                  <MiniBarChart
                    before={tower.beforeHrs}
                    after={tower.afterHrs}
                    savedHrs={tower.savedHrs}
                    savedPct={tower.savedPct}
                  />
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tower.tools.slice(0, 5).map(t => <ToolChip key={t} name={t} />)}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-700">{tower.savingsLabel}</p>
                  {tower.metricsLabel && (
                    <p className="text-xs text-gray-500 mt-0.5">{tower.metricsLabel}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tower.tools.slice(0, 5).map(t => <ToolChip key={t} name={t} />)}
                  </div>
                </>
              )}
            </div>

            {/* Right — 30% */}
            <div className="w-[30%] shrink-0 flex items-center justify-end gap-4">
              <DonutChart
                live={tower.live}
                inProgress={tower.inProgress}
                planned={tower.planned}
                color={tower.color}
              />
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-xs font-semibold transition-colors whitespace-nowrap hover:opacity-80"
                style={{ color: tower.color }}
              >
                View Use Cases {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Expandable UC table */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="expand"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  <MiniUCTable useCases={useCases} color={tower.color} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
