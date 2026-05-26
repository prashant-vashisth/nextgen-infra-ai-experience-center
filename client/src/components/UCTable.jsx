import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'

function StatusBadge({ status }) {
  if (status === 'live') return (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
      Live
    </span>
  )
  if (status === 'in-progress') return (
    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">In Progress</span>
  )
  return (
    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Planned</span>
  )
}

function ToolChips({ tools }) {
  const visible  = tools.slice(0, 3)
  const overflow = tools.slice(3)
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(t => (
        <span key={t} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">{t}</span>
      ))}
      {overflow.length > 0 && (
        <div className="relative group/tip">
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 cursor-help">+{overflow.length}</span>
          <div className="absolute hidden group-hover/tip:block bottom-full mb-1 left-0 bg-gray-800 text-white text-xs rounded-lg p-2 z-20 whitespace-nowrap shadow-lg">
            {overflow.join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}

function UCRow({ uc, index }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
    >
      {/* ID — sticky */}
      <td className="sticky left-0 bg-white group-hover:bg-gray-50 py-3 pr-3 pl-4 font-mono text-xs text-gray-400 whitespace-nowrap z-10 border-r border-gray-100 w-28">
        {uc.id}
      </td>

      {/* Use Case — sticky */}
      <td className="sticky left-28 bg-white py-3 pr-4 pl-3 z-10 border-r border-gray-100 w-64">
        <div className="flex items-start gap-1.5">
          <span className="text-xs font-semibold text-gray-800 leading-snug">{uc.name}</span>
          {uc.status === 'live' && (
            <span className="shrink-0 bg-green-500 text-white text-xs px-1 py-0.5 rounded font-bold animate-pulse leading-none mt-0.5">LIVE</span>
          )}
        </div>
      </td>

      {/* Agent Type */}
      <td className="py-3 px-3 whitespace-nowrap">
        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">{uc.agentType}</span>
      </td>

      {/* Before */}
      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{uc.before}</td>

      {/* After */}
      <td className="py-3 px-3 text-xs text-green-700 font-medium whitespace-nowrap">{uc.after}</td>

      {/* Savings */}
      <td className="py-3 px-3 text-xs font-bold text-humana-green whitespace-nowrap">{uc.savings}</td>

      {/* Status */}
      <td className="py-3 px-3"><StatusBadge status={uc.status} /></td>

      {/* Tools */}
      <td className="py-3 px-3"><ToolChips tools={uc.tools} /></td>

      {/* Action */}
      <td className="py-3 px-4 text-right">
        {uc.liveDemo ? (
          <Link
            to={uc.demoRoute}
            className="inline-block bg-humana-green text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            Open Demo →
          </Link>
        ) : (
          <span className="text-xs text-gray-300 whitespace-nowrap">Coming Soon</span>
        )}
      </td>
    </motion.tr>
  )
}

function TowerGroupHeader({ group, collapsed, onToggle, rowSpan }) {
  const hex15 = group.towerColor + '26'
  return (
    <tr
      className="cursor-pointer hover:brightness-95 transition-all"
      style={{ backgroundColor: hex15 }}
      onClick={onToggle}
    >
      <td
        colSpan={9}
        className="py-3 px-4 font-bold text-sm"
        style={{ borderLeft: `4px solid ${group.towerColor}`, color: group.towerColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            <span>{group.towerName}</span>
            <span className="text-xs font-normal text-gray-500 ml-2">{group.totalUCs} use cases</span>
          </div>
          <span className="text-xs font-semibold text-gray-600 pr-2">{group.savingsLabel}</span>
        </div>
      </td>
    </tr>
  )
}

export default function UCTable({ selectedTower, groups }) {
  const [collapsedGroups, setCollapsedGroups] = useState({})

  const toggleGroup = (id) => setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }))

  const filteredGroups = useMemo(() =>
    selectedTower === 'all' ? groups : groups.filter(g => g.towerId === selectedTower),
    [selectedTower, groups]
  )

  const showHeaders = selectedTower === 'all'

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-humana-navy">Use Case Inventory</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {selectedTower === 'all'
            ? `${groups.reduce((s, g) => s + g.useCases.length, 0)} total use cases across all towers`
            : `${filteredGroups[0]?.useCases.length || 0} use cases · ${filteredGroups[0]?.towerName || ''}`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="sticky left-0 bg-gray-50 z-20 text-left py-3 px-4 font-semibold text-gray-500 w-28 border-r border-gray-200">#</th>
              <th className="sticky left-28 bg-gray-50 z-20 text-left py-3 px-3 font-semibold text-gray-500 w-64 border-r border-gray-200">Use Case</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-500 whitespace-nowrap">Agent Type</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-500">Before</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-500">After</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-500">Savings</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-500">Status</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-500">Tools</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {filteredGroups.map(group => {
                const isCollapsed = !!collapsedGroups[group.towerId]
                return [
                  showHeaders && (
                    <TowerGroupHeader
                      key={`hdr-${group.towerId}`}
                      group={group}
                      collapsed={isCollapsed}
                      onToggle={() => toggleGroup(group.towerId)}
                    />
                  ),
                  ...(!isCollapsed ? group.useCases.map((uc, i) => (
                    <UCRow key={uc.id} uc={uc} index={i} />
                  )) : []),
                ]
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}
