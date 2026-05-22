import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

// Re-use the same USE_CASES array - import from a shared module would be better
// but for simplicity we'll keep it here
const USE_CASES = [
  { id: 1, domain: 'Automation Engineering', title: 'Intelligent Operation Support & Troubleshooting Agent', category: 'Action Executor', problem: 'Manual Terraform/Ansible troubleshooting takes 4+ hrs per incident', beforeHrs: 480, afterHrs: 144, tools: ['Terraform Cloud', 'Ansible', 'Temporal'], live: false },
  { id: 2, domain: 'Automation Engineering', title: 'Platform Vulnerability Agent', category: 'CVE Remediation', problem: 'CVE backlog grows faster than teams can manually remediate', beforeHrs: 340, afterHrs: 85, tools: ['Prisma Cloud', 'GitHub', 'ServiceNow'], live: false },
  { id: 3, domain: 'Automation Engineering', title: 'Platform Build Agent', category: 'Module Onboarding', problem: 'Module & tenant onboarding requires 2 weeks manual effort', beforeHrs: 180, afterHrs: 22, tools: ['GitHub', 'Terraform', 'Azure DevOps'], live: false },
  { id: 4, domain: 'Automation Engineering', title: 'Code Base Administration', category: 'AI Bug Fixes', problem: 'Bug triage and patching creates developer context-switching overhead', beforeHrs: 220, afterHrs: 66, tools: ['GitHub', 'SonarQube', 'Groq AI'], live: false },
  { id: 5, domain: 'Automation Engineering', title: 'Compliance Agent — Secret & Credential Remediation', category: 'Compliance', problem: 'Exposed secrets in repos discovered too late', beforeHrs: 160, afterHrs: 32, tools: ['GitHub', 'HashiCorp Vault', 'Azure Key Vault'], live: false },
  { id: 9, domain: 'Automation Engineering', title: 'IDA Workflow Assist Agent', category: 'Guided Explainability', problem: 'IDA pipeline failures generate cryptic errors requiring expert analysis', beforeHrs: 240, afterHrs: 48, tools: ['GitHub Actions', 'IDA Engine', 'ServiceNow KB', 'Groq AI'], live: true, path: '/demo/ida-workflow-agent' },
  { id: 25, domain: 'Infra Ops / ESC', title: 'Batch Health Analyzer', category: 'Batch Operations', problem: '2,280 hrs/mo manual batch monitoring across 5 systems', beforeHrs: 2281, afterHrs: 830, tools: ['Control-M', 'Mainframe', 'Informatica', 'Oracle', 'Nabu'], live: true, path: '/demo/batch-health-analyzer' },
  { id: 36, domain: 'Security Engineering', title: 'AKS Vulnerability & Compliance AI Remediation', category: 'Container Security', problem: 'CVE remediation cycle averages 47 days; HIPAA controls fail 26% of time', beforeHrs: 480, afterHrs: 96, tools: ['Prisma Cloud', 'AKS', 'GitHub', 'NIST', 'HIPAA'], live: true, path: '/demo/aks-vulnerability-agent' },
  { id: 41, domain: 'Infra Ops / ESC', title: 'AI RCA + CMDB Data Cleanup & Enrichment', category: 'CMDB Health', problem: 'CMDB health at 67% — 33% of CIs have missing attributes', beforeHrs: 640, afterHrs: 128, tools: ['ServiceNow CMDB', 'Dynatrace', 'Groq AI'], live: true, path: '/demo/rca-cmdb-agent' },
]

export default function Catalog() {
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('All')

  const filtered = USE_CASES.filter(uc => {
    const matchSearch = uc.title.toLowerCase().includes(search.toLowerCase()) ||
      uc.category.toLowerCase().includes(search.toLowerCase()) ||
      uc.problem.toLowerCase().includes(search.toLowerCase())
    const matchDomain = domain === 'All' || uc.domain === domain
    return matchSearch && matchDomain
  })

  const domains = ['All', ...Array.from(new Set(USE_CASES.map(u => u.domain)))]

  return (
    <div className="min-h-screen bg-humana-light px-6 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-humana-navy mb-2">Full Use Case Catalog</h1>
      <p className="text-gray-500 text-sm mb-6">{USE_CASES.length} AI-powered use cases across 4 domains</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search use cases..."
            className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-humana-green/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {domains.map(d => (
            <button key={d} onClick={() => setDomain(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${domain === d ? 'bg-humana-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((uc, i) => (
          <motion.div
            key={uc.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`card-humana p-4 flex flex-col gap-3 ${uc.live ? 'border border-humana-green/30' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-gray-400 font-bold">#{uc.id}</span>
                <h3 className="text-sm font-semibold text-humana-navy mt-0.5 leading-tight">{uc.title}</h3>
              </div>
              {uc.live ? (
                <span className="badge-live shrink-0"><span className="live-dot" />LIVE</span>
              ) : (
                <span className="badge-coming-soon shrink-0">Soon</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="text-xs bg-humana-navy/10 text-humana-navy px-2 py-0.5 rounded-full">{uc.category}</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{uc.domain}</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">{uc.problem}</p>
            {uc.live && uc.path && (
              <Link to={uc.path} className="btn-primary text-xs py-1.5 justify-center mt-auto">
                Launch Demo <ExternalLink size={12} />
              </Link>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
