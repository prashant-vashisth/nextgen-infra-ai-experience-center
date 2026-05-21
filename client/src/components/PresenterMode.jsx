import { useState } from 'react'
import { Play, AlertTriangle, RefreshCw, Bug, Server, Zap } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

const SCENARIOS = [
  { id: 'trigger-ida-failure', label: 'Trigger IDA Failure', icon: AlertTriangle, color: 'bg-red-500', endpoint: '/api/ida/trigger-failure' },
  { id: 'trigger-batch-failure', label: 'Batch Job Failure', icon: Server, color: 'bg-orange-500', endpoint: '/api/batch/fail-job' },
  { id: 'inject-cve', label: 'Inject Critical CVE', icon: Bug, color: 'bg-red-600', endpoint: '/api/aks/inject-cve' },
  { id: 'create-problem', label: 'Create Problem Ticket', icon: Zap, color: 'bg-purple-600', endpoint: '/api/snow/problem' },
  { id: 'reset-demo', label: 'Reset All Demos', icon: RefreshCw, color: 'bg-humana-navy', endpoint: null },
]

export default function PresenterMode({ onScenario }) {
  const [lastTriggered, setLastTriggered] = useState(null)
  const [isLoading, setIsLoading] = useState(null)

  const handleScenario = async (scenario) => {
    setIsLoading(scenario.id)
    setLastTriggered(null)

    try {
      if (scenario.id === 'reset-demo') {
        onScenario?.('reset')
        setLastTriggered('reset-demo')
      } else {
        onScenario?.(scenario.id)
        setLastTriggered(scenario.id)
      }
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-humana-navy/95 backdrop-blur border-t border-white/20 px-4 py-2">
      <div className="flex items-center gap-3 overflow-x-auto">
        <span className="text-amber-400 text-xs font-bold shrink-0 flex items-center gap-1.5">
          <Play size={12} fill="currentColor" />
          PRESENTER CONTROLS
        </span>
        <div className="h-4 w-px bg-white/20 shrink-0" />
        {SCENARIOS.map(scenario => (
          <button
            key={scenario.id}
            onClick={() => handleScenario(scenario)}
            disabled={isLoading === scenario.id}
            className={`flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-all hover:opacity-90 active:scale-95 ${scenario.color} ${isLoading === scenario.id ? 'opacity-60' : ''} ${lastTriggered === scenario.id ? 'ring-2 ring-amber-400' : ''}`}
          >
            <scenario.icon size={12} />
            {scenario.label}
            {lastTriggered === scenario.id && <span className="text-amber-300">✓</span>}
          </button>
        ))}
        <div className="ml-auto text-white/40 text-xs shrink-0">Press Esc to exit presenter mode</div>
      </div>
    </div>
  )
}
