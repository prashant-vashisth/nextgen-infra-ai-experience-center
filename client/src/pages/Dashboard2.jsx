import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TowerSummaryRow from '../components/TowerSummaryRow'
import AITimeline from '../components/AITimeline'
import UCTable from '../components/UCTable'
import AIMaturityModel from '../components/AIMaturityModel'
import { TOP_METRICS, TOWERS, PROGRAM_STATS, PROGRAM_BENEFITS } from '../data/dashboard2Data'

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCountUp(target, duration = 1500, delay = 0) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    const timeout = setTimeout(() => {
      started.current = true
      const start = performance.now()
      function step(now) {
        const t = Math.min((now - start) / duration, 1)
        setValue(Math.round((1 - Math.pow(1 - t, 3)) * target))
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])
  return value
}

// ─── Top metric tile ──────────────────────────────────────────────────────────

function MetricTile({ metric, index }) {
  const count = useCountUp(metric.value, 1500, index * 120)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-1 relative overflow-hidden group cursor-default"
      style={{ borderLeft: '4px solid #00A651' }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(0,166,81,0.04) 0%, transparent 70%)' }} />
      <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
        <div className="text-3xl font-black text-humana-navy leading-none">
          {count.toLocaleString()}<span className="text-humana-green text-xl ml-0.5">{metric.suffix}</span>
        </div>
        <div className="text-sm font-semibold text-gray-700 mt-2 leading-tight">{metric.label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{metric.subLabel}</div>
      </motion.div>
    </motion.div>
  )
}

// ─── Tower Selector ───────────────────────────────────────────────────────────

function TowerSelector({ active, onSelect }) {
  const allSelected = active === 'all'
  const totalUCs = TOWERS.reduce((s, t) => s + t.ucCount, 0)
  const activeTowerObj = TOWERS.find(t => t.id === active)

  return (
    <div className="flex flex-col gap-2.5">

      {/* Parent: All Towers — centered, transparent/outline style */}
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelect('all')}
          className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: 'transparent',
            border: allSelected ? '1.5px solid #00A651' : '1.5px solid #D1D5DB',
          }}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 transition-all"
            style={{ backgroundColor: allSelected ? '#00A651' : '#9CA3AF' }}
          />
          <span className="text-sm font-bold tracking-tight" style={{ color: allSelected ? '#15803D' : '#6B7280' }}>
            All Towers
          </span>
          <span className="text-xs font-medium" style={{ color: allSelected ? '#4ADE80' : '#9CA3AF' }}>
            — Complete Program Scope · 11 towers
          </span>
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: allSelected ? 'rgba(0,166,81,0.10)' : 'rgba(0,0,0,0.05)',
              color: allSelected ? '#00A651' : '#9CA3AF',
            }}
          >
            {totalUCs} use cases
          </span>
        </motion.button>
      </div>

      {/* Children: individual towers */}
      <div className="relative pl-5">
        {/* Vertical connector — parent → children */}
        <div
          className="absolute left-2 top-2 bottom-2 w-0.5 rounded-full transition-colors duration-300"
          style={{ backgroundColor: activeTowerObj ? activeTowerObj.color + '50' : '#E5E7EB' }}
        />
        <div className="grid grid-cols-6 gap-1.5">
          {TOWERS.map(tower => {
            const isActive = active === tower.id
            return (
              <motion.button
                key={tower.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(tower.id)}
                title={tower.name}
                className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg transition-all duration-200 cursor-pointer text-left"
                style={isActive ? {
                  backgroundColor: tower.color,
                  boxShadow: `0 2px 10px ${tower.color}45`,
                  border: `1px solid ${tower.color}`,
                } : {
                  backgroundColor: `${tower.color}09`,
                  border: `1px solid ${tower.color}38`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                    style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : tower.color }}
                  />
                  <span
                    className="text-xs font-bold leading-tight truncate"
                    style={{ color: isActive ? 'white' : tower.color }}
                  >
                    {tower.id}
                  </span>
                </div>
                <span
                  className="truncate"
                  style={{
                    paddingLeft: 12,
                    color: isActive ? 'rgba(255,255,255,0.65)' : '#9CA3AF',
                    fontSize: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {tower.ucCount} use cases
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

    </div>
  )
}

// ─── Program overview strip ───────────────────────────────────────────────────

const STAT_ACCENTS = ['#00A651', '#0099A8', '#4F46E5', '#F59E0B', '#8B5CF6']

function ProgramOverview() {
  return (
    <div className="bg-white rounded-xl shadow-sm px-6 py-5">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
        Program Outcomes · TCS AI Commitment · 3-Year View
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {PROGRAM_STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
            className="relative flex flex-col gap-1 px-4 py-4 rounded-xl overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${STAT_ACCENTS[i]}10 0%, ${STAT_ACCENTS[i]}05 100%)`, border: `1px solid ${STAT_ACCENTS[i]}30` }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ backgroundColor: STAT_ACCENTS[i] }} />
            <span className="text-3xl font-black leading-none" style={{ color: STAT_ACCENTS[i] }}>
              {s.value}
            </span>
            <span className="text-xs font-semibold text-gray-600 leading-snug mt-1">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Program benefits bar ─────────────────────────────────────────────────────

function ProgramBenefits() {
  return (
    <div className="bg-white rounded-xl shadow-sm px-6 py-4">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        Program Benefits — IT Service Management
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PROGRAM_BENEFITS.map(b => (
          <div
            key={b.label}
            className="flex flex-col gap-0.5 px-4 py-3 rounded-lg"
            style={{ backgroundColor: b.color + '12', borderLeft: `3px solid ${b.color}` }}
          >
            <span className="text-xl font-black" style={{ color: b.color }}>{b.value}</span>
            <span className="text-xs text-gray-600 font-medium leading-snug">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard2() {
  const [activeTower, setActiveTower] = useState('all')

  const visibleTowers = activeTower === 'all'
    ? TOWERS
    : TOWERS.filter(t => t.id === activeTower)

  return (
    <div className="min-h-screen bg-humana-light">

      {/* ── Unified header: title left · tower selector right ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-start gap-7">

          {/* Left: page title */}
          <div className="flex-shrink-0 pt-1" style={{ width: 256 }}>
            <h1 className="text-lg font-black text-humana-navy leading-snug">
              AI Value Realization —<br />Infrastructure &amp; Operations
            </h1>

          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 self-stretch" />

          {/* Right: tower scope selector */}
          <div className="flex-1 min-w-0">
            <TowerSelector active={activeTower} onSelect={setActiveTower} />
          </div>

        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Program Overview — hidden when a specific tower is active */}
        <AnimatePresence>
          {activeTower === 'all' && (
            <motion.div
              key="program-overview"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <ProgramOverview />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Metric Tiles — hidden when a specific tower is active */}
        <AnimatePresence>
          {activeTower === 'all' && (
            <motion.div
              key="top-metrics"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {TOP_METRICS.map((m, i) => (
                  <MetricTile key={m.label} metric={m} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Maturity Model — hidden when a specific tower is active */}
        <AnimatePresence>
          {activeTower === 'all' && (
            <motion.div
              key="maturity"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <AIMaturityModel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tower Summary Rows */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-humana-navy">
            Tower Overview
            <span className="text-sm font-normal text-gray-400 ml-2">
              — {visibleTowers.length} tower{visibleTowers.length !== 1 ? 's' : ''}
            </span>
          </h2>
          <AnimatePresence mode="sync">
            {visibleTowers.map((tower, i) => (
              <motion.div
                key={tower.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <TowerSummaryRow tower={tower} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-base font-bold text-humana-navy mb-3">
            Implementation Timeline &amp; Savings Trajectory
          </h2>
          <AITimeline activeTower={activeTower} />
        </div>

        {/* Use Case Register */}
        <div>
          <h2 className="text-base font-bold text-humana-navy mb-3">
            Use Case Register
            <span className="text-sm font-normal text-gray-400 ml-2">— full detail view</span>
          </h2>
          <UCTable activeTower={activeTower} />
        </div>

        {/* Program Benefits */}
        <ProgramBenefits />

      </div>
      </div>
    </div>
  )
}
