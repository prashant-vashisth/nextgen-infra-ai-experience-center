import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MetricCounter from '../components/MetricCounter'
import { GitBranch, Server, Shield, Activity, ChevronRight, Zap, Clock, TrendingDown, Users, ArrowRight, ExternalLink, ChevronDown, Building2, Cpu } from 'lucide-react'

// ─── Tower / Sub-category taxonomy ────────────────────────────────────────────

const TOWERS = [
  {
    id: 'it-ops',
    label: 'IT Operations & Infrastructure',
    icon: Building2,
    color: 'from-humana-navy to-[#003d7a]',
    accent: '#00A651',
    subcategories: [
      { id: 'it-operations',            label: 'IT Operations' },
      { id: 'incident-response',        label: 'Incident Response Management' },
      { id: 'toc-aoc',                  label: 'TOC / AOC' },
      { id: 'it-infra-ops',             label: 'IT Infra Ops' },
      { id: 'enterprise-itsm',          label: 'Enterprise ITSM' },
      { id: 'finops',                   label: 'FinOps' },
      { id: 'isscape',                  label: 'ISSCAPE' },
      { id: 'observability-ea',         label: 'Observability & EA' },
    ],
  },
  {
    id: 'platform-eng',
    label: 'Platform Engineering',
    icon: Cpu,
    color: 'from-[#0f4c35] to-[#006633]',
    accent: '#0099A8',
    subcategories: [
      { id: 'compute-storage',          label: 'Compute & Storage Engineering' },
      { id: 'network-engineering',      label: 'Network Engineering' },
      { id: 'security-engineering',     label: 'Security Engineering' },
      { id: 'cloud-engineering',        label: 'Cloud Engineering' },
      { id: 'data-engineering',         label: 'Data Engineering' },
      { id: 'automation-engineering',   label: 'Automation Engineering' },
    ],
  },
]

// ─── Use Cases (with subcategory tags) ───────────────────────────────────────

const USE_CASES = [
  // AUTOMATION ENGINEERING
  { id: 1,  domain: 'Automation Engineering', title: 'Intelligent Operation Support & Troubleshooting Agent', category: 'Action Executor',       problem: 'Manual Terraform/Ansible troubleshooting takes 4+ hrs per incident',             beforeHrs: 480,  afterHrs: 144, tools: ['Terraform Cloud','Ansible','Temporal'],                         live: false, subcategories: ['automation-engineering','it-infra-ops','it-operations'] },
  { id: 2,  domain: 'Automation Engineering', title: 'Platform Vulnerability Agent',                         category: 'CVE Remediation',         problem: 'CVE backlog grows faster than teams can manually remediate',                    beforeHrs: 340,  afterHrs: 85,  tools: ['Prisma Cloud','GitHub','ServiceNow'],                           live: false, subcategories: ['security-engineering','automation-engineering'] },
  { id: 3,  domain: 'Automation Engineering', title: 'Platform Build Agent',                                 category: 'Module Onboarding',       problem: 'Module & tenant onboarding requires 2 weeks manual effort',                    beforeHrs: 180,  afterHrs: 22,  tools: ['GitHub','Terraform','Azure DevOps'],                            live: false, subcategories: ['automation-engineering','cloud-engineering'] },
  { id: 4,  domain: 'Automation Engineering', title: 'Code Base Administration',                             category: 'AI Bug Fixes',            problem: 'Bug triage and patching creates developer context-switching overhead',          beforeHrs: 220,  afterHrs: 66,  tools: ['GitHub','SonarQube','Groq AI'],                                live: false, subcategories: ['automation-engineering'] },
  { id: 5,  domain: 'Automation Engineering', title: 'Compliance Agent — Secret & Credential Remediation',   category: 'Compliance',              problem: 'Exposed secrets in repos discovered too late, manual remediation slow',         beforeHrs: 160,  afterHrs: 32,  tools: ['GitHub','HashiCorp Vault','Azure Key Vault'],                  live: false, subcategories: ['security-engineering','automation-engineering','isscape'] },
  { id: 6,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — AI Validation',                 category: 'Cloud Onboarding',        problem: 'Cloud subscription onboarding requires 3-day manual checklist',                beforeHrs: 120,  afterHrs: 18,  tools: ['Azure ARM','GCP APIs','Terraform'],                            live: false, subcategories: ['cloud-engineering','automation-engineering'] },
  { id: 7,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — Code Optimization',             category: 'Code Optimization',       problem: 'IaC modules contain inefficient patterns increasing cloud spend 23%',           beforeHrs: 200,  afterHrs: 50,  tools: ['Azure Advisor','Terraform','GitHub'],                          live: false, subcategories: ['cloud-engineering','automation-engineering','finops'] },
  { id: 8,  domain: 'Automation Engineering', title: 'Configuration Template Creation',                      category: 'Scaffolding Agent',       problem: 'New configuration templates take 8 hrs of senior engineer time each',          beforeHrs: 96,   afterHrs: 12,  tools: ['GitHub','Terraform','Ansible'],                                live: false, subcategories: ['automation-engineering'] },
  { id: 9,  domain: 'Automation Engineering', title: 'IDA Workflow Assist Agent',                            category: 'Guided Explainability',   problem: 'IDA pipeline failures generate cryptic errors requiring expert analysis',       beforeHrs: 240,  afterHrs: 48,  tools: ['GitHub Actions','IDA Engine','ServiceNow KB','Groq AI'],       live: true,  path: '/demo/ida-workflow-agent', subcategories: ['automation-engineering','it-infra-ops'] },
  { id: 10, domain: 'Automation Engineering', title: 'Terraform Debug Agent',                                category: 'Debug Automation',        problem: 'Terraform state corruption and plan failures require expert debugging',         beforeHrs: 180,  afterHrs: 36,  tools: ['Terraform Cloud','GitHub','Splunk'],                           live: false, subcategories: ['automation-engineering'] },
  { id: 11, domain: 'Automation Engineering', title: 'Validate Unit & Integration Test Results',              category: 'Test Validation',         problem: 'Test result analysis consumes 20% of developer sprint time',                   beforeHrs: 140,  afterHrs: 28,  tools: ['GitHub Actions','pytest','SonarQube'],                         live: false, subcategories: ['automation-engineering'] },
  { id: 12, domain: 'Automation Engineering', title: 'API Handler Issue Remediation',                        category: 'API Operations',          problem: 'API handler failures cause cascading downstream outages',                      beforeHrs: 160,  afterHrs: 40,  tools: ['Kong','Dynatrace','ServiceNow'],                               live: false, subcategories: ['it-operations','it-infra-ops','observability-ea'] },
  { id: 13, domain: 'Automation Engineering', title: 'AI-Driven Dependency Risk Management',                 category: 'Risk Management',         problem: 'Outdated dependencies with known CVEs accumulate undetected',                  beforeHrs: 200,  afterHrs: 50,  tools: ['Snyk','GitHub','Groq AI'],                                     live: false, subcategories: ['security-engineering','automation-engineering'] },
  { id: 14, domain: 'Automation Engineering', title: 'Capacity Insight and Recommendation',                  category: 'Capacity Planning',       problem: 'Manual capacity forecasting leads to 35% over-provisioning',                   beforeHrs: 120,  afterHrs: 24,  tools: ['Azure Monitor','Dynatrace','Power BI'],                        live: false, subcategories: ['finops','it-infra-ops','observability-ea'] },
  { id: 15, domain: 'Automation Engineering', title: 'Conversational Support Agent for Cloud Provisioning',  category: 'Conversational AI',       problem: 'L1 cloud provisioning tickets require senior engineer intervention',            beforeHrs: 300,  afterHrs: 60,  tools: ['MS Teams','ServiceNow','Azure ARM'],                           live: false, subcategories: ['enterprise-itsm','it-operations','cloud-engineering'] },

  // INFRA OPS / ESC
  { id: 16, domain: 'Infra Ops / ESC',        title: 'Container Lifecycle Management',                       category: 'Container Ops',           problem: 'Manual container image patching across 200+ services takes weeks',             beforeHrs: 400,  afterHrs: 80,  tools: ['AKS','ACR','Twistlock'],                                       live: false, subcategories: ['compute-storage','cloud-engineering'] },
  { id: 17, domain: 'Infra Ops / ESC',        title: 'Design Document Generation',                           category: 'Documentation AI',        problem: 'Architecture docs are outdated within weeks, never reflect real state',        beforeHrs: 200,  afterHrs: 20,  tools: ['Confluence','GitHub','Groq AI'],                               live: false, subcategories: ['it-infra-ops','automation-engineering'] },
  { id: 18, domain: 'Infra Ops / ESC',        title: 'AI-Led Quality Engineering — QA Validation',           category: 'QA Automation',           problem: 'QA cycle takes 3 weeks; regression coverage is only 47%',                     beforeHrs: 480,  afterHrs: 96,  tools: ['Selenium','Postman','Azure DevOps'],                           live: false, subcategories: ['automation-engineering'] },
  { id: 19, domain: 'Infra Ops / ESC',        title: 'CVIT Remediation',                                     category: 'Vulnerability Management', problem: 'CVIT backlog grows at 150 items/month with 40-day avg remediation',            beforeHrs: 600,  afterHrs: 120, tools: ['Qualys','ServiceNow','Ansible'],                               live: false, subcategories: ['security-engineering','isscape'] },
  { id: 20, domain: 'Infra Ops / ESC',        title: 'Middleware Upgrade',                                   category: 'Upgrade Automation',      problem: 'Middleware upgrades require 6-week manual change windows',                     beforeHrs: 720,  afterHrs: 144, tools: ['Ansible','ServiceNow','Dynatrace'],                            live: false, subcategories: ['compute-storage'] },
  { id: 21, domain: 'Infra Ops / ESC',        title: 'AI-Driven OS Image Update and Hardening',              category: 'OS Hardening',            problem: 'OS image updates across 3,000 VMs take 4 months manually',                    beforeHrs: 960,  afterHrs: 192, tools: ['Azure VM','Packer','CIS Benchmarks'],                          live: false, subcategories: ['compute-storage','security-engineering'] },
  { id: 22, domain: 'Infra Ops / ESC',        title: 'Event Management, Anomaly Detection & Self-Heal',      category: 'AIOps',                   problem: 'Alert storm overwhelms L1: 2,400 alerts/day, 80% noise',                      beforeHrs: 520,  afterHrs: 104, tools: ['Dynatrace','Splunk','ServiceNow','Azure Monitor'],             live: false, subcategories: ['observability-ea','toc-aoc','it-operations'] },
  { id: 23, domain: 'Infra Ops / ESC',        title: 'Major Incident Avoidance and Management (MIM)',        category: 'MIM Orchestrator',        problem: 'P1 MTTR averages 4.2 hrs due to manual war room coordination',                beforeHrs: 380,  afterHrs: 76,  tools: ['ServiceNow','PagerDuty','MS Teams','Dynatrace'],               live: false, subcategories: ['incident-response','toc-aoc'] },
  { id: 24, domain: 'Infra Ops / ESC',        title: 'Autonomous Change Validation',                         category: 'Change Management',       problem: 'Change validation is a 3-day manual process blocking deployment velocity',     beforeHrs: 480,  afterHrs: 72,  tools: ['ServiceNow','GitHub','Dynatrace'],                             live: false, subcategories: ['enterprise-itsm','it-operations'] },
  { id: 25, domain: 'Infra Ops / ESC',        title: 'Batch Health Analyzer',                                category: 'Batch Operations',        problem: '2,280 hrs/mo manual batch monitoring across 5 systems with 62% noise',        beforeHrs: 2281, afterHrs: 830, tools: ['Control-M','Mainframe','Informatica','Oracle','Nabu'],         live: true,  path: '/demo/batch-health-analyzer', subcategories: ['toc-aoc','it-infra-ops','data-engineering'] },
  { id: 26, domain: 'Infra Ops / ESC',        title: 'Access and Authorization Management',                  category: 'IAM Automation',          problem: 'Access provisioning takes 5 days average, SLA is 2 days',                     beforeHrs: 340,  afterHrs: 68,  tools: ['Azure AD','ServiceNow','SailPoint'],                           live: false, subcategories: ['enterprise-itsm','it-operations','isscape'] },
  { id: 27, domain: 'Infra Ops / ESC',        title: 'Conversational Agent (Engineer/SRE Assist)',           category: 'Conversational AI',       problem: 'SREs spend 30% time answering L1 questions instead of strategic work',        beforeHrs: 280,  afterHrs: 56,  tools: ['MS Teams','Confluence','ServiceNow'],                          live: false, subcategories: ['it-operations','it-infra-ops'] },

  // NETWORK OPERATIONS
  { id: 28, domain: 'Network Operations',     title: 'Self-Heal Issues (Node Down, Interface, Switch Error)', category: 'Network Self-Heal',      problem: 'Network outages average 47 min MTTR due to manual diagnosis',                 beforeHrs: 320,  afterHrs: 48,  tools: ['NetBrain','SolarWinds','Cisco'],                               live: false, subcategories: ['network-engineering','toc-aoc'] },
  { id: 29, domain: 'Network Operations',     title: 'Network Issue Remediation (Device/Links/WLC)',         category: 'Network Ops',             problem: 'Wireless LAN controller issues require on-site engineer intervention',         beforeHrs: 240,  afterHrs: 48,  tools: ['Cisco WLC','Meraki','SolarWinds'],                             live: false, subcategories: ['network-engineering'] },
  { id: 30, domain: 'Network Operations',     title: 'Network Configuration — Firewall Management',          category: 'Firewall Automation',     problem: 'Firewall rule changes take 10 days through manual CAB process',               beforeHrs: 160,  afterHrs: 24,  tools: ['Palo Alto','Panorama','ServiceNow'],                           live: false, subcategories: ['network-engineering','security-engineering'] },
  { id: 31, domain: 'Network Operations',     title: 'Conversational Agent — Network Assist',                category: 'Conversational AI',       problem: 'Network engineers handle 400 L1 queries/mo that require no expertise',        beforeHrs: 200,  afterHrs: 40,  tools: ['MS Teams','NetBrain','ServiceNow'],                            live: false, subcategories: ['network-engineering'] },

  // SECURITY / FINOPS
  { id: 32, domain: 'Security Engineering',   title: 'Configuration Anomaly Detection',                      category: 'Security Monitoring',     problem: 'Config drift goes undetected for avg 18 days creating compliance gaps',       beforeHrs: 360,  afterHrs: 72,  tools: ['Prisma Cloud','Azure Policy','Splunk'],                        live: false, subcategories: ['security-engineering','observability-ea','isscape'] },
  { id: 33, domain: 'Security Engineering',   title: 'Code Review / Refactoring & Bug Fixing',               category: 'Secure Code Review',      problem: 'Security code review backlogs cause 3-week delivery delays',                  beforeHrs: 280,  afterHrs: 56,  tools: ['SonarQube','Checkmarx','GitHub'],                              live: false, subcategories: ['security-engineering','automation-engineering'] },
  { id: 34, domain: 'Security Engineering',   title: 'Predictive Capacity Planning, Rightsizing & Demand Forecasting', category: 'FinOps AI', problem: '35% cloud resources over-provisioned, wasting $2.4M annually',               beforeHrs: 240,  afterHrs: 48,  tools: ['Azure Advisor','Azure Cost','Turbonomic'],                     live: false, subcategories: ['finops','it-infra-ops'] },
  { id: 35, domain: 'Security Engineering',   title: 'Cost Anomaly Detection, Budget Forecasting',           category: 'FinOps',                  problem: 'Cost spikes discovered 30+ days after occurrence on monthly bills',           beforeHrs: 180,  afterHrs: 36,  tools: ['Azure Cost Management','Power BI','Groq AI'],                 live: false, subcategories: ['finops'] },
  { id: 36, domain: 'Security Engineering',   title: 'AKS Vulnerability & Compliance AI Remediation',        category: 'Container Security',      problem: 'CVE remediation cycle averages 47 days; HIPAA controls fail 26% of time',    beforeHrs: 480,  afterHrs: 96,  tools: ['Prisma Cloud','AKS','GitHub','NIST','HIPAA'],                  live: true,  path: '/demo/aks-vulnerability-agent', subcategories: ['security-engineering','cloud-engineering'] },

  // ESC / ITSM
  { id: 37, domain: 'Infra Ops / ESC',        title: 'Compass User Access Requests — Action Executor',       category: 'Access Automation',       problem: 'Compass access provisioning requires 4 manual handoffs averaging 3 days',     beforeHrs: 280,  afterHrs: 42,  tools: ['Compass','ServiceNow','Azure AD'],                             live: false, subcategories: ['enterprise-itsm'] },
  { id: 38, domain: 'Infra Ops / ESC',        title: 'VSTS/Azure DevOps Access Request Automation',          category: 'Access Automation',       problem: 'ADO access requests have 3-day SLA; actual avg is 7 days',                   beforeHrs: 200,  afterHrs: 30,  tools: ['Azure DevOps','ServiceNow','Azure AD'],                        live: false, subcategories: ['enterprise-itsm','cloud-engineering'] },
  { id: 39, domain: 'Infra Ops / ESC',        title: 'GitHub Access Requests Automation',                    category: 'Access Automation',       problem: 'GitHub org access requests sit in queue for 5 days on average',              beforeHrs: 160,  afterHrs: 24,  tools: ['GitHub','ServiceNow','Azure AD'],                              live: false, subcategories: ['enterprise-itsm'] },
  { id: 40, domain: 'Infra Ops / ESC',        title: 'Docker Desktop License Requests Automation',           category: 'License Management',      problem: 'Docker Desktop license provisioning requires finance + IT approval chain',    beforeHrs: 120,  afterHrs: 12,  tools: ['ServiceNow','Docker','Azure AD'],                              live: false, subcategories: ['enterprise-itsm'] },
  { id: 41, domain: 'Infra Ops / ESC',        title: 'AI RCA + CMDB Data Cleanup & Enrichment',              category: 'CMDB Health',             problem: 'CMDB health at 67% — 33% of CIs have missing attributes impacting ITSM',    beforeHrs: 640,  afterHrs: 128, tools: ['ServiceNow CMDB','Dynatrace','Groq AI'],                       live: true,  path: '/demo/rca-cmdb-agent', subcategories: ['incident-response','enterprise-itsm','observability-ea'] },
  { id: 42, domain: 'Infra Ops / ESC',        title: 'Knowledge Fabric AI',                                  category: 'Knowledge Management',    problem: 'KB articles outdated 6 months avg; engineers waste 45 min/incident searching', beforeHrs: 480, afterHrs: 72,  tools: ['ServiceNow KB','Confluence','Groq AI'],                       live: false, subcategories: ['enterprise-itsm','it-operations'] },
  { id: 43, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Validation Task Management',          category: 'PCT Automation',          problem: 'PCT validation tasks take 8 days manually with 22% rework rate',              beforeHrs: 320,  afterHrs: 64,  tools: ['ServiceNow','GitHub','Azure DevOps'],                          live: false, subcategories: ['it-operations','automation-engineering'] },
  { id: 44, domain: 'Infra Ops / ESC',        title: 'PCT Automation — RCA Agent & Health Check Agent',      category: 'PCT Automation',          problem: 'Post-change testing requires 4-hr manual health check window',                beforeHrs: 240,  afterHrs: 36,  tools: ['Dynatrace','ServiceNow','Groq AI'],                            live: false, subcategories: ['incident-response','observability-ea'] },
  { id: 45, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Root Cause Analysis Agent',           category: 'PCT Automation',          problem: 'PCT RCA takes 6+ hrs without AI-assisted correlation of signals',             beforeHrs: 360,  afterHrs: 54,  tools: ['Splunk','Dynatrace','ServiceNow','Groq AI'],                   live: false, subcategories: ['incident-response','observability-ea'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ucCountForSubcat(subcatId) {
  return USE_CASES.filter(uc => uc.subcategories.includes(subcatId)).length
}

// ─── Typewriter headline ──────────────────────────────────────────────────────

const TYPEWRITER_TEXTS = [
  'AI-Powered Infrastructure Operations',
  'Intelligent Automation for Humana',
  '45 Use Cases. 2 Towers. Zero Manual Toil.',
]

function TypewriterHeadline() {
  const [textIndex, setTextIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const target = TYPEWRITER_TEXTS[textIndex]
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < target.length) {
          setDisplayed(target.slice(0, charIdx + 1))
          setCharIdx(c => c + 1)
        } else {
          setTimeout(() => setDeleting(true), 2800)
        }
      } else {
        if (charIdx > 0) {
          setDisplayed(target.slice(0, charIdx - 1))
          setCharIdx(c => c - 1)
        } else {
          setDeleting(false)
          setTextIndex(i => (i + 1) % TYPEWRITER_TEXTS.length)
        }
      }
    }, deleting ? 30 : 55)
    return () => clearTimeout(timer)
  }, [charIdx, deleting, textIndex])

  return (
    <h1 className="text-3xl md:text-4xl font-bold text-humana-navy min-h-[2.5rem]">
      {displayed}
      <span className="border-r-4 border-humana-green ml-0.5 animate-pulse">&nbsp;</span>
    </h1>
  )
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar() {
  const totalFTE = USE_CASES.reduce((sum, uc) => sum + (uc.beforeHrs - uc.afterHrs), 0)
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
      {[
        { label: 'Total Use Cases',      value: 45,                           suffix: '',        icon: Zap,         color: 'text-humana-green' },
        { label: 'Towers Covered',       value: 2,                            suffix: '',        icon: Activity,    color: 'text-humana-teal'  },
        { label: 'Estimated FTE Savings',value: Math.round(totalFTE / 160),   suffix: ' FTEs/yr',icon: Users,       color: 'text-amber-500'    },
        { label: 'Avg MTTR Reduction',   value: 67,                           suffix: '%',       icon: TrendingDown,color: 'text-red-500'      },
      ].map(stat => (
        <div key={stat.label} className="bg-white/80 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-white">
          <stat.icon size={22} className={stat.color} />
          <div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              <MetricCounter value={stat.value} suffix={stat.suffix} duration={1400} />
            </div>
            <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tower overview panel ─────────────────────────────────────────────────────

function TowerPanel({ tower, activeSubcat, onSelect }) {
  const TowerIcon = tower.icon
  const totalUCs = USE_CASES.filter(uc =>
    tower.subcategories.some(sc => uc.subcategories.includes(sc.id))
  ).length

  return (
    <div className="card-humana overflow-hidden flex flex-col">
      {/* Tower header */}
      <div className={`bg-gradient-to-r ${tower.color} px-5 py-4 flex items-center gap-3`}>
        <div className="p-2 rounded-lg bg-white/15">
          <TowerIcon size={22} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base leading-tight">{tower.label}</h3>
          <p className="text-white/60 text-xs mt-0.5">{tower.subcategories.length} sub-categories · {totalUCs} use cases</p>
        </div>
      </div>

      {/* Sub-category tiles */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
        {tower.subcategories.map(sc => {
          const count = ucCountForSubcat(sc.id)
          const isActive = activeSubcat === sc.id
          return (
            <button
              key={sc.id}
              onClick={() => onSelect(isActive ? null : sc.id)}
              className={`group text-left px-3 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? 'bg-humana-green border-humana-green text-white shadow-md scale-[1.02]'
                  : 'bg-gray-50 border-transparent hover:border-gray-300 hover:bg-white hover:shadow-sm text-gray-700'
              }`}
            >
              <div className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-humana-navy'}`}>
                {sc.label}
              </div>
              <div className={`text-xs mt-1 font-bold ${isActive ? 'text-white/80' : 'text-humana-green'}`}>
                {count} use case{count !== 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Use-case card ────────────────────────────────────────────────────────────

function UseCaseCard({ uc, index, activeSubcat }) {
  const savingsPct = uc.beforeHrs > 0 ? Math.round(((uc.beforeHrs - uc.afterHrs) / uc.beforeHrs) * 100) : 0
  const highlighted = activeSubcat && uc.subcategories.includes(activeSubcat)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`card-humana p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow relative
        ${uc.live ? 'border border-humana-green/40' : ''}
        ${highlighted ? 'ring-2 ring-humana-green/60' : ''}`}
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
        {uc.tools.slice(0, 3).map(tool => (
          <span key={tool} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tool}</span>
        ))}
      </div>

      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{uc.problem}</p>

      <div className="mt-auto pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 line-through">{uc.beforeHrs} hr/mo</span>
            <ArrowRight size={10} className="text-humana-green" />
            <span className="text-humana-green font-bold">{uc.afterHrs} hr/mo</span>
            <span className="bg-green-100 text-humana-green font-bold px-1.5 py-0.5 rounded text-xs">{savingsPct}% ↓</span>
          </div>
          {uc.live && uc.path ? (
            <Link to={uc.path} className="flex items-center gap-1 text-xs text-humana-green font-semibold hover:underline">
              Open Demo <ExternalLink size={10} />
            </Link>
          ) : (
            <span className="badge-coming-soon">Coming Soon</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeSubcat, setActiveSubcat] = useState(null)
  const catalogRef = useRef(null)

  const activeSubcatLabel = activeSubcat
    ? TOWERS.flatMap(t => t.subcategories).find(sc => sc.id === activeSubcat)?.label
    : null

  const filtered = activeSubcat
    ? USE_CASES.filter(uc => uc.subcategories.includes(activeSubcat))
    : USE_CASES

  const handleSubcatSelect = (id) => {
    setActiveSubcat(id)
    if (id) {
      setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }

  return (
    <div className="min-h-screen bg-humana-light">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-humana-navy via-humana-navy to-[#003d7a] px-6 py-10 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-humana-green text-sm font-semibold mb-3">
            <span className="live-dot" />
            TCS × Humana AI Operations Hub
          </div>
          <TypewriterHeadline />
          <p className="text-white/70 mt-3 max-w-2xl text-sm leading-relaxed">
            A fully interactive live demonstration platform built for Humana's infrastructure leadership.
            Real AI. Real APIs. Real outcomes.
          </p>
          <StatBar />
        </div>
      </section>

      {/* ── Live Demo Cards ── */}
      <section className="px-6 py-8 max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-humana-navy mb-4 flex items-center gap-2">
          <Zap size={18} className="text-humana-green" />
          Live Interactive Demos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { path: '/demo/aks-vulnerability-agent', title: 'AKS Vulnerability & Compliance', desc: 'AI CVE remediation for Kubernetes with HIPAA compliance scoring',             color: 'from-red-600 to-red-800',         badge: 'UC #36', time: '15 min', icon: Shield    },
            { path: '/demo/ida-workflow-agent',      title: 'IDA Workflow Assist Agent',      desc: 'Real-time Terraform failure RCA with 5-Why and automated remediation',       color: 'from-humana-navy to-blue-900',    badge: 'UC #9',  time: '20 min', icon: GitBranch },
            { path: '/demo/batch-health-analyzer',   title: 'Batch Health Analyzer',          desc: 'Unified NOC for Control-M, Mainframe, Toad, Informatica, and Nabu',          color: 'from-emerald-700 to-emerald-900', badge: 'UC #25', time: '20 min', icon: Server    },
            { path: '/demo/rca-cmdb-agent',          title: 'RCA Agent + CMDB Enrichment',    desc: 'Problem ticket RCA with multi-source correlation and CMDB health dashboard',  color: 'from-purple-700 to-purple-900',   badge: 'UC #41', time: '20 min', icon: Activity  },
          ].map(demo => (
            <Link key={demo.path} to={demo.path} className="group">
              <div className={`bg-gradient-to-br ${demo.color} rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 h-full flex flex-col`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">{demo.badge}</span>
                  <span className="flex items-center gap-1 text-xs text-white/70"><Clock size={10} />{demo.time}</span>
                </div>
                <demo.icon size={28} className="text-white/80 mb-3" />
                <h3 className="font-bold text-base leading-tight mb-2">{demo.title}</h3>
                <p className="text-white/70 text-xs leading-relaxed flex-1">{demo.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-white/90 text-xs font-semibold group-hover:gap-2 transition-all">
                  Launch Demo <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Tower Overview ── */}
      <section className="px-6 pb-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-humana-navy flex items-center gap-2">
            <Building2 size={18} className="text-humana-teal" />
            Towers in Scope
          </h2>
          {activeSubcat && (
            <button
              onClick={() => setActiveSubcat(null)}
              className="text-xs text-gray-500 hover:text-humana-navy flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-white transition-colors"
            >
              ✕ Clear filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {TOWERS.map(tower => (
            <TowerPanel
              key={tower.id}
              tower={tower}
              activeSubcat={activeSubcat}
              onSelect={handleSubcatSelect}
            />
          ))}
        </div>
      </section>

      {/* ── Use Case Catalog ── */}
      <section ref={catalogRef} className="px-6 pb-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-humana-navy flex items-center gap-2">
            <Activity size={18} className="text-humana-teal" />
            {activeSubcatLabel
              ? <><span>{activeSubcatLabel}</span><span className="text-sm text-gray-400 font-normal">— {filtered.length} use cases</span></>
              : <>Full Use Case Catalog <span className="text-sm text-gray-400 font-normal">({filtered.length} use cases)</span></>
            }
          </h2>
          <Link to="/catalog" className="text-sm text-humana-green font-semibold flex items-center gap-1 hover:underline">
            Full Catalog <ExternalLink size={12} />
          </Link>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubcat || 'all'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((uc, i) => (
              <UseCaseCard key={uc.id} uc={uc} index={i} activeSubcat={activeSubcat} />
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

    </div>
  )
}
