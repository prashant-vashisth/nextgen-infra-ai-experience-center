import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { METRICS, TOWERS, TOWER_SUMMARIES, TIMELINE_MILESTONES, UC_TABLE_GROUPS } from '../data/dashboard2Data'
import TowerSummaryRow from '../components/TowerSummaryRow'
import AITimeline from '../components/AITimeline'
import UCTable from '../components/UCTable'

// ─── Animated counter tile ────────────────────────────────────────────────────

function MetricTile({ label, value, suffix, subLabel }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const duration = 1500
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.floor(eased * value))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return (
    <div className="group relative bg-white rounded-xl shadow-sm border-l-4 px-5 py-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default"
      style={{ borderLeftColor: '#00A651' }}>
      <div className="text-3xl font-black tracking-tight" style={{ color: '#002855' }}>
        {displayed.toLocaleString()}{suffix}
      </div>
      <div className="text-sm font-semibold text-gray-700 mt-1 leading-snug">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{subLabel}</div>
      {/* Tooltip */}
      <div className="pointer-events-none absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
        AI committed savings — updated FY2026
      </div>
    </div>
  )
}

// ─── Tower filter pill bar ────────────────────────────────────────────────────

function TowerFilterBar({ selectedTower, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {TOWERS.map(t => {
        const active = selectedTower === t.id
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
            style={active
              ? { backgroundColor: t.color, color: '#fff', borderColor: t.color }
              : { backgroundColor: '#fff', color: t.color, borderColor: t.color }
            }
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard2() {
  const [selectedTower, setSelectedTower] = useState('all')

  const filteredMilestones = selectedTower === 'all'
    ? TIMELINE_MILESTONES
    : TIMELINE_MILESTONES.filter(m => m.tower === selectedTower)

  const ucGroups = UC_TABLE_GROUPS

  return (
    <div className="min-h-screen bg-humana-light">

      {/* Page header */}
      <div className="bg-humana-navy py-8 px-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-black text-white tracking-tight">
            AI Value Realization — Infrastructure &amp; Operations
          </h1>
          <p className="text-humana-green font-semibold text-sm mt-1">
            TCS AI Commitment to Humana | FY2025–FY2026
          </p>
        </motion.div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* Section 1 — Top metric tiles */}
        <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <MetricTile {...m} />
            </motion.div>
          ))}
        </div>

        {/* Section 2 — Tower filter bar */}
        <TowerFilterBar selectedTower={selectedTower} onSelect={setSelectedTower} />

        {/* Section 3 — Tower summary rows */}
        <div className="space-y-3">
          {TOWER_SUMMARIES.map((tower, i) => {
            const group = ucGroups.find(g => g.towerId === tower.id)
            return (
              <TowerSummaryRow
                key={tower.id}
                tower={tower}
                isVisible={selectedTower === 'all' || selectedTower === tower.id}
                delay={i * 80}
                useCases={group?.useCases || []}
              />
            )
          })}
        </div>

        {/* Section 4 — Timeline */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTower}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AITimeline milestones={filteredMilestones} selectedTower={selectedTower} />
          </motion.div>
        </AnimatePresence>

        {/* Section 5 — Use case table */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`tbl-${selectedTower}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UCTable selectedTower={selectedTower} groups={ucGroups} />
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
