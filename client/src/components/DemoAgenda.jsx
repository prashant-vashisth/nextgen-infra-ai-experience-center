import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Circle, PlayCircle } from 'lucide-react'

const AGENDA = [
  { time: '0:00', label: 'Home Dashboard', desc: 'Use case catalog overview', path: '/', duration: 10 },
  { time: '0:10', label: 'IDA Workflow Agent', desc: 'Live Terraform failure analysis', path: '/demo/ida-workflow-agent', duration: 20 },
  { time: '0:30', label: 'Batch Health Analyzer', desc: '5 batch systems unified', path: '/demo/batch-health-analyzer', duration: 20 },
  { time: '0:50', label: 'RCA + CMDB Agent', desc: '5-Why root cause + CMDB health', path: '/demo/rca-cmdb-agent', duration: 20 },
  { time: '1:10', label: 'AKS Vulnerability Agent', desc: 'CVE scan + compliance', path: '/demo/aks-vulnerability-agent', duration: 15 },
  { time: '1:25', label: 'Q&A / Catalog Walk', desc: 'Open discussion + use cases', path: '/catalog', duration: 5 },
]

export default function DemoAgenda() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const currentIdx = AGENDA.findIndex(a => a.path === location.pathname)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-humana-navy text-white p-2 rounded-r-lg shadow-lg"
      >
        <ChevronRight size={16} />
      </button>
    )
  }

  return (
    <div className="fixed left-0 top-14 bottom-0 z-30 w-52 bg-humana-navy/95 backdrop-blur shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-white text-xs font-semibold flex items-center gap-1.5">
          <Clock size={12} className="text-humana-green" />
          90-MIN AGENDA
        </span>
        <button onClick={() => setCollapsed(true)} className="text-white/50 hover:text-white">
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {AGENDA.map((item, i) => {
          const isActive = location.pathname === item.path
          const isPast = i < currentIdx

          return (
            <Link
              key={i}
              to={item.path}
              className={`flex items-start gap-2 px-3 py-2 mx-1 rounded-lg transition-colors ${
                isActive ? 'bg-humana-green/20 border border-humana-green/40' : 'hover:bg-white/5'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isActive ? (
                  <PlayCircle size={14} className="text-humana-green" />
                ) : isPast ? (
                  <CheckCircle2 size={14} className="text-humana-green/60" />
                ) : (
                  <Circle size={14} className="text-white/30" />
                )}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold leading-tight ${isActive ? 'text-humana-green' : isPast ? 'text-white/60' : 'text-white/80'}`}>
                  {item.label}
                </div>
                <div className="text-xs text-white/40 mt-0.5 leading-tight">{item.desc}</div>
                <div className="text-xs text-white/30 mt-1">{item.time} · {item.duration}min</div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="border-t border-white/10 px-3 py-2">
        <div className="text-xs text-white/40 text-center">
          {currentIdx >= 0 ? `Step ${currentIdx + 1} of ${AGENDA.length}` : 'Humana CTO Demo'}
        </div>
      </div>
    </div>
  )
}
