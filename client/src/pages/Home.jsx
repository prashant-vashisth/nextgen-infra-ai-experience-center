import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MetricCounter from '../components/MetricCounter'
import {
  GitBranch, Server, Shield, Activity, ChevronRight, Zap, Clock,
  ArrowRight, ExternalLink, Building2, Cpu,
} from 'lucide-react'

// ─── Tower taxonomy ───────────────────────────────────────────────────────────
//
// IT Operations & Infrastructure  → grouped (3 parent groups, each with children)
// Platform Engineering            → flat (6 leaf tiles)

const TOWERS = [
  {
    id: 'it-ops',
    label: 'IT Operations & Infrastructure',
    icon: Building2,
    color: 'from-humana-navy to-[#003d7a]',
    // grouped structure
    groups: [
      {
        id: 'it-operations',
        label: 'IT Operations',
        children: [
          { id: 'incident-response', label: 'Incident Response Management' },
          { id: 'toc',               label: 'TOC' },
          { id: 'aoc',               label: 'AOC' },
        ],
      },
      {
        id: 'it-infra-ops',
        label: 'IT Infra Ops',
        children: [
          { id: 'enterprise-itsm',  label: 'Enterprise ITSM' },
          { id: 'finops',           label: 'FinOps' },
          { id: 'iss',              label: 'ISS' },
          { id: 'cape',             label: 'CAPE' },
        ],
      },
      {
        id: 'observability-eai',
        label: 'Observability & EAI',
        children: [
          { id: 'dynatrace', label: 'Dynatrace' },
          { id: 'splunk',    label: 'Splunk' },
          { id: 'datapowr',  label: 'DataPowr' },
          { id: 'apigee',    label: 'APIGEE' },
          { id: 'graphql',   label: 'GraphQL' },
        ],
      },
    ],
  },
  {
    id: 'platform-eng',
    label: 'Platform Engineering',
    icon: Cpu,
    color: 'from-[#0f4c35] to-[#006633]',
    // flat structure
    subcategories: [
      { id: 'compute-storage',        label: 'Compute & Storage Engineering' },
      { id: 'network-engineering',    label: 'Network Engineering' },
      { id: 'security-engineering',   label: 'Security Engineering' },
      { id: 'cloud-engineering',      label: 'Cloud Engineering' },
      { id: 'data-engineering',       label: 'Data Engineering' },
      { id: 'automation-engineering', label: 'Automation Engineering' },
    ],
  },
]

// Flat list of every leaf sub-category for count lookups
const ALL_LEAVES = TOWERS.flatMap(t =>
  t.groups
    ? t.groups.flatMap(g => g.children)
    : t.subcategories
)

// ─── Use Cases ────────────────────────────────────────────────────────────────

const USE_CASES = [
  // AUTOMATION ENGINEERING
  { id: 1,  domain: 'Automation Engineering', title: 'Intelligent Operation Support & Troubleshooting Agent', category: 'Action Executor',        problem: 'Manual Terraform/Ansible troubleshooting takes 4+ hrs per incident',            beforeHrs: 480,  afterHrs: 144, tools: ['Terraform Cloud','Ansible','Temporal'],                        live: false, subcategories: ['automation-engineering','toc','aoc'] },
  { id: 2,  domain: 'Automation Engineering', title: 'Platform Vulnerability Agent',                         category: 'CVE Remediation',          problem: 'CVE backlog grows faster than teams can manually remediate',                   beforeHrs: 340,  afterHrs: 85,  tools: ['Prisma Cloud','GitHub','ServiceNow'],                          live: false, subcategories: ['security-engineering','automation-engineering','iss'] },
  { id: 3,  domain: 'Automation Engineering', title: 'Platform Build Agent',                                 category: 'Module Onboarding',        problem: 'Module & tenant onboarding requires 2 weeks manual effort',                   beforeHrs: 180,  afterHrs: 22,  tools: ['GitHub','Terraform','Azure DevOps'],                           live: false, subcategories: ['automation-engineering','cloud-engineering','cape'] },
  { id: 4,  domain: 'Automation Engineering', title: 'Code Base Administration',                             category: 'AI Bug Fixes',             problem: 'Bug triage and patching creates developer context-switching overhead',         beforeHrs: 220,  afterHrs: 66,  tools: ['GitHub','SonarQube','Groq AI'],                               live: false, subcategories: ['automation-engineering'] },
  { id: 5,  domain: 'Automation Engineering', title: 'Compliance Agent — Secret & Credential Remediation',   category: 'Compliance',               problem: 'Exposed secrets in repos discovered too late, manual remediation slow',        beforeHrs: 160,  afterHrs: 32,  tools: ['GitHub','HashiCorp Vault','Azure Key Vault'],                 live: false, subcategories: ['security-engineering','automation-engineering','iss'] },
  { id: 6,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — AI Validation',                 category: 'Cloud Onboarding',         problem: 'Cloud subscription onboarding requires 3-day manual checklist',               beforeHrs: 120,  afterHrs: 18,  tools: ['Azure ARM','GCP APIs','Terraform'],                           live: true, path: '/demo/cloud-onboarding-agent', subcategories: ['cloud-engineering','automation-engineering','cape'] },
  { id: 7,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — Code Optimization',             category: 'Code Optimization',        problem: 'IaC modules contain inefficient patterns increasing cloud spend 23%',          beforeHrs: 200,  afterHrs: 50,  tools: ['Azure Advisor','Terraform','GitHub'],                         live: false, subcategories: ['cloud-engineering','automation-engineering','finops'] },
  { id: 8,  domain: 'Automation Engineering', title: 'Configuration Template Creation',                      category: 'Scaffolding Agent',        problem: 'New configuration templates take 8 hrs of senior engineer time each',         beforeHrs: 96,   afterHrs: 12,  tools: ['GitHub','Terraform','Ansible'],                               live: false, subcategories: ['automation-engineering'] },
  { id: 9,  domain: 'Automation Engineering', title: 'IDA Workflow Assist Agent',                            category: 'Guided Explainability',    problem: 'IDA pipeline failures generate cryptic errors requiring expert analysis',      beforeHrs: 240,  afterHrs: 48,  tools: ['GitHub Actions','IDA Engine','ServiceNow KB','Groq AI'],      live: true,  path: '/demo/ida-workflow-agent', subcategories: ['automation-engineering','toc','aoc'] },
  { id: 10, domain: 'Automation Engineering', title: 'Terraform Debug Agent',                                category: 'Debug Automation',         problem: 'Terraform state corruption and plan failures require expert debugging',        beforeHrs: 180,  afterHrs: 36,  tools: ['Terraform Cloud','GitHub','Splunk'],                          live: false, subcategories: ['automation-engineering','splunk'] },
  { id: 11, domain: 'Automation Engineering', title: 'Validate Unit & Integration Test Results',              category: 'Test Validation',          problem: 'Test result analysis consumes 20% of developer sprint time',                  beforeHrs: 140,  afterHrs: 28,  tools: ['GitHub Actions','pytest','SonarQube'],                        live: false, subcategories: ['automation-engineering'] },
  { id: 12, domain: 'Automation Engineering', title: 'API Handler Issue Remediation',                        category: 'API Operations',           problem: 'API handler failures cause cascading downstream outages',                     beforeHrs: 160,  afterHrs: 40,  tools: ['Kong','Dynatrace','ServiceNow'],                              live: false, subcategories: ['aoc','dynatrace','apigee','graphql','datapowr'] },
  { id: 13, domain: 'Automation Engineering', title: 'AI-Driven Dependency Risk Management',                 category: 'Risk Management',          problem: 'Outdated dependencies with known CVEs accumulate undetected',                 beforeHrs: 200,  afterHrs: 50,  tools: ['Snyk','GitHub','Groq AI'],                                    live: true, path: '/demo/dependency-risk-agent', subcategories: ['security-engineering','automation-engineering','iss'] },
  { id: 14, domain: 'Automation Engineering', title: 'Capacity Insight and Recommendation',                  category: 'Capacity Planning',        problem: 'Manual capacity forecasting leads to 35% over-provisioning',                  beforeHrs: 120,  afterHrs: 24,  tools: ['Azure Monitor','Dynatrace','Power BI'],                       live: false, subcategories: ['finops','dynatrace','toc'] },
  { id: 15, domain: 'Automation Engineering', title: 'Conversational Support Agent for Cloud Provisioning',  category: 'Conversational AI',        problem: 'L1 cloud provisioning tickets require senior engineer intervention',           beforeHrs: 300,  afterHrs: 60,  tools: ['MS Teams','ServiceNow','Azure ARM'],                          live: false, subcategories: ['enterprise-itsm','cloud-engineering'] },

  // INFRA OPS / ESC
  { id: 16, domain: 'Infra Ops / ESC',        title: 'Container Lifecycle Management',                       category: 'Container Ops',            problem: 'Manual container image patching across 200+ services takes weeks',            beforeHrs: 400,  afterHrs: 80,  tools: ['AKS','ACR','Twistlock'],                                      live: false, subcategories: ['compute-storage','cloud-engineering','cape'] },
  { id: 17, domain: 'Infra Ops / ESC',        title: 'Design Document Generation',                           category: 'Documentation AI',         problem: 'Architecture docs are outdated within weeks, never reflect real state',       beforeHrs: 200,  afterHrs: 20,  tools: ['Confluence','GitHub','Groq AI'],                              live: false, subcategories: ['automation-engineering'] },
  { id: 18, domain: 'Infra Ops / ESC',        title: 'AI-Led Quality Engineering — QA Validation',           category: 'QA Automation',            problem: 'QA cycle takes 3 weeks; regression coverage is only 47%',                    beforeHrs: 480,  afterHrs: 96,  tools: ['Selenium','Postman','Azure DevOps'],                          live: false, subcategories: ['automation-engineering'] },
  { id: 19, domain: 'Infra Ops / ESC',        title: 'CVIT Remediation',                                     category: 'Vulnerability Management', problem: 'CVIT backlog grows at 150 items/month with 40-day avg remediation',           beforeHrs: 600,  afterHrs: 120, tools: ['Qualys','ServiceNow','Ansible'],                              live: false, subcategories: ['security-engineering','iss'] },
  { id: 20, domain: 'Infra Ops / ESC',        title: 'Middleware Upgrade',                                   category: 'Upgrade Automation',       problem: 'Middleware upgrades require 6-week manual change windows',                    beforeHrs: 720,  afterHrs: 144, tools: ['Ansible','ServiceNow','Dynatrace'],                           live: false, subcategories: ['compute-storage','dynatrace'] },
  { id: 21, domain: 'Infra Ops / ESC',        title: 'AI-Driven OS Image Update and Hardening',              category: 'OS Hardening',             problem: 'OS image updates across 3,000 VMs take 4 months manually',                   beforeHrs: 960,  afterHrs: 192, tools: ['Azure VM','Packer','CIS Benchmarks'],                         live: false, subcategories: ['compute-storage','security-engineering','cape'] },
  { id: 22, domain: 'Infra Ops / ESC',        title: 'Event Management, Anomaly Detection & Self-Heal',      category: 'AIOps',                    problem: 'Alert storm overwhelms L1: 2,400 alerts/day, 80% noise',                     beforeHrs: 520,  afterHrs: 104, tools: ['Dynatrace','Splunk','ServiceNow','Azure Monitor'],            live: true, path: '/demo/event-management-agent', subcategories: ['toc','aoc','dynatrace','splunk'] },
  { id: 23, domain: 'Infra Ops / ESC',        title: 'Major Incident Avoidance and Management (MIM)',        category: 'MIM Orchestrator',         problem: 'P1 MTTR averages 4.2 hrs due to manual war room coordination',               beforeHrs: 380,  afterHrs: 76,  tools: ['ServiceNow','PagerDuty','MS Teams','Dynatrace'],              live: false, subcategories: ['incident-response','toc','dynatrace'] },
  { id: 24, domain: 'Infra Ops / ESC',        title: 'Autonomous Change Validation',                         category: 'Change Management',        problem: 'Change validation is a 3-day manual process blocking deployment velocity',    beforeHrs: 480,  afterHrs: 72,  tools: ['ServiceNow','GitHub','Dynatrace'],                            live: false, subcategories: ['enterprise-itsm','aoc','dynatrace'] },
  { id: 25, domain: 'Infra Ops / ESC',        title: 'Batch Health Analyzer',                                category: 'Batch Operations',         problem: '2,280 hrs/mo manual batch monitoring across 5 systems with 62% noise',       beforeHrs: 2281, afterHrs: 830, tools: ['Control-M','Mainframe','Informatica','Oracle','Nabu'],        live: true,  path: '/demo/batch-health-analyzer', subcategories: ['toc','data-engineering'] },
  { id: 26, domain: 'Infra Ops / ESC',        title: 'Access and Authorization Management',                  category: 'IAM Automation',           problem: 'Access provisioning takes 5 days average, SLA is 2 days',                    beforeHrs: 340,  afterHrs: 68,  tools: ['Azure AD','ServiceNow','SailPoint'],                          live: false, subcategories: ['enterprise-itsm','iss'] },
  { id: 27, domain: 'Infra Ops / ESC',        title: 'Conversational Agent (Engineer/SRE Assist)',           category: 'Conversational AI',        problem: 'SREs spend 30% time answering L1 questions instead of strategic work',       beforeHrs: 280,  afterHrs: 56,  tools: ['MS Teams','Confluence','ServiceNow'],                         live: false, subcategories: ['aoc','enterprise-itsm'] },

  // NETWORK OPERATIONS
  { id: 28, domain: 'Network Operations',     title: 'Self-Heal Issues (Node Down, Interface, Switch Error)', category: 'Network Self-Heal',       problem: 'Network outages average 47 min MTTR due to manual diagnosis',                beforeHrs: 320,  afterHrs: 48,  tools: ['NetBrain','SolarWinds','Cisco'],                              live: false, subcategories: ['network-engineering','toc'] },
  { id: 29, domain: 'Network Operations',     title: 'Network Issue Remediation (Device/Links/WLC)',         category: 'Network Ops',              problem: 'Wireless LAN controller issues require on-site engineer intervention',        beforeHrs: 240,  afterHrs: 48,  tools: ['Cisco WLC','Meraki','SolarWinds'],                            live: false, subcategories: ['network-engineering'] },
  { id: 30, domain: 'Network Operations',     title: 'Network Configuration — Firewall Management',          category: 'Firewall Automation',      problem: 'Firewall rule changes take 10 days through manual CAB process',              beforeHrs: 160,  afterHrs: 24,  tools: ['Palo Alto','Panorama','ServiceNow'],                          live: false, subcategories: ['network-engineering','security-engineering'] },
  { id: 31, domain: 'Network Operations',     title: 'Conversational Agent — Network Assist',                category: 'Conversational AI',        problem: 'Network engineers handle 400 L1 queries/mo that require no expertise',       beforeHrs: 200,  afterHrs: 40,  tools: ['MS Teams','NetBrain','ServiceNow'],                           live: false, subcategories: ['network-engineering'] },

  // SECURITY / FINOPS
  { id: 32, domain: 'Security Engineering',   title: 'Configuration Anomaly Detection',                      category: 'Security Monitoring',      problem: 'Config drift goes undetected for avg 18 days creating compliance gaps',      beforeHrs: 360,  afterHrs: 72,  tools: ['Prisma Cloud','Azure Policy','Splunk'],                       live: false, subcategories: ['security-engineering','iss','splunk'] },
  { id: 33, domain: 'Security Engineering',   title: 'Code Review / Refactoring & Bug Fixing',               category: 'Secure Code Review',       problem: 'Security code review backlogs cause 3-week delivery delays',                 beforeHrs: 280,  afterHrs: 56,  tools: ['SonarQube','Checkmarx','GitHub'],                             live: false, subcategories: ['security-engineering','automation-engineering'] },
  { id: 34, domain: 'Security Engineering',   title: 'Predictive Capacity Planning, Rightsizing & Demand Forecasting', category: 'FinOps AI',  problem: '35% cloud resources over-provisioned, wasting $2.4M annually',              beforeHrs: 240,  afterHrs: 48,  tools: ['Azure Advisor','Azure Cost','Turbonomic'],                    live: false, subcategories: ['finops'] },
  { id: 35, domain: 'Security Engineering',   title: 'Cost Anomaly Detection, Budget Forecasting',           category: 'FinOps',                   problem: 'Cost spikes discovered 30+ days after occurrence on monthly bills',          beforeHrs: 180,  afterHrs: 36,  tools: ['Azure Cost Management','Power BI','Groq AI'],                live: true, path: '/demo/finops-cost-agent', subcategories: ['finops'] },
  { id: 36, domain: 'Security Engineering',   title: 'AKS Vulnerability & Compliance AI Remediation',        category: 'Container Security',       problem: 'CVE remediation cycle averages 47 days; HIPAA controls fail 26% of time',   beforeHrs: 480,  afterHrs: 96,  tools: ['Prisma Cloud','AKS','GitHub','NIST','HIPAA'],                 live: true,  path: '/demo/aks-vulnerability-agent', subcategories: ['security-engineering','cloud-engineering','cape'] },

  // ESC / ITSM
  { id: 37, domain: 'Infra Ops / ESC',        title: 'Compass User Access Requests — Action Executor',       category: 'Access Automation',        problem: 'Compass access provisioning requires 4 manual handoffs averaging 3 days',    beforeHrs: 280,  afterHrs: 42,  tools: ['Compass','ServiceNow','Azure AD'],                            live: false, subcategories: ['enterprise-itsm'] },
  { id: 38, domain: 'Infra Ops / ESC',        title: 'VSTS/Azure DevOps Access Request Automation',          category: 'Access Automation',        problem: 'ADO access requests have 3-day SLA; actual avg is 7 days',                  beforeHrs: 200,  afterHrs: 30,  tools: ['Azure DevOps','ServiceNow','Azure AD'],                       live: false, subcategories: ['enterprise-itsm','cloud-engineering'] },
  { id: 39, domain: 'Infra Ops / ESC',        title: 'GitHub Access Requests Automation',                    category: 'Access Automation',        problem: 'GitHub org access requests sit in queue for 5 days on average',             beforeHrs: 160,  afterHrs: 24,  tools: ['GitHub','ServiceNow','Azure AD'],                             live: false, subcategories: ['enterprise-itsm'] },
  { id: 40, domain: 'Infra Ops / ESC',        title: 'Docker Desktop License Requests Automation',           category: 'License Management',       problem: 'Docker Desktop license provisioning requires finance + IT approval chain',   beforeHrs: 120,  afterHrs: 12,  tools: ['ServiceNow','Docker','Azure AD'],                             live: false, subcategories: ['enterprise-itsm'] },
  { id: 41, domain: 'Infra Ops / ESC',        title: 'AI RCA + CMDB Data Cleanup & Enrichment',              category: 'CMDB Health',              problem: 'CMDB health at 67% — 33% of CIs have missing attributes impacting ITSM',   beforeHrs: 640,  afterHrs: 128, tools: ['ServiceNow CMDB','Dynatrace','Groq AI'],                      live: true,  path: '/demo/rca-cmdb-agent', subcategories: ['incident-response','enterprise-itsm','dynatrace'] },
  { id: 42, domain: 'Infra Ops / ESC',        title: 'Knowledge Fabric AI',                                  category: 'Knowledge Management',     problem: 'KB articles outdated 6 months avg; engineers waste 45 min/incident searching', beforeHrs: 480, afterHrs: 72,  tools: ['ServiceNow KB','Confluence','Groq AI'],                      live: false, subcategories: ['enterprise-itsm'] },
  { id: 43, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Validation Task Management',          category: 'PCT Automation',           problem: 'PCT validation tasks take 8 days manually with 22% rework rate',             beforeHrs: 320,  afterHrs: 64,  tools: ['ServiceNow','GitHub','Azure DevOps'],                         live: false, subcategories: ['aoc','automation-engineering'] },
  { id: 44, domain: 'Infra Ops / ESC',        title: 'PCT Automation — RCA Agent & Health Check Agent',      category: 'PCT Automation',           problem: 'Post-change testing requires 4-hr manual health check window',               beforeHrs: 240,  afterHrs: 36,  tools: ['Dynatrace','ServiceNow','Groq AI'],                           live: false, subcategories: ['incident-response','dynatrace'] },
  { id: 45, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Root Cause Analysis Agent',           category: 'PCT Automation',           problem: 'PCT RCA takes 6+ hrs without AI-assisted correlation of signals',            beforeHrs: 360,  afterHrs: 54,  tools: ['Splunk','Dynatrace','ServiceNow','Groq AI'],                  live: false, subcategories: ['incident-response','splunk','dynatrace'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countForLeaf(leafId) {
  return USE_CASES.filter(uc => uc.subcategories.includes(leafId)).length
}

function countForGroup(groupId, tower) {
  const group = tower.groups?.find(g => g.id === groupId)
  if (!group) return 0
  const leafIds = group.children.map(c => c.id)
  return USE_CASES.filter(uc => leafIds.some(lid => uc.subcategories.includes(lid))).length
}

// ─── Stat chips ───────────────────────────────────────────────────────────────

const TOTAL_FTE = Math.round(
  USE_CASES.reduce((s, uc) => s + (uc.beforeHrs - uc.afterHrs), 0) / 160
)

const STAT_CHIPS = [
  { label: '45 Use Cases',              color: 'bg-humana-green/10 text-humana-green border-humana-green/25' },
  { label: '2 Towers in Scope',         color: 'bg-humana-teal/10  text-humana-teal  border-humana-teal/25'  },
  { label: `~${TOTAL_FTE} FTEs saved/yr`, color: 'bg-amber-50 text-amber-700 border-amber-200'              },
  { label: '67% avg MTTR reduction',    color: 'bg-red-50 text-red-600 border-red-200'                       },
]

// ─── Tower panels ─────────────────────────────────────────────────────────────

// IT Operations & Infrastructure — grouped (two levels)
function ITOpsTowerPanel({ tower, activeLeaf, onSelect }) {
  const TowerIcon = tower.icon
  const totalUCs = USE_CASES.filter(uc =>
    tower.groups.flatMap(g => g.children).some(c => uc.subcategories.includes(c.id))
  ).length

  return (
    <div className="card-humana overflow-hidden flex flex-col">
      <div className={`bg-gradient-to-r ${tower.color} px-5 py-4 flex items-center gap-3`}>
        <div className="p-2 rounded-lg bg-white/15">
          <TowerIcon size={22} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base leading-tight">{tower.label}</h3>
          <p className="text-white/60 text-xs mt-0.5">{tower.groups.length} groups · {totalUCs} use cases</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {tower.groups.map(group => (
          <div key={group.id}>
            {/* Group label */}
            <div className="text-xs font-bold text-humana-navy uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-gray-200" />
              {group.label}
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            {/* Child tiles */}
            <div className="flex flex-wrap gap-2">
              {group.children.map(child => {
                const count = countForLeaf(child.id)
                const isActive = activeLeaf === child.id
                return (
                  <button
                    key={child.id}
                    onClick={() => onSelect(isActive ? null : child.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-humana-green border-humana-green text-white shadow-md scale-105'
                        : 'bg-gray-50 border-transparent hover:border-gray-300 hover:bg-white hover:shadow-sm text-gray-700'
                    }`}
                  >
                    {child.label}
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-humana-green/10 text-humana-green'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Platform Engineering — flat tiles
function PlatformTowerPanel({ tower, activeLeaf, onSelect }) {
  const TowerIcon = tower.icon
  const totalUCs = USE_CASES.filter(uc =>
    tower.subcategories.some(sc => uc.subcategories.includes(sc.id))
  ).length

  return (
    <div className="card-humana overflow-hidden flex flex-col">
      <div className={`bg-gradient-to-r ${tower.color} px-5 py-4 flex items-center gap-3`}>
        <div className="p-2 rounded-lg bg-white/15">
          <TowerIcon size={22} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base leading-tight">{tower.label}</h3>
          <p className="text-white/60 text-xs mt-0.5">{tower.subcategories.length} sub-categories · {totalUCs} use cases</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-2">
        {tower.subcategories.map(sc => {
          const count = countForLeaf(sc.id)
          const isActive = activeLeaf === sc.id
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

function UseCaseCard({ uc, index, activeLeaf }) {
  const savingsPct = uc.beforeHrs > 0 ? Math.round(((uc.beforeHrs - uc.afterHrs) / uc.beforeHrs) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`card-humana p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow relative
        ${uc.live ? 'border border-humana-green/40' : ''}`}
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
  const [activeLeaf, setActiveLeaf] = useState(null)
  const catalogRef = useRef(null)

  const activeLabel = activeLeaf
    ? ALL_LEAVES.find(l => l.id === activeLeaf)?.label
    : null

  const filtered = activeLeaf
    ? USE_CASES.filter(uc => uc.subcategories.includes(activeLeaf))
    : USE_CASES

  const handleSelect = (id) => {
    setActiveLeaf(id)
    if (id) setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const [itOpsTower, platformTower] = TOWERS

  return (
    <div className="min-h-screen bg-humana-light">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-humana-navy">Humana AI Operations Hub</h1>
            <p className="text-sm text-gray-500 mt-0.5">AI-powered automation across infrastructure towers</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STAT_CHIPS.map(chip => (
              <span key={chip.label} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${chip.color}`}>
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Towers in Scope ── */}
      <section className="px-6 pt-6 pb-2 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-humana-navy flex items-center gap-2">
            <Building2 size={16} className="text-humana-teal" />
            Towers in Scope
            <span className="text-xs font-normal text-gray-400">— click a sub-category to filter use cases</span>
          </h2>
          {activeLeaf && (
            <button
              onClick={() => setActiveLeaf(null)}
              className="text-xs text-gray-500 hover:text-humana-navy flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-white transition-colors"
            >
              ✕ Clear filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <ITOpsTowerPanel    tower={itOpsTower}    activeLeaf={activeLeaf} onSelect={handleSelect} />
          <PlatformTowerPanel tower={platformTower} activeLeaf={activeLeaf} onSelect={handleSelect} />
        </div>
      </section>

      {/* ── Use Case Catalog ── */}
      <section ref={catalogRef} className="px-6 pt-6 pb-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-humana-navy flex items-center gap-2">
            <Activity size={16} className="text-humana-teal" />
            {activeLabel
              ? <><span>{activeLabel}</span><span className="text-sm text-gray-400 font-normal ml-1">— {filtered.length} use cases</span></>
              : <>Use Case Catalog <span className="text-sm text-gray-400 font-normal">({filtered.length})</span></>
            }
          </h2>
          <Link to="/catalog" className="text-sm text-humana-green font-semibold flex items-center gap-1 hover:underline">
            Full Catalog <ExternalLink size={12} />
          </Link>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeLeaf || 'all'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((uc, i) => (
              <UseCaseCard key={uc.id} uc={uc} index={i} activeLeaf={activeLeaf} />
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Live Interactive Demos ── */}
      <section className="bg-humana-navy mt-6 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={16} className="text-humana-green" />
            <h2 className="text-base font-bold text-white">Live Interactive Demos</h2>
            <span className="text-white/40 text-xs">— 9 fully wired demos · real AI · real APIs · click to launch</span>
          </div>

          {/* IT Operations & Infrastructure */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">IT Operations & Infrastructure</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { path: '/demo/event-management-agent', title: 'Event Management & Self-Heal', desc: 'AIOps: 2,400 alerts/day → AI deduplication → 3 incidents → auto-remediation',  color: 'from-amber-700 to-amber-900',   badge: 'UC #22', domain: 'IT Operations', icon: Activity  },
                { path: '/demo/batch-health-analyzer',  title: 'Batch Health Analyzer',        desc: 'Unified NOC for Control-M, Mainframe, Toad, Informatica & Nabu pipelines',     color: 'from-emerald-700 to-emerald-900',badge: 'UC #25', domain: 'IT Infra Ops',  icon: Server    },
                { path: '/demo/rca-cmdb-agent',         title: 'RCA Agent + CMDB Enrichment',  desc: 'Problem ticket RCA with multi-source correlation and CMDB health dashboard',    color: 'from-purple-700 to-purple-900', badge: 'UC #41', domain: 'IT Infra Ops',  icon: Activity  },
                { path: '/demo/finops-cost-agent',      title: 'FinOps Cost Anomaly Agent',    desc: 'Azure cost intelligence: detect spend anomalies, forecast overages, right-size', color: 'from-orange-700 to-orange-900', badge: 'UC #35', domain: 'FinOps',        icon: Zap       },
              ].map(demo => (
                <Link key={demo.path} to={demo.path} className="group">
                  <div className={`bg-gradient-to-br ${demo.color} rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 h-full flex flex-col border border-white/10`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">{demo.badge}</span>
                      <span className="text-xs text-white/50">{demo.domain}</span>
                    </div>
                    <demo.icon size={22} className="text-white/70 mb-2" />
                    <h3 className="font-bold text-sm leading-snug mb-1">{demo.title}</h3>
                    <p className="text-white/55 text-xs leading-relaxed flex-1">{demo.desc}</p>
                    <div className="mt-3 flex items-center gap-1 text-humana-green text-xs font-bold group-hover:gap-2 transition-all">
                      Launch <ChevronRight size={12} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Engineering */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Platform Engineering</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { path: '/demo/cvit-workflow',             title: 'CVIT Multi-Agent Orchestrator',  desc: '10-step agentic workflow: LangGraph + Groq tool calling + real Azure/ServiceNow/GitHub', color: 'from-red-700 to-red-900', badge: 'UC #36', domain: 'Security Eng', icon: Shield },
                { path: '/demo/cloud-onboarding-agent',   title: 'Cloud Onboarding Validation',    desc: 'Reads real Terraform from GitHub, runs 12 IDA checks, AI remediates failures',    color: 'from-humana-teal to-[#006677]',   badge: 'UC #6',  domain: 'Cloud Eng',        icon: Activity  },
                { path: '/demo/ida-workflow-agent',       title: 'IDA Workflow Assist Agent',      desc: 'Real-time Terraform failure RCA with 5-Why analysis and GitHub workflow',         color: 'from-[#1a3a6b] to-[#0d2147]',    badge: 'UC #9',  domain: 'Automation Eng',   icon: GitBranch },
                { path: '/demo/dependency-risk-agent',    title: 'Dependency Risk Management',     desc: 'Scans real GitHub repos for CVEs, AI risk analysis, creates fix PR automatically', color: 'from-indigo-700 to-indigo-900',   badge: 'UC #13', domain: 'Automation Eng',   icon: Shield    },
              ].map(demo => (
                <Link key={demo.path} to={demo.path} className="group">
                  <div className={`bg-gradient-to-br ${demo.color} rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 h-full flex flex-col border border-white/10`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">{demo.badge}</span>
                      <span className="text-xs text-white/50">{demo.domain}</span>
                    </div>
                    <demo.icon size={22} className="text-white/70 mb-2" />
                    <h3 className="font-bold text-sm leading-snug mb-1">{demo.title}</h3>
                    <p className="text-white/55 text-xs leading-relaxed flex-1">{demo.desc}</p>
                    <div className="mt-3 flex items-center gap-1 text-humana-green text-xs font-bold group-hover:gap-2 transition-all">
                      Launch <ChevronRight size={12} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
