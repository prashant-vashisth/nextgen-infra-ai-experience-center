import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { USE_CASES_TABLE, TOWERS } from '../data/dashboard2Data'

const STATUS_STYLES = {
  live:          { bg: 'bg-green-100 text-green-800', label: 'Live',        dot: '●', dotCls: 'text-green-500 animate-pulse' },
  'in-progress': { bg: 'bg-amber-100 text-amber-800',  label: 'In Progress', dot: '●', dotCls: 'text-amber-400' },
  planned:       { bg: 'bg-gray-100 text-gray-600',   label: 'Planned',     dot: '○', dotCls: 'text-gray-400' },
}

function AAACell({ assist, augment, autonomous }) {
  if (assist == null) return <span className="text-gray-300 text-xs">—</span>
  return (
    <div className="flex flex-col gap-0.5 min-w-[72px]">
      <div className="flex rounded overflow-hidden h-2.5" title={`Assist ${assist}% · Augment ${augment}% · Autonomous ${autonomous}%`}>
        <div style={{ width: `${assist}%`,     backgroundColor: '#CBD5E1' }} />
        <div style={{ width: `${augment}%`,    backgroundColor: '#60A5FA' }} />
        <div style={{ width: `${autonomous}%`, backgroundColor: '#00A651' }} />
      </div>
      <div className="flex justify-between text-gray-400" style={{ fontSize: 9 }}>
        <span title="Assist">{assist}%</span>
        <span title="Augment" className="text-blue-400">{augment}%</span>
        <span title="Autonomous" className="text-green-600">{autonomous}%</span>
      </div>
    </div>
  )
}

function ToolsCell({ tools }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? tools : tools.slice(0, 3)
  const extra = tools.length - 3

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(t => (
        <span key={t} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>
      ))}
      {extra > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          title={tools.slice(3).join(', ')}
          className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-100"
        >
          +{extra}
        </button>
      )}
    </div>
  )
}

function UCRow({ uc, index }) {
  const s = STATUS_STYLES[uc.status] || STATUS_STYLES.planned
  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
    >
      <td className="py-2.5 px-3 text-xs text-gray-400 font-mono sticky left-0 bg-white border-r border-gray-100 w-[80px]">
        {uc.id}
      </td>
      <td className="py-2.5 px-3 w-[190px] sticky left-[80px] bg-white border-r border-gray-100">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-humana-navy leading-snug">{uc.name}</span>
          {uc.liveDemo && (
            <span className="bg-green-500 text-white text-xs px-1 py-0.5 rounded animate-pulse font-bold flex-shrink-0">LIVE</span>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3" style={{ maxWidth: 130 }}>
        <span className="text-xs bg-humana-navy/10 text-humana-navy px-2 py-0.5 rounded-full font-medium leading-snug" style={{ display: 'inline-block' }}>
          {uc.agentType}
        </span>
      </td>
      <td className="py-2.5 px-3 text-xs text-gray-600 leading-snug" style={{ maxWidth: 200 }}>{uc.before}</td>
      <td className="py-2.5 px-3 text-xs text-green-700 font-medium leading-snug" style={{ maxWidth: 200 }}>{uc.after}</td>
      <td className="py-2.5 px-3 text-xs font-bold text-green-700 leading-snug" style={{ maxWidth: 150 }}>{uc.savings}</td>
      <td className="py-2.5 px-3">
        <AAACell assist={uc.assist} augment={uc.augment} autonomous={uc.autonomous} />
      </td>
      <td className="py-2.5 px-3">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.bg}`}>
          <span className={s.dotCls}>{s.dot}</span>
          {s.label}
        </span>
      </td>
      <td className="py-2.5 px-3" style={{ maxWidth: 160 }}>
        <ToolsCell tools={uc.tools} />
      </td>
      <td className="py-2.5 px-3">
        {uc.liveDemo && uc.demoRoute ? (
          <Link
            to={uc.demoRoute}
            className="bg-green-600 text-white text-xs px-2.5 py-1.5 rounded hover:bg-green-700 transition-colors font-semibold whitespace-nowrap"
          >
            Open Demo →
          </Link>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
    </motion.tr>
  )
}

function TowerGroupHeader({ tower, isCollapsed, onToggle, ucCount }) {
  return (
    <tr
      className="cursor-pointer select-none transition-colors hover:brightness-95"
      style={{ backgroundColor: `${tower.color}22`, borderLeft: `4px solid ${tower.color}` }}
      onClick={onToggle}
    >
      <td colSpan={10} className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: tower.color }}
            />
            <span className="font-bold text-sm text-humana-navy">{tower.name}</span>
            <span className="text-xs text-gray-500">{ucCount} use cases</span>
            {tower.savedHrs && (
              <span className="text-xs font-bold text-green-700">
                ~{tower.savedHrs.toLocaleString()} Hrs/Mo saved
              </span>
            )}
          </div>
          <span className="text-gray-400">
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </span>
        </div>
      </td>
    </tr>
  )
}

export default function UCTable({ activeTower }) {
  const [collapsedGroups, setCollapsedGroups] = useState({})

  const toggleGroup = (towerId) => {
    setCollapsedGroups(prev => ({ ...prev, [towerId]: !prev[towerId] }))
  }

  const filteredUCs = activeTower === 'all'
    ? USE_CASES_TABLE
    : USE_CASES_TABLE.filter(uc => uc.tower === activeTower)

  const showGroupHeaders = activeTower === 'all'

  let rowIndex = 0

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-humana-navy">Use Case Register</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {filteredUCs.length} use case{filteredUCs.length !== 1 ? 's' : ''}
            {activeTower !== 'all' && ` · ${TOWERS.find(t => t.id === activeTower)?.name || activeTower}`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" />Live</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full inline-block" />In Progress</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 rounded-full inline-block" />Planned</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: 820 }}>
          <colgroup>
            <col style={{ width: 80 }} />
            <col style={{ width: 190 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 90 }} />
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 sticky left-0 bg-gray-50 border-r border-gray-100">#</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 sticky left-[80px] bg-gray-50 border-r border-gray-100">Use Case</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Agent Type</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Before</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">After</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Savings</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500" title="Assist / Augment / Autonomous split">Ast·Aug·Auto</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Status</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Tools</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody key={activeTower}>
            {showGroupHeaders
              ? TOWERS.map(tower => {
                  const towerUCs = USE_CASES_TABLE.filter(uc => uc.tower === tower.id)
                  if (towerUCs.length === 0) return null
                  const isCollapsed = collapsedGroups[tower.id] || false
                  return (
                    <>
                      <TowerGroupHeader
                        key={`hdr-${tower.id}`}
                        tower={tower}
                        isCollapsed={isCollapsed}
                        onToggle={() => toggleGroup(tower.id)}
                        ucCount={towerUCs.length}
                      />
                      {!isCollapsed && towerUCs.map(uc => (
                        <UCRow key={uc.id} uc={uc} index={rowIndex++} />
                      ))}
                    </>
                  )
                })
              : filteredUCs.map((uc, i) => (
                  <UCRow key={uc.id} uc={uc} index={i} />
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
