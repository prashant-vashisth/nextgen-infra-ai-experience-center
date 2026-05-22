import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ExternalLink, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'

const USE_CASES = [
  // AUTOMATION ENGINEERING
  { id: 1,  domain: 'Automation Engineering', title: 'Intelligent Operation Support & Troubleshooting Agent', category: 'Action Executor',        problem: 'Manual Terraform/Ansible troubleshooting takes 4+ hrs per incident',            tools: ['Terraform Cloud','Ansible','Temporal'],                        live: false },
  { id: 2,  domain: 'Automation Engineering', title: 'Platform Vulnerability Agent',                         category: 'CVE Remediation',          problem: 'CVE backlog grows faster than teams can manually remediate',                   tools: ['Prisma Cloud','GitHub','ServiceNow'],                          live: false },
  { id: 3,  domain: 'Automation Engineering', title: 'Platform Build Agent',                                 category: 'Module Onboarding',        problem: 'Module & tenant onboarding requires 2 weeks manual effort',                   tools: ['GitHub','Terraform','Azure DevOps'],                           live: false },
  { id: 4,  domain: 'Automation Engineering', title: 'Code Base Administration',                             category: 'AI Bug Fixes',             problem: 'Bug triage and patching creates developer context-switching overhead',         tools: ['GitHub','SonarQube','Groq AI'],                               live: false },
  { id: 5,  domain: 'Automation Engineering', title: 'Compliance Agent — Secret & Credential Remediation',   category: 'Compliance',               problem: 'Exposed secrets in repos discovered too late, manual remediation slow',        tools: ['GitHub','HashiCorp Vault','Azure Key Vault'],                 live: false },
  { id: 6,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — AI Validation',                 category: 'Cloud Onboarding',         problem: 'Cloud subscription onboarding requires 3-day manual checklist',               tools: ['Azure ARM','GCP APIs','Terraform'],                           live: true,  path: '/demo/cloud-onboarding-agent' },
  { id: 7,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — Code Optimization',             category: 'Code Optimization',        problem: 'IaC modules contain inefficient patterns increasing cloud spend',              tools: ['Azure Advisor','Terraform','GitHub'],                         live: false },
  { id: 8,  domain: 'Automation Engineering', title: 'Configuration Template Creation',                      category: 'Scaffolding Agent',        problem: 'New configuration templates take 8 hrs of senior engineer time each',         tools: ['GitHub','Terraform','Ansible'],                               live: false },
  { id: 9,  domain: 'Automation Engineering', title: 'IDA Workflow Assist Agent',                            category: 'Guided Explainability',    problem: 'IDA pipeline failures generate cryptic errors requiring expert analysis',      tools: ['GitHub Actions','IDA Engine','ServiceNow KB','Groq AI'],      live: true,  path: '/demo/ida-workflow-agent' },
  { id: 10, domain: 'Automation Engineering', title: 'Terraform Debug Agent',                                category: 'Debug Automation',         problem: 'Terraform state corruption and plan failures require expert debugging',        tools: ['Terraform Cloud','GitHub','Splunk'],                          live: false },
  { id: 11, domain: 'Automation Engineering', title: 'Validate Unit & Integration Test Results',              category: 'Test Validation',          problem: 'Test result analysis consumes 20% of developer sprint time',                  tools: ['GitHub Actions','pytest','SonarQube'],                        live: false },
  { id: 12, domain: 'Automation Engineering', title: 'API Handler Issue Remediation',                        category: 'API Operations',           problem: 'API handler failures cause cascading downstream outages',                     tools: ['Kong','Dynatrace','ServiceNow'],                              live: false },
  { id: 13, domain: 'Automation Engineering', title: 'AI-Driven Dependency Risk Management',                 category: 'Risk Management',          problem: 'Outdated dependencies with known CVEs accumulate undetected',                 tools: ['Snyk','GitHub','Groq AI'],                                    live: true,  path: '/demo/dependency-risk-agent' },
  { id: 14, domain: 'Automation Engineering', title: 'Capacity Insight and Recommendation',                  category: 'Capacity Planning',        problem: 'Manual capacity forecasting leads to over-provisioning',                      tools: ['Azure Monitor','Dynatrace','Power BI'],                       live: false },
  { id: 15, domain: 'Automation Engineering', title: 'Conversational Support Agent for Cloud Provisioning',  category: 'Conversational AI',        problem: 'L1 cloud provisioning tickets require senior engineer intervention',           tools: ['MS Teams','ServiceNow','Azure ARM'],                          live: false },

  // INFRA OPS / ESC
  { id: 16, domain: 'Infra Ops / ESC',        title: 'Container Lifecycle Management',                       category: 'Container Ops',            problem: 'Manual container image patching across 200+ services takes weeks',            tools: ['AKS','ACR','Twistlock'],                                      live: false },
  { id: 17, domain: 'Infra Ops / ESC',        title: 'Design Document Generation',                           category: 'Documentation AI',         problem: 'Architecture docs are outdated within weeks, never reflect real state',       tools: ['Confluence','GitHub','Groq AI'],                              live: false },
  { id: 18, domain: 'Infra Ops / ESC',        title: 'AI-Led Quality Engineering — QA Validation',           category: 'QA Automation',            problem: 'QA cycle takes 3 weeks; regression coverage is only 47%',                    tools: ['Selenium','Postman','Azure DevOps'],                          live: false },
  { id: 19, domain: 'Infra Ops / ESC',        title: 'CVIT Remediation',                                     category: 'Vulnerability Management', problem: 'CVIT backlog grows at 150 items/month with 40-day avg remediation',           tools: ['Qualys','ServiceNow','Ansible'],                              live: false },
  { id: 20, domain: 'Infra Ops / ESC',        title: 'Middleware Upgrade',                                   category: 'Upgrade Automation',       problem: 'Middleware upgrades require 6-week manual change windows',                    tools: ['Ansible','ServiceNow','Dynatrace'],                           live: false },
  { id: 21, domain: 'Infra Ops / ESC',        title: 'AI-Driven OS Image Update and Hardening',              category: 'OS Hardening',             problem: 'OS image updates across 3,000 VMs take 4 months manually',                   tools: ['Azure VM','Packer','CIS Benchmarks'],                         live: false },
  { id: 22, domain: 'Infra Ops / ESC',        title: 'Event Management, Anomaly Detection & Self-Heal',      category: 'AIOps',                    problem: 'Alert storm overwhelms L1 — high-volume alerts with significant noise',       tools: ['Dynatrace','Splunk','ServiceNow','Azure Monitor'],            live: true,  path: '/demo/event-management-agent' },
  { id: 23, domain: 'Infra Ops / ESC',        title: 'Major Incident Avoidance and Management (MIM)',        category: 'MIM Orchestrator',         problem: 'P1 MTTR elevated due to manual war room coordination',                       tools: ['ServiceNow','PagerDuty','MS Teams','Dynatrace'],              live: false },
  { id: 24, domain: 'Infra Ops / ESC',        title: 'Autonomous Change Validation',                         category: 'Change Management',        problem: 'Change validation is a multi-day manual process blocking deployment velocity',tools: ['ServiceNow','GitHub','Dynatrace'],                            live: false },
  { id: 25, domain: 'Infra Ops / ESC',        title: 'Batch Health Analyzer',                                category: 'Batch Operations',         problem: 'Manual batch monitoring across 5 systems with high false-positive noise',     tools: ['Control-M','Mainframe','Informatica','Oracle','Nabu'],        live: true,  path: '/demo/batch-health-analyzer' },
  { id: 26, domain: 'Infra Ops / ESC',        title: 'Access and Authorization Management',                  category: 'IAM Automation',           problem: 'Access provisioning SLA regularly missed due to manual handoffs',             tools: ['Azure AD','ServiceNow','SailPoint'],                          live: false },
  { id: 27, domain: 'Infra Ops / ESC',        title: 'Conversational Agent (Engineer/SRE Assist)',           category: 'Conversational AI',        problem: 'SREs spend significant time answering L1 questions instead of strategic work',tools: ['MS Teams','Confluence','ServiceNow'],                         live: false },

  // NETWORK OPERATIONS
  { id: 28, domain: 'Network Operations',     title: 'Self-Heal Issues (Node Down, Interface, Switch Error)', category: 'Network Self-Heal',       problem: 'Network outages have elevated MTTR due to manual diagnosis',                  tools: ['NetBrain','SolarWinds','Cisco'],                              live: false },
  { id: 29, domain: 'Network Operations',     title: 'Network Issue Remediation (Device/Links/WLC)',         category: 'Network Ops',              problem: 'Wireless LAN controller issues require on-site engineer intervention',        tools: ['Cisco WLC','Meraki','SolarWinds'],                            live: false },
  { id: 30, domain: 'Network Operations',     title: 'Network Configuration — Firewall Management',          category: 'Firewall Automation',      problem: 'Firewall rule changes take days through manual CAB process',                  tools: ['Palo Alto','Panorama','ServiceNow'],                          live: false },
  { id: 31, domain: 'Network Operations',     title: 'Conversational Agent — Network Assist',                category: 'Conversational AI',        problem: 'Network engineers handle high volume of L1 queries that require no expertise', tools: ['MS Teams','NetBrain','ServiceNow'],                           live: false },

  // SECURITY / FINOPS
  { id: 32, domain: 'Security Engineering',   title: 'Configuration Anomaly Detection',                      category: 'Security Monitoring',      problem: 'Config drift goes undetected for extended periods creating compliance gaps',   tools: ['Prisma Cloud','Azure Policy','Splunk'],                       live: false },
  { id: 33, domain: 'Security Engineering',   title: 'Code Review / Refactoring & Bug Fixing',               category: 'Secure Code Review',       problem: 'Security code review backlogs cause significant delivery delays',             tools: ['SonarQube','Checkmarx','GitHub'],                             live: false },
  { id: 34, domain: 'Security Engineering',   title: 'Predictive Capacity Planning, Rightsizing & Demand Forecasting', category: 'FinOps AI',   problem: 'Cloud resources over-provisioned due to lack of AI-driven forecasting',       tools: ['Azure Advisor','Azure Cost','Turbonomic'],                    live: false },
  { id: 35, domain: 'Security Engineering',   title: 'Cost Anomaly Detection, Budget Forecasting',           category: 'FinOps',                   problem: 'Cost spikes discovered well after occurrence — no real-time alerting',        tools: ['Azure Cost Management','Power BI','Groq AI'],                live: true,  path: '/demo/finops-cost-agent' },
  { id: 36, domain: 'Security Engineering',   title: 'AKS Vulnerability & Compliance AI Remediation',        category: 'Container Security',       problem: 'CVE remediation cycle is long; HIPAA controls fail regularly',               tools: ['Prisma Cloud','AKS','GitHub','NIST','HIPAA'],                 live: true,  path: '/demo/aks-vulnerability-agent' },

  // ESC / ITSM
  { id: 37, domain: 'Infra Ops / ESC',        title: 'Compass User Access Requests — Action Executor',       category: 'Access Automation',        problem: 'Compass access provisioning requires multiple manual handoffs averaging days', tools: ['Compass','ServiceNow','Azure AD'],                            live: false },
  { id: 38, domain: 'Infra Ops / ESC',        title: 'VSTS/Azure DevOps Access Request Automation',          category: 'Access Automation',        problem: 'ADO access requests regularly exceed SLA due to manual queue',               tools: ['Azure DevOps','ServiceNow','Azure AD'],                       live: false },
  { id: 39, domain: 'Infra Ops / ESC',        title: 'GitHub Access Requests Automation',                    category: 'Access Automation',        problem: 'GitHub org access requests sit in queue for days on average',                tools: ['GitHub','ServiceNow','Azure AD'],                             live: false },
  { id: 40, domain: 'Infra Ops / ESC',        title: 'Docker Desktop License Requests Automation',           category: 'License Management',       problem: 'Docker Desktop license provisioning requires finance + IT approval chain',   tools: ['ServiceNow','Docker','Azure AD'],                             live: false },
  { id: 41, domain: 'Infra Ops / ESC',        title: 'AI RCA + CMDB Data Cleanup & Enrichment',              category: 'CMDB Health',              problem: 'CMDB health degraded — CIs with missing attributes impacting ITSM quality',  tools: ['ServiceNow CMDB','Dynatrace','Groq AI'],                      live: true,  path: '/demo/rca-cmdb-agent' },
  { id: 42, domain: 'Infra Ops / ESC',        title: 'Knowledge Fabric AI',                                  category: 'Knowledge Management',     problem: 'KB articles outdated; engineers waste time per incident searching',           tools: ['ServiceNow KB','Confluence','Groq AI'],                      live: false },
  { id: 43, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Validation Task Management',          category: 'PCT Automation',           problem: 'PCT validation tasks take many days manually with high rework rate',          tools: ['ServiceNow','GitHub','Azure DevOps'],                         live: false },
  { id: 44, domain: 'Infra Ops / ESC',        title: 'PCT Automation — RCA Agent & Health Check Agent',      category: 'PCT Automation',           problem: 'Post-change testing requires extended manual health check window',            tools: ['Dynatrace','ServiceNow','Groq AI'],                           live: false },
  { id: 45, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Root Cause Analysis Agent',           category: 'PCT Automation',           problem: 'PCT RCA takes hours without AI-assisted correlation of signals',              tools: ['Splunk','Dynatrace','ServiceNow','Groq AI'],                  live: false },

  // CVIT
  { id: 36.1, domain: 'Security Engineering', title: 'CVIT Multi-Agent Orchestrator',                        category: 'Vulnerability Management', problem: '10-step agentic CVIT remediation: detect, enrich, approve, patch, validate',  tools: ['LangGraph','Groq AI','ServiceNow','GitHub','Azure AKS'],      live: true,  path: '/demo/cvit-workflow' },
]

const DOMAINS = ['All', 'Automation Engineering', 'Infra Ops / ESC', 'Network Operations', 'Security Engineering']

export default function Catalog() {
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('All')
  const [liveOnly, setLiveOnly] = useState(false)

  const filtered = USE_CASES.filter(uc => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      uc.title.toLowerCase().includes(q) ||
      uc.category.toLowerCase().includes(q) ||
      uc.problem.toLowerCase().includes(q) ||
      uc.tools.some(t => t.toLowerCase().includes(q)) ||
      String(uc.id).includes(q)
    const matchDomain = domain === 'All' || uc.domain === domain
    const matchLive = !liveOnly || uc.live
    return matchSearch && matchDomain && matchLive
  })

  const liveCount = USE_CASES.filter(u => u.live).length

  return (
    <div className="min-h-screen bg-humana-light">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Layers size={12} className="text-humana-teal" />
              Full Catalog
            </div>
            <h1 className="text-xl font-bold text-humana-navy">Use Case Catalog</h1>
            <p className="text-sm text-gray-500 mt-0.5">{USE_CASES.length} AI-powered use cases · {liveCount} live demos</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-humana-green/10 text-humana-green border border-humana-green/25 px-3 py-1.5 rounded-full font-semibold">{USE_CASES.length} Use Cases</span>
            <span className="bg-humana-teal/10 text-humana-teal border border-humana-teal/25 px-3 py-1.5 rounded-full font-semibold">{liveCount} Live Demos</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, category, tool, or UC number…"
              className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-humana-green/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map(d => (
              <button key={d} onClick={() => setDomain(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${domain === d ? 'bg-humana-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {d}
              </button>
            ))}
            <button onClick={() => setLiveOnly(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${liveOnly ? 'bg-humana-green text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveOnly ? 'bg-white' : 'bg-humana-green'}`} />
              Live only
            </button>
          </div>
        </div>

        {/* Result count */}
        <div className="text-xs text-gray-400 mb-4">
          Showing {filtered.length} of {USE_CASES.length} use cases
          {search && <span> matching <strong className="text-gray-600">"{search}"</strong></span>}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((uc, i) => (
            <motion.div
              key={uc.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.025, 0.4) }}
              className={`card-humana p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow relative ${uc.live ? 'border border-humana-green/40' : ''}`}
            >
              {uc.live && (
                <div className="absolute top-3 right-3">
                  <span className="badge-live"><span className="live-dot" />LIVE</span>
                </div>
              )}
              <div className="flex items-start gap-2 pr-16">
                <span className="text-xs font-bold text-gray-400 shrink-0 w-6">#{uc.id}</span>
                <h3 className="text-sm font-semibold text-humana-navy leading-tight">{uc.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs bg-humana-navy/10 text-humana-navy px-2 py-0.5 rounded-full font-medium">{uc.category}</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{uc.domain}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{uc.problem}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {uc.tools.slice(0, 3).map(tool => (
                  <span key={tool} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tool}</span>
                ))}
                {uc.tools.length > 3 && (
                  <span className="text-xs text-gray-400">+{uc.tools.length - 3} more</span>
                )}
              </div>
              <div className="mt-auto pt-2 border-t border-gray-100 flex justify-end">
                {uc.live && uc.path ? (
                  <Link to={uc.path} className="flex items-center gap-1 text-xs text-humana-green font-semibold hover:underline">
                    Open Demo <ExternalLink size={10} />
                  </Link>
                ) : (
                  <span className="badge-coming-soon">Coming Soon</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Search size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">No use cases match your search. Try a different term.</p>
          </div>
        )}
      </div>
    </div>
  )
}
