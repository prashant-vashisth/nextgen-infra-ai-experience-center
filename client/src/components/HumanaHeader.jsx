import { Link, useLocation } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'

const NAV_LINKS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/demo/event-management-agent',  label: 'Event Management'  },
  { path: '/demo/batch-health-analyzer',   label: 'Batch Analyzer'    },
  { path: '/demo/rca-cmdb-agent',          label: 'RCA + CMDB'        },
  { path: '/demo/finops-cost-agent',       label: 'FinOps'            },
  { path: '/demo/cvit-workflow',           label: 'CVIT Agent'        },
  { path: '/demo/cloud-onboarding-agent',  label: 'Cloud Onboarding'  },
  { path: '/demo/ida-workflow-agent',      label: 'IDA Agent'         },
  { path: '/demo/dependency-risk-agent',   label: 'Dependency Risk'   },
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
            AI-Powered Operations
          </span>
        </div>

        {/* Nav */}
        <nav className="hidden xl:flex items-center gap-0.5">
          {NAV_LINKS.map(link => (
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
