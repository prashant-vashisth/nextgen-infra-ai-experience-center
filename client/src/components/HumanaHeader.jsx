import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, Clock, ChevronRight, Home, BookOpen, Layers } from 'lucide-react'

const NAV_LINKS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/catalog', label: 'Use Case Catalog', icon: BookOpen },
  { path: '/demo/aks-vulnerability-agent', label: 'AKS Agent', icon: Layers },
  { path: '/demo/ida-workflow-agent', label: 'IDA Agent', icon: Layers },
  { path: '/demo/batch-health-analyzer', label: 'Batch Analyzer', icon: Layers },
  { path: '/demo/rca-cmdb-agent', label: 'RCA + CMDB', icon: Layers },
]

export default function HumanaHeader({ presenterMode, onTogglePresenter }) {
  const [time, setTime] = useState(new Date())
  const location = useLocation()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const pathLabel = NAV_LINKS.find(n => n.path === location.pathname)?.label

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-humana-navy shadow-lg">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="text-white font-bold text-xl tracking-tight">Humana</span>
              <span className="text-humana-green font-black text-xl">.</span>
            </div>
            <div className="h-5 w-px bg-white/30 mx-1" />
            <span className="text-white/80 text-sm font-medium">AI Operations Hub</span>
          </Link>
          <span className="hidden lg:inline-flex items-center gap-1.5 bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-humana-teal animate-pulse" />
            Powered by TCS AI
          </span>
        </div>

        {/* Center: Nav */}
        <nav className="hidden xl:flex items-center gap-1">
          {NAV_LINKS.slice(0, 6).map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                location.pathname === link.path
                  ? 'bg-humana-green text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Status + clock */}
        <div className="flex items-center gap-3">
          <div className="badge-live text-xs">
            <span className="live-dot" />
            LIVE DEMO
          </div>
          <div className="flex items-center gap-1.5 text-white/70 text-xs font-mono">
            <Clock size={12} />
            {time.toLocaleTimeString()}
          </div>
          <button
            onClick={onTogglePresenter}
            className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
              presenterMode
                ? 'bg-amber-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {presenterMode ? '🎤 Presenter' : 'Presenter Mode'}
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {location.pathname !== '/' && (
        <div className="bg-humana-navy/80 border-t border-white/10 px-4 py-1 flex items-center gap-1 text-xs text-white/50">
          <Link to="/" className="hover:text-white/80">Home</Link>
          <ChevronRight size={10} />
          <span className="text-white/70">{pathLabel || location.pathname}</span>
        </div>
      )}
    </header>
  )
}
