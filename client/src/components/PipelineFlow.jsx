import { useEffect, useRef, useState } from 'react'
import { Check, X, Loader2, Circle } from 'lucide-react'

const STATUS_COLORS = {
  idle: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', dot: '#94a3b8' },
  active: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', dot: '#3b82f6' },
  success: { bg: 'bg-green-50', border: 'border-humana-green', text: 'text-humana-green', dot: '#00A651' },
  error: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-600', dot: '#ef4444' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: '#f59e0b' },
}

function NodeIcon({ status, icon: Icon, size = 18 }) {
  if (status === 'active') return <Loader2 size={size} className="animate-spin text-blue-500" />
  if (status === 'success') return <Check size={size} className="text-humana-green" />
  if (status === 'error') return <X size={size} className="text-red-500" />
  if (Icon) return <Icon size={size} className="text-gray-500" />
  return <Circle size={size} className="text-gray-400" />
}

export default function PipelineFlow({ nodes = [], compact = false }) {
  const [flowOffset, setFlowOffset] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFlowOffset(prev => (prev + 1) % 24)
    }, 60)
    return () => clearInterval(interval)
  }, [])

  if (!nodes.length) return null

  const nodeWidth = compact ? 80 : 110
  const nodeHeight = compact ? 60 : 80
  const gapWidth = compact ? 48 : 60
  const totalWidth = nodes.length * nodeWidth + (nodes.length - 1) * gapWidth
  const svgHeight = nodeHeight + 40
  const centerY = svgHeight / 2

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: totalWidth + 40 }} className="relative py-2">
        {/* SVG connectors */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: totalWidth + 40, height: svgHeight + 20 }}
        >
          {nodes.slice(0, -1).map((node, i) => {
            const x1 = 20 + i * (nodeWidth + gapWidth) + nodeWidth
            const x2 = 20 + (i + 1) * (nodeWidth + gapWidth)
            const cy = centerY + 10
            const nextNode = nodes[i + 1]
            const isActive = node.status === 'success' || node.status === 'active'
            const color = isActive ? '#00A651' : '#cbd5e1'

            return (
              <g key={`connector-${i}`}>
                <line
                  x1={x1} y1={cy} x2={x2} y2={cy}
                  stroke="#e2e8f0"
                  strokeWidth={2}
                />
                {isActive && (
                  <line
                    x1={x1} y1={cy} x2={x2} y2={cy}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="8 6"
                    strokeDashoffset={-flowOffset}
                    style={{ transition: 'stroke-dashoffset 0s' }}
                  />
                )}
                {/* Flow dot */}
                {node.status === 'success' && (
                  <circle
                    cx={x1 + ((x2 - x1) * ((flowOffset % 24) / 24))}
                    cy={cy}
                    r={3}
                    fill={color}
                    opacity={0.9}
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* Nodes */}
        <div className="relative flex items-center gap-0" style={{ paddingLeft: 20 }}>
          {nodes.map((node, i) => {
            const colors = STATUS_COLORS[node.status] || STATUS_COLORS.idle
            return (
              <div key={node.id || i} className="flex items-center">
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${colors.bg} ${colors.border} ${compact ? 'p-2' : 'p-3'}`}
                  style={{ width: nodeWidth, minHeight: nodeHeight }}
                  onClick={() => node.onClick?.()}
                >
                  <NodeIcon status={node.status} icon={node.icon} size={compact ? 16 : 20} />
                  <span className={`text-center font-semibold leading-tight mt-1 ${compact ? 'text-xs' : 'text-xs'} ${colors.text}`}>
                    {node.label}
                  </span>
                  {node.sublabel && (
                    <span className="text-xs text-gray-400 mt-0.5 text-center">{node.sublabel}</span>
                  )}
                  {node.status === 'active' && (
                    <span className="text-xs text-blue-500 animate-pulse mt-0.5">Processing...</span>
                  )}
                </div>
                {i < nodes.length - 1 && (
                  <div style={{ width: gapWidth }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
