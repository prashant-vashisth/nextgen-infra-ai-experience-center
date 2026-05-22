import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ChevronDown, ChevronRight } from 'lucide-react'

const TOWERS = [
  {
    label: 'IT Operations & Infrastructure',
    short: 'IT Operations',
    demos: [
      { path: '/demo/event-management-agent', label: 'Event Management & Self-Heal', badge: 'UC #22', sub: 'TOC / AOC' },
      { path: '/demo/batch-health-analyzer',  label: 'Batch Health Analyzer',        badge: 'UC #25', sub: 'IT Infra Ops' },
      { path: '/demo/rca-cmdb-agent',         label: 'RCA Agent + CMDB Enrichment',  badge: 'UC #41', sub: 'Enterprise ITSM' },
      { path: '/demo/finops-cost-agent',      label: 'FinOps Cost Anomaly Agent',    badge: 'UC #35', sub: 'FinOps' },
    ],
  },
  {
    label: 'Platform Engineering',
    short: 'Platform Engineering',
    demos: [
      { path: '/demo/cvit-workflow',           label: 'CVIT Multi-Agent Orchestrator', badge: 'UC #36', sub: 'Security Eng' },
      { path: '/demo/cloud-onboarding-agent',  label: 'Cloud Onboarding Validation',   badge: 'UC #6',  sub: 'Cloud Eng' },
      { path: '/demo/ida-workflow-agent',      label: 'IDA Workflow Assist Agent',     badge: 'UC #9',  sub: 'Automation Eng' },
      { path: '/demo/dependency-risk-agent',   label: 'Dependency Risk Management',    badge: 'UC #13', sub: 'Automation Eng' },
    ],
  },
]

const PAGE_LABELS = {
  '/': 'Dashboard',
  '/demo/event-management-agent':  'Event Management & Self-Heal',
  '/demo/batch-health-analyzer':   'Batch Health Analyzer',
  '/demo/rca-cmdb-agent':          'RCA + CMDB',
  '/demo/finops-cost-agent':       'FinOps Cost Agent',
  '/demo/cvit-workflow':           'CVIT Orchestrator',
  '/demo/cloud-onboarding-agent':  'Cloud Onboarding Validation',
  '/demo/ida-workflow-agent':      'IDA Workflow Agent',
  '/demo/dependency-risk-agent':   'Dependency Risk Management',
  '/demo/aks-vulnerability-agent': 'AKS Vulnerability Agent',
}

function TowerDropdown({ tower, currentPath }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const isActive = tower.demos.some(d => d.path === currentPath)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          isActive
            ? 'bg-humana-green text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        {tower.short}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-humana-navy border border-white/10 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          <div className="px-3 py-1.5 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/10">
            {tower.label}
          </div>
          {tower.demos.map(demo => (
            <Link
              key={demo.path}
              to={demo.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs transition-colors group ${
                currentPath === demo.path
                  ? 'bg-humana-green/20 text-humana-green'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-xs bg-white/15 text-white/60 px-1.5 py-0.5 rounded font-mono shrink-0">
                {demo.badge}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{demo.label}</div>
                <div className="text-white/40 text-[10px]">{demo.sub}</div>
              </div>
              <ChevronRight size={10} className="text-white/30 group-hover:text-white/60 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HumanaHeader() {
  const location = useLocation()
  const pathLabel = PAGE_LABELS[location.pathname]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-humana-navy shadow-lg">
      <div className="flex items-center justify-between px-4 h-14">

        {/* Logo */}
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

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              location.pathname === '/'
                ? 'bg-humana-green text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home size={11} />
            Dashboard
          </Link>

          {TOWERS.map(tower => (
            <TowerDropdown key={tower.short} tower={tower} currentPath={location.pathname} />
          ))}
        </nav>

        {/* Right — intentionally empty */}
        <div />
      </div>

      {/* Breadcrumb */}
      {location.pathname !== '/' && pathLabel && (
        <div className="bg-humana-navy/80 border-t border-white/10 px-4 py-1 flex items-center gap-1 text-xs text-white/50">
          <Link to="/" className="hover:text-white/80">Dashboard</Link>
          <ChevronRight size={10} />
          <span className="text-white/70">{pathLabel}</span>
        </div>
      )}
    </header>
  )
}
