import { useState, useEffect } from 'react'

export default function LiveIndicator({ label = 'LIVE', color = 'green', size = 'sm' }) {
  const colorMap = {
    green: 'bg-humana-green',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    teal: 'bg-humana-teal',
  }
  const dot = colorMap[color] || colorMap.green

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <span className="relative flex items-center justify-center">
        <span className={`absolute w-3 h-3 rounded-full ${dot} opacity-30 animate-ping`} />
        <span className={`relative w-2 h-2 rounded-full ${dot}`} />
      </span>
      <span className={`text-${color === 'green' ? 'humana-green' : color}-600`}>{label}</span>
    </span>
  )
}
