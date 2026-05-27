import { motion } from 'framer-motion'
import { AI_MATURITY_STAGES, AI_MATURITY_HEADLINE } from '../data/dashboard2Data'

const STAGE_COLORS = ['#9CA3AF', '#60A5FA', '#F59E0B', '#00A651', '#002855']

function StageCard({ stage, index }) {
  const color = STAGE_COLORS[index]
  const isCurrent = stage.current
  const isTarget  = stage.target

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="flex-1 min-w-0 relative flex flex-col"
    >
      {/* Top badge */}
      <div className="flex justify-center mb-2 h-6">
        {isCurrent && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
            Current
          </span>
        )}
        {isTarget && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
            Target
          </span>
        )}
      </div>

      {/* Card body */}
      <div
        className="flex-1 rounded-xl p-4 flex flex-col gap-2.5 transition-all"
        style={{
          border: `2px solid ${isCurrent ? '#F59E0B' : isTarget ? '#00A651' : color + '55'}`,
          backgroundColor: isCurrent ? '#FFFBEB' : isTarget ? '#F0FDF4' : 'white',
          boxShadow: isCurrent || isTarget ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Stage number + icon */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
            style={{ backgroundColor: color }}
          >
            {stage.stage}
          </div>
          <span className="text-xs font-bold text-humana-navy leading-tight">{stage.title}</span>
        </div>

        {/* Human/AI split bar */}
        <div>
          <div className="flex rounded-full overflow-hidden h-3 mb-1">
            <div
              className="transition-all duration-700"
              style={{ width: `${stage.humanPct}%`, backgroundColor: '#CBD5E1' }}
            />
            <div
              className="transition-all duration-700"
              style={{ width: `${stage.aiPct}%`, backgroundColor: color }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Human {stage.humanPct}%</span>
            <span style={{ color }}>AI {stage.aiPct}%</span>
          </div>
        </div>

        {/* Labels */}
        <div className="flex flex-col gap-0.5">
          <div className="text-xs text-gray-500 leading-tight">{stage.humanLabel}</div>
          <div className="text-xs font-semibold leading-tight" style={{ color }}>{stage.aiLabel}</div>
        </div>

        {/* Team type */}
        <div className="text-xs text-gray-500 leading-snug border-t border-gray-100 pt-2">
          {stage.teamType}
        </div>

        {/* Team impact */}
        <div className="text-xs font-semibold text-humana-navy leading-snug">
          {stage.teamImpact}
        </div>
      </div>
    </motion.div>
  )
}

export default function AIMaturityModel() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-humana-navy">March to Zero IT Operations</h3>
          <p className="text-xs text-gray-400 mt-0.5">TCS AI Maturity Model · AI Operations with Human in the Loop</p>
        </div>

        {/* Headline KPIs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-humana-navy/5 rounded-lg px-4 py-2">
            <span className="text-xs text-gray-500 font-medium">Automation Index</span>
            <span className="text-xl font-black text-humana-navy">
              {AI_MATURITY_HEADLINE.automationIndex}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 rounded-lg px-4 py-2">
            <span className="text-xs text-gray-500 font-medium">Cost Savings (Yr 1→3)</span>
            <span className="text-xl font-black text-humana-green">
              {AI_MATURITY_HEADLINE.costSavings}
            </span>
          </div>
        </div>
      </div>

      {/* Stage cards */}
      <div className="flex gap-3 items-stretch">
        {AI_MATURITY_STAGES.map((stage, i) => (
          <StageCard key={stage.stage} stage={stage} index={i} />
        ))}
      </div>

    </div>
  )
}
