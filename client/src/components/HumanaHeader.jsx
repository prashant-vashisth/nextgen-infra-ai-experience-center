import { Link, useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'

function ClaudeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <ellipse
          key={i}
          cx="32" cy="32" rx="5" ry="14"
          fill="#D97757"
          opacity={i % 2 === 0 ? '1' : '0.65'}
          transform={`rotate(${angle} 32 32)`}
        />
      ))}
    </svg>
  )
}

const NAV_LINKS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/demo/batch-health-analyzer',   label: 'Batch Analyzer'       },
  { path: '/demo/cvit-workflow',           label: 'CVIT Agent'           },
  { path: '/demo/apg-agent',               label: 'APG Agent'            },
  { path: '/demo/aks-helm-propagation',    label: 'Cluster Updates'      },
  { path: '/demo/cape-rightsizing-agent',  label: 'CAPE Rightsizing'     },
  { path: '/command-center',              label: 'AI Command Center'    },
]

const PAGE_LABELS = {
  '/': 'Dashboard',
  '/demo/batch-health-analyzer':   'Batch Health Analyzer',
  '/demo/cvit-workflow':           'CVIT Orchestrator',
  '/demo/cloud-onboarding-agent':  'Cloud Onboarding Validation',
  '/demo/apg-agent':               'Agentic Pipeline Governor',
  '/demo/dependency-risk-agent':   'Dependency Risk Management',
  '/demo/aks-vulnerability-agent': 'AKS Vulnerability Agent',
  '/demo/aks-helm-propagation':    'Multi-Cluster Update Agent',
  '/demo/cape-rightsizing-agent':  'CAPE Rightsizing Agent',
  '/dashboard2':                   'AI Value Realization',
  '/command-center':               'AI Command Center',
}

export default function HumanaHeader() {
  const location = useLocation()

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
            <ClaudeIcon />
            Powered by Claude Opus 4
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

    </header>
  )
}
