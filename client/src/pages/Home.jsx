import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Server, Shield, Activity, ChevronRight, ChevronDown,
  Zap, ExternalLink, Building2, Cpu, Globe,
} from 'lucide-react'
import UseCaseDrawer from '../components/UseCaseDrawer'
import SlideViewer from '../components/SlideViewer'
import { PROGRAM_STATS, TOP_METRICS } from '../data/dashboard2Data'

// ─── Tower taxonomy ───────────────────────────────────────────────────────────
//
// IT Operations & Infrastructure  → grouped (3 parent groups, each with children)
// Platform Engineering            → flat (6 leaf tiles)

const TOWERS = [
  {
    id: 'esc',
    label: 'Enterprise Service Center',
    icon: Building2,
    color: 'from-humana-navy to-[#003d7a]',
    groups: [
      {
        id: 'it-operations',
        label: 'IT Operations',
        children: [
          { id: 'incident-response', label: 'Enterprise Incident Response Management' },
          { id: 'toc',               label: 'TOC' },
          { id: 'aoc',               label: 'AOC' },
        ],
      },
    ],
  },
  {
    id: 'infra-ops',
    label: 'Infra Ops',
    icon: Server,
    color: 'from-[#0a3d6b] to-[#052a4e]',
    subcategories: [
      { id: 'enterprise-itsm', label: 'Enterprise ITSM' },
      { id: 'finops',          label: 'FinOps' },
      { id: 'iss',             label: 'ISS' },
      { id: 'cape',            label: 'CAPE' },
    ],
  },
  {
    id: 'obs-eai',
    label: 'Observability & EAI',
    icon: Activity,
    color: 'from-[#0a5c6b] to-[#063d4a]',
    subcategories: [
      { id: 'dynatrace', label: 'Dynatrace' },
      { id: 'splunk',    label: 'Splunk' },
      { id: 'datapowr',  label: 'DataPower' },
      { id: 'apigee',    label: 'APIGEE' },
      { id: 'graphql',   label: 'GraphQL' },
    ],
  },
  {
    id: 'platform-eng',
    label: 'Platform Engineering',
    icon: Cpu,
    color: 'from-[#0f4c35] to-[#006633]',
    subcategories: [
      { id: 'compute-storage',      label: 'Compute & Storage Engineering' },
      { id: 'security-engineering', label: 'Security Engineering' },
      { id: 'cloud-engineering',    label: 'Cloud Engineering' },
      { id: 'data-engineering',     label: 'Data Engineering' },
    ],
  },
  {
    id: 'network-eng',
    label: 'Network Engineering',
    icon: Globe,
    color: 'from-[#7a4500] to-[#4a2600]',
    subcategories: [
      { id: 'network-engineering', label: 'Network Engineering' },
    ],
  },
  {
    id: 'automation-eng',
    label: 'Automation Engineering',
    icon: Zap,
    color: 'from-[#4a1a7a] to-[#2d0d5c]',
    subcategories: [
      { id: 'automation-engineering', label: 'Automation Engineering' },
    ],
  },
]

// Flat list of every leaf sub-category for count lookups
const ALL_LEAVES = TOWERS.flatMap(t =>
  t.groups ? t.groups.flatMap(g => g.children) : t.subcategories
)

// ─── Use Cases ────────────────────────────────────────────────────────────────

const USE_CASES = [
  // AUTOMATION ENGINEERING
  { id: 1,  domain: 'Automation Engineering', title: 'Intelligent Operation Support & Troubleshooting Agent', category: 'Action Executor',        problem: 'Manual Terraform/Ansible troubleshooting takes 4+ hrs per incident',            beforeHrs: 480,  afterHrs: 144, tools: ['Terraform Cloud','Ansible','Temporal'],                        live: false, subcategories: ['automation-engineering','toc','aoc'] },
  { id: 2,  domain: 'Automation Engineering', title: 'Platform Vulnerability Agent',                         category: 'CVE Remediation',          problem: 'CVE backlog grows faster than teams can manually remediate',                   beforeHrs: 340,  afterHrs: 85,  tools: ['Prisma Cloud','GitHub','ServiceNow'],                          live: false, subcategories: ['security-engineering','automation-engineering','iss'] },
  { id: 3,  domain: 'Automation Engineering', title: 'Platform Build Agent',                                 category: 'Module Onboarding',        problem: 'Module & tenant onboarding requires 2 weeks manual effort',                   beforeHrs: 180,  afterHrs: 22,  tools: ['GitHub','Terraform','Azure DevOps'],                           live: false, subcategories: ['automation-engineering','cloud-engineering','cape'] },
  { id: 4,  domain: 'Automation Engineering', title: 'Code Base Administration',                             category: 'AI Bug Fixes',             problem: 'Bug triage and patching creates developer context-switching overhead',         beforeHrs: 220,  afterHrs: 66,  tools: ['GitHub','SonarQube','Claude Opus 4'],                               live: false, subcategories: ['automation-engineering'] },
  { id: 5,  domain: 'Automation Engineering', title: 'Compliance Agent — Secret & Credential Remediation',   category: 'Compliance',               problem: 'Exposed secrets in repos discovered too late, manual remediation slow',        beforeHrs: 160,  afterHrs: 32,  tools: ['GitHub','HashiCorp Vault','Azure Key Vault'],                 live: false, subcategories: ['security-engineering','automation-engineering','iss'] },
  { id: 6,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — AI Validation',                 category: 'Cloud Onboarding',         problem: 'Cloud subscription onboarding requires 3-day manual checklist',               beforeHrs: 120,  afterHrs: 18,  tools: ['Azure ARM','GCP APIs','Terraform'],                           live: true, path: '/demo/cloud-onboarding-agent', subcategories: ['cloud-engineering','automation-engineering','cape'] },
  { id: 7,  domain: 'Automation Engineering', title: 'Azure/GCP Onboarding — Code Optimization',             category: 'Code Optimization',        problem: 'IaC modules contain inefficient patterns increasing cloud spend 23%',          beforeHrs: 200,  afterHrs: 50,  tools: ['Azure Advisor','Terraform','GitHub'],                         live: false, subcategories: ['cloud-engineering','automation-engineering','finops'] },
  { id: 8,  domain: 'Automation Engineering', title: 'Configuration Template Creation',                      category: 'Scaffolding Agent',        problem: 'New configuration templates take 8 hrs of senior engineer time each',         beforeHrs: 96,   afterHrs: 12,  tools: ['GitHub','Terraform','Ansible'],                               live: false, subcategories: ['automation-engineering'] },
  { id: 9,  domain: 'Automation Engineering', title: 'APG Workflow Assist Agent',                            category: 'Guided Explainability',    problem: 'Terraform pipeline failures generate cryptic errors requiring expert analysis', beforeHrs: 240,  afterHrs: 48,  tools: ['GitHub Actions','APG Engine','ServiceNow KB','Claude Opus 4'],      live: true,  path: '/demo/apg-agent', subcategories: ['automation-engineering','toc','aoc'] },
  { id: 10, domain: 'Automation Engineering', title: 'Terraform Debug Agent',                                category: 'Debug Automation',         problem: 'Terraform state corruption and plan failures require expert debugging',        beforeHrs: 180,  afterHrs: 36,  tools: ['Terraform Cloud','GitHub','Splunk'],                          live: false, subcategories: ['automation-engineering','splunk'] },
  { id: 11, domain: 'Automation Engineering', title: 'Validate Unit & Integration Test Results',              category: 'Test Validation',          problem: 'Test result analysis consumes 20% of developer sprint time',                  beforeHrs: 140,  afterHrs: 28,  tools: ['GitHub Actions','pytest','SonarQube'],                        live: false, subcategories: ['automation-engineering'] },
  { id: 12, domain: 'Automation Engineering', title: 'API Handler Issue Remediation',                        category: 'API Operations',           problem: 'API handler failures cause cascading downstream outages',                     beforeHrs: 160,  afterHrs: 40,  tools: ['Kong','Dynatrace','ServiceNow'],                              live: false, subcategories: ['aoc','dynatrace','apigee','graphql','datapowr'] },
  { id: 13, domain: 'Automation Engineering', title: 'AI-Driven Dependency Risk Management',                 category: 'Risk Management',          problem: 'Outdated dependencies with known CVEs accumulate undetected',                 beforeHrs: 200,  afterHrs: 50,  tools: ['Snyk','GitHub','Claude Opus 4'],                                    live: true, path: '/demo/dependency-risk-agent', subcategories: ['security-engineering','automation-engineering','iss'] },
  { id: 14, domain: 'Automation Engineering', title: 'Capacity Insight and Recommendation',                  category: 'Capacity Planning',        problem: 'Manual capacity forecasting leads to 35% over-provisioning',                  beforeHrs: 120,  afterHrs: 24,  tools: ['Azure Monitor','Dynatrace','Power BI'],                       live: false, subcategories: ['finops','dynatrace','toc'] },
  { id: 15, domain: 'Automation Engineering', title: 'Conversational Support Agent for Cloud Provisioning',  category: 'Conversational AI',        problem: 'L1 cloud provisioning tickets require senior engineer intervention',           beforeHrs: 300,  afterHrs: 60,  tools: ['MS Teams','ServiceNow','Azure ARM'],                          live: false, subcategories: ['enterprise-itsm','cloud-engineering'] },

  // INFRA OPS / ESC
  { id: 16, domain: 'Infra Ops / ESC',        title: 'Container Lifecycle Management',                       category: 'Container Ops',            problem: 'Manual container image patching across 200+ services takes weeks',            beforeHrs: 400,  afterHrs: 80,  tools: ['AKS','ACR','Twistlock'],                                      live: false, subcategories: ['compute-storage','cloud-engineering','cape'] },
  { id: 17, domain: 'Infra Ops / ESC',        title: 'Design Document Generation',                           category: 'Documentation AI',         problem: 'Architecture docs are outdated within weeks, never reflect real state',       beforeHrs: 200,  afterHrs: 20,  tools: ['Confluence','GitHub','Claude Opus 4'],                              live: false, subcategories: ['automation-engineering'] },
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
  { id: 35, domain: 'Security Engineering',   title: 'Cost Anomaly Detection, Budget Forecasting',           category: 'FinOps',                   problem: 'Cost spikes discovered 30+ days after occurrence on monthly bills',          beforeHrs: 180,  afterHrs: 36,  tools: ['Azure Cost Management','Power BI','Claude Opus 4'],                live: true, path: '/demo/finops-cost-agent', subcategories: ['finops'] },
  { id: 36, domain: 'Security Engineering',   title: 'AKS Vulnerability & Compliance AI Remediation',        category: 'Container Security',       problem: 'CVE remediation cycle averages 47 days; HIPAA controls fail 26% of time',   beforeHrs: 480,  afterHrs: 96,  tools: ['Prisma Cloud','AKS','GitHub','NIST','HIPAA'],                 live: true,  path: '/demo/aks-vulnerability-agent', subcategories: ['security-engineering','cloud-engineering','cape'] },

  // ESC / ITSM
  { id: 37, domain: 'Infra Ops / ESC',        title: 'Compass User Access Requests — Action Executor',       category: 'Access Automation',        problem: 'Compass access provisioning requires 4 manual handoffs averaging 3 days',    beforeHrs: 280,  afterHrs: 42,  tools: ['Compass','ServiceNow','Azure AD'],                            live: false, subcategories: ['enterprise-itsm'] },
  { id: 38, domain: 'Infra Ops / ESC',        title: 'VSTS/Azure DevOps Access Request Automation',          category: 'Access Automation',        problem: 'ADO access requests have 3-day SLA; actual avg is 7 days',                  beforeHrs: 200,  afterHrs: 30,  tools: ['Azure DevOps','ServiceNow','Azure AD'],                       live: false, subcategories: ['enterprise-itsm','cloud-engineering'] },
  { id: 39, domain: 'Infra Ops / ESC',        title: 'GitHub Access Requests Automation',                    category: 'Access Automation',        problem: 'GitHub org access requests sit in queue for 5 days on average',             beforeHrs: 160,  afterHrs: 24,  tools: ['GitHub','ServiceNow','Azure AD'],                             live: false, subcategories: ['enterprise-itsm'] },
  { id: 40, domain: 'Infra Ops / ESC',        title: 'Docker Desktop License Requests Automation',           category: 'License Management',       problem: 'Docker Desktop license provisioning requires finance + IT approval chain',   beforeHrs: 120,  afterHrs: 12,  tools: ['ServiceNow','Docker','Azure AD'],                             live: false, subcategories: ['enterprise-itsm'] },
  { id: 41, domain: 'Infra Ops / ESC',        title: 'AI RCA + CMDB Data Cleanup & Enrichment',              category: 'CMDB Health',              problem: 'CMDB health at 67% — 33% of CIs have missing attributes impacting ITSM',   beforeHrs: 640,  afterHrs: 128, tools: ['ServiceNow CMDB','Dynatrace','Claude Opus 4'],                      live: true,  path: '/demo/rca-cmdb-agent', subcategories: ['incident-response','enterprise-itsm','dynatrace'] },
  { id: 42, domain: 'Infra Ops / ESC',        title: 'Knowledge Fabric AI',                                  category: 'Knowledge Management',     problem: 'KB articles outdated 6 months avg; engineers waste 45 min/incident searching', beforeHrs: 480, afterHrs: 72,  tools: ['ServiceNow KB','Confluence','Claude Opus 4'],                      live: false, subcategories: ['enterprise-itsm'] },
  { id: 43, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Validation Task Management',          category: 'PCT Automation',           problem: 'PCT validation tasks take 8 days manually with 22% rework rate',             beforeHrs: 320,  afterHrs: 64,  tools: ['ServiceNow','GitHub','Azure DevOps'],                         live: false, subcategories: ['aoc','automation-engineering'] },
  { id: 44, domain: 'Infra Ops / ESC',        title: 'PCT Automation — RCA Agent & Health Check Agent',      category: 'PCT Automation',           problem: 'Post-change testing requires 4-hr manual health check window',               beforeHrs: 240,  afterHrs: 36,  tools: ['Dynatrace','ServiceNow','Claude Opus 4'],                           live: false, subcategories: ['incident-response','dynatrace'] },
  { id: 45, domain: 'Infra Ops / ESC',        title: 'PCT Automation — Root Cause Analysis Agent',           category: 'PCT Automation',           problem: 'PCT RCA takes 6+ hrs without AI-assisted correlation of signals',            beforeHrs: 360,  afterHrs: 54,  tools: ['Splunk','Dynatrace','ServiceNow','Claude Opus 4'],                  live: false, subcategories: ['incident-response','splunk','dynatrace'] },
  { id: 47, domain: 'Cloud Engineering',      title: 'Multi-Cluster Update Agent',                           category: 'Multi-Cluster Automation', problem: 'Helm chart updates require manual edits across every AKS cluster repo — error-prone, hours of work per release', beforeHrs: 480, afterHrs: 30, tools: ['Azure AKS','GitHub','Helm','Claude Opus 4'], live: true, path: '/demo/aks-helm-propagation', subcategories: ['cloud-engineering','automation-engineering','cape'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HIDDEN_UC_IDS = new Set([25])
const OBS_NETWORK_IDS = new Set(['dynatrace', 'splunk', 'datapowr', 'apigee', 'graphql', 'network-engineering'])

function countForLeaf(leafId) {
  return USE_CASES.filter(uc => !HIDDEN_UC_IDS.has(uc.id) && uc.subcategories.includes(leafId)).length
}

function countForGroup(groupId, tower) {
  const group = tower.groups?.find(g => g.id === groupId)
  if (!group) return 0
  const leafIds = group.children.map(c => c.id)
  return USE_CASES.filter(uc => !HIDDEN_UC_IDS.has(uc.id) && leafIds.some(lid => uc.subcategories.includes(lid))).length
}

// ─── AAA (Assist / Augment / Autonomous) data — sourced from USE_CASES_TABLE ──

const AAA_DATA = {
  // ── Existing (unchanged) ─────────────────────────────────────────────────────
  2:  { assist: 40, augment: 30, autonomous: 30 },  // Platform Vulnerability Agent
  6:  { assist: 25, augment: 45, autonomous: 30 },  // Azure/GCP Onboarding Validation
  9:  { assist: 35, augment: 40, autonomous: 25 },  // APG Workflow Assist
  19: { assist: 40, augment: 30, autonomous: 30 },  // CVIT Remediation
  22: { assist: 20, augment: 25, autonomous: 55 },  // Event Mgmt & Self-Heal
  23: { assist: 25, augment: 50, autonomous: 25 },  // Major Incident Avoidance
  25: { assist: 30, augment: 45, autonomous: 25 },  // Batch Health Analyzer
  26: { assist: 25, augment: 35, autonomous: 40 },  // Access & Auth Management
  37: { assist: 25, augment: 35, autonomous: 40 },  // Compass User Access
  38: { assist: 20, augment: 30, autonomous: 50 },  // VSTS/Azure DevOps Access
  39: { assist: 20, augment: 25, autonomous: 55 },  // GitHub Access Automation
  40: { assist: 30, augment: 35, autonomous: 35 },  // Docker Desktop License
  41: { assist: 20, augment: 45, autonomous: 35 },  // AI RCA + CMDB Enrichment
  42: { assist: 15, augment: 45, autonomous: 40 },  // Knowledge Fabric AI
  // ── Calculated for remaining use cases ──────────────────────────────────────
  1:  { assist: 30, augment: 40, autonomous: 30 },  // Intelligent Op Support & Troubleshooting
  3:  { assist: 20, augment: 35, autonomous: 45 },  // Platform Build Agent
  4:  { assist: 35, augment: 45, autonomous: 20 },  // Code Base Administration
  5:  { assist: 15, augment: 30, autonomous: 55 },  // Compliance — Secret & Credential Remediation
  7:  { assist: 35, augment: 45, autonomous: 20 },  // Azure/GCP Onboarding — Code Optimization
  8:  { assist: 25, augment: 40, autonomous: 35 },  // Configuration Template Creation
  10: { assist: 35, augment: 40, autonomous: 25 },  // Terraform Debug Agent
  11: { assist: 30, augment: 45, autonomous: 25 },  // Validate Unit & Integration Test Results
  12: { assist: 25, augment: 40, autonomous: 35 },  // API Handler Issue Remediation
  13: { assist: 25, augment: 35, autonomous: 40 },  // AI-Driven Dependency Risk Management
  14: { assist: 40, augment: 45, autonomous: 15 },  // Capacity Insight and Recommendation
  15: { assist: 45, augment: 40, autonomous: 15 },  // Conversational Support Agent — Cloud Provisioning
  16: { assist: 25, augment: 35, autonomous: 40 },  // Container Lifecycle Management
  17: { assist: 30, augment: 50, autonomous: 20 },  // Design Document Generation
  18: { assist: 25, augment: 40, autonomous: 35 },  // AI-Led Quality Engineering — QA Validation
  20: { assist: 30, augment: 40, autonomous: 30 },  // Middleware Upgrade
  21: { assist: 20, augment: 35, autonomous: 45 },  // AI-Driven OS Image Update and Hardening
  24: { assist: 25, augment: 40, autonomous: 35 },  // Autonomous Change Validation
  27: { assist: 50, augment: 35, autonomous: 15 },  // Conversational Agent — Engineer/SRE Assist
  28: { assist: 20, augment: 30, autonomous: 50 },  // Self-Heal Issues (Node Down, Interface)
  29: { assist: 30, augment: 40, autonomous: 30 },  // Network Issue Remediation
  30: { assist: 30, augment: 45, autonomous: 25 },  // Network Configuration — Firewall Management
  31: { assist: 50, augment: 35, autonomous: 15 },  // Conversational Agent — Network Assist
  32: { assist: 30, augment: 40, autonomous: 30 },  // Configuration Anomaly Detection
  33: { assist: 40, augment: 45, autonomous: 15 },  // Code Review / Refactoring & Bug Fixing
  34: { assist: 40, augment: 45, autonomous: 15 },  // Predictive Capacity Planning & Rightsizing
  35: { assist: 35, augment: 40, autonomous: 25 },  // Cost Anomaly Detection & Budget Forecasting
  36: { assist: 20, augment: 35, autonomous: 45 },  // AKS Vulnerability & Compliance AI Remediation
  43: { assist: 25, augment: 40, autonomous: 35 },  // PCT Automation — Validation Task Management
  44: { assist: 25, augment: 40, autonomous: 35 },  // PCT Automation — RCA Agent & Health Check
  45: { assist: 30, augment: 45, autonomous: 25 },  // PCT Automation — Root Cause Analysis Agent
  47: { assist: 15, augment: 30, autonomous: 55 },  // Multi-Cluster Update Agent
}

// ─── UC metadata — implementation quarter + AI solution from the plan ─────────

const UC_META = {
  // ── Q3 FY26 — Live ──────────────────────────────────────────────────────────
  6:  { quarter: 'Q3 FY26', qStatus: 'live',
        solution: 'Automated 12-point compliance checklist validation — consistent cloud onboarding quality guaranteed from day one without manual steps' },
  9:  { quarter: 'Q3 FY26', qStatus: 'live',
        solution: '50%+ productivity gain on pipeline failures · 40–50% reduction in support requests through self-service AI resolution' },
  13: { quarter: 'Q3 FY26', qStatus: 'live',
        solution: 'AI continuously scans GitHub repos for CVE-flagged dependencies and auto-creates fix PRs — vulnerability debt eliminated before it reaches production' },
  22: { quarter: 'Q3 FY26', qStatus: 'live',
        solution: 'AI deduplicates 2,400 alerts/day → 3 actionable incidents with autonomous self-remediation and full incident audit timeline' },
  25: { quarter: 'Q3 FY26', qStatus: 'live',
        solution: '~60% effort reduction across 2,280 hrs/mo · unified AI monitoring for 5 batch systems with proactive early issue detection' },
  35: { quarter: 'Q3 FY26', qStatus: 'live',
        solution: 'AI detects spend anomalies within hours and forecasts budget trajectory — monthly surprise overages eliminated with real-time alerting' },
  36: { quarter: 'Q3 FY26', qStatus: 'live',
        solution: '~80% reduction in CVE exposure window · automated HIPAA compliance verification and AKS vulnerability remediation at cluster scale' },
  41: { quarter: 'Q3 FY26', qStatus: 'live',
        solution: '2–4 hrs → 10–20 min per problem ticket · CMDB health continuously enriched by AI with missing CIs auto-discovered and corrected' },
  47: { quarter: 'Q3 FY26', qStatus: 'live',
        solution: '480 hrs/mo of manual cluster edits → 30 hrs · AI propagates Helm and component updates across all AKS clusters simultaneously' },

  // ── Q4 FY26 — In-Progress ───────────────────────────────────────────────────
  2:  { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: 'Continuous AI scanning with automated CVE triage — security backlog cleared faster than it accumulates with zero manual handoffs' },
  14: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: 'AI continuously models workload trends and recommends right-sized capacity — 35% cloud over-provisioning eliminated through predictive sizing' },
  16: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: 'AI automates image scanning, patching, and governed rollout across 200+ services — compliance maintained continuously without manual sprint cycles' },
  19: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: 'AI-triaged CVIT backlog with auto-fix capability — 60–70% faster HIPAA CVE clearance, average remediation reduced from 47 to under 15 days' },
  23: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: '60% effort reduction · 15–25% MTTR improvement · AI coordinates war-room, assigns owners, and maintains a full transparent audit trail' },
  26: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: '~60% effort reduction · automated provisioning cutting avg access wait from 5 days to hours with SailPoint and Azure AD integration' },
  28: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: 'AI correlates network signals, identifies root cause, and executes remediation autonomously — 47 min network MTTR reduced to under 10 minutes' },
  32: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: 'AI monitors configuration state continuously and flags drift within minutes — 18-day detection gaps eliminated with automated remediation triggers' },
  37: { quarter: 'Q4 FY26', qStatus: 'in-progress',
        solution: '~60% effort reduction · Compass access requests fulfilled in hours, not the previous 3-day manual multi-step workflow' },

  // ── Q1 FY27 — Planned ───────────────────────────────────────────────────────
  1:  { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI-powered diagnosis resolves Terraform and Ansible incidents autonomously — 4+ hrs of expert debugging reduced to guided resolution in minutes' },
  3:  { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI-orchestrated onboarding validates, provisions, and configures modules automatically — 2-week manual effort compressed to hours with zero rework' },
  10: { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI-assisted Terraform debug resolves state corruption and plan failures in minutes — expert diagnosis bottleneck eliminated from incident workflow' },
  18: { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI-driven QA delivers higher regression coverage and accelerates release cycles — 47% coverage gap closed through automated test generation and analysis' },
  20: { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI orchestrates middleware upgrades with pre/post validation and automated rollback — 6-week change windows compressed to coordinated automated deployments' },
  24: { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI validates changes against CMDB, risk rules, and historical patterns in minutes — 3-day validation bottleneck eliminated without compromising governance' },
  29: { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI diagnoses WLC and device issues remotely and applies standard remediation patterns — on-site engineer dispatches reduced by 60%+' },
  33: { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: 'AI performs security code review in parallel with development — 3-week review backlogs eliminated and vulnerabilities caught at commit time' },
  38: { quarter: 'Q1 FY27', qStatus: 'planned',
        solution: '~65–70% effort reduction · ADO access provisioned automatically within SLA — average 7-day wait compressed to same-day automated completion' },

  // ── Q2 FY27 — Planned ───────────────────────────────────────────────────────
  4:  { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI triages bug reports, generates targeted patches, and opens reviewed PRs automatically — developers stay in flow and ship fixes without context switching' },
  7:  { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI scans IaC patterns and auto-generates optimized rewrites — 23% cloud spend inefficiency eliminated from the moment of provisioning' },
  11: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI auto-classifies test failures by root cause and surfaces only actionable issues — 20% of sprint capacity returned from test-triage to feature delivery' },
  17: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI generates and continuously refreshes architecture documentation from live code and infra state — docs stay accurate without any engineer maintenance effort' },
  21: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'Automated CIS/STIG hardening across 3,000 VMs — consistent, auditable security posture achieved in hours versus a 4-month manual rollout' },
  27: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI assistant handles L1 ops queries via Teams from live KB and runbooks — SREs reclaim 30% of time for high-value engineering and strategic work' },
  30: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI validates, tests, and implements firewall rule changes with automated CAB workflow — 10-day manual cycles compressed to hours with full audit trail' },
  34: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI continuously right-sizes cloud resources using demand forecasts — $2.4M annual over-provisioning waste reclaimed through automated recommendations' },
  39: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: '~65–70% effort reduction · GitHub org access auto-provisioned with full audit trail — 5-day queue wait eliminated through AI-driven approval workflow' },
  43: { quarter: 'Q2 FY27', qStatus: 'planned',
        solution: 'AI orchestrates post-change validation tasks automatically — 8-day manual cycles cut to under 2 days with the 22% rework rate eliminated entirely' },

  // ── Q3 FY27 — Planned ───────────────────────────────────────────────────────
  5:  { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: 'Near-real-time secret detection with automated vault rotation and repo remediation — credential exposure window reduced from days to minutes' },
  8:  { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: 'AI generates standards-compliant configuration templates in minutes — 8 hours of senior engineer effort per template eliminated entirely' },
  12: { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: 'AI detects API handler failures with automated downstream protection — cascading outages prevented and service recovery time drastically reduced' },
  15: { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: 'Conversational AI handles cloud provisioning end-to-end via Teams — L1 self-service eliminates senior engineer interrupt-driven support at scale' },
  31: { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: 'AI handles 400 routine network queries/mo via Teams, escalating only genuine anomalies — network engineers fully freed from L1 interrupt work' },
  40: { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: '~70% effort reduction · Docker Desktop licenses auto-fulfilled with compliance tracking — multi-step finance and IT approval chain fully automated' },
  42: { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: '~60% KB effort reduction · AI-curated knowledge always current — engineers find answers in seconds, not 45 minutes per incident' },
  44: { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: 'AI runs continuous post-change health checks and isolates degradations in real time — 4-hour manual validation windows replaced by instant automated detection' },
  45: { quarter: 'Q3 FY27', qStatus: 'planned',
        solution: 'AI correlates Splunk, Dynatrace, and ServiceNow signals to pinpoint post-change root cause in minutes — 6+ hour investigations resolved automatically' },
}

const Q_STATUS_STYLE = {
  live:          { bg: '#dcfce7', color: '#15803d', dot: '●' },
  'in-progress': { bg: '#dcfce7', color: '#15803d', dot: '●' },
  planned:       { bg: '#dcfce7', color: '#15803d', dot: '○' },
}

// ─── Stat chips ───────────────────────────────────────────────────────────────

const STAT_CHIPS = [
  { label: 'GitHub — Live Repos & PRs',  color: 'bg-humana-green/10 text-humana-green border-humana-green/25' },
  { label: 'Azure — Live Infrastructure', color: 'bg-blue-50 text-blue-700 border-blue-200'                   },
  { label: 'ServiceNow — Live Instance',  color: 'bg-humana-teal/10  text-humana-teal  border-humana-teal/25' },
  { label: 'AI Agents · LangChain Orchestration', color: 'bg-amber-50 text-amber-700 border-amber-200'        },
]

// ─── Tower panels ─────────────────────────────────────────────────────────────

// IT Operations & Infrastructure — grouped (two levels)
function ITOpsTowerPanel({ tower, activeLeaf, onSelect, onHeaderSelect }) {
  const TowerIcon = tower.icon
  const totalUCs = USE_CASES.filter(uc =>
    !HIDDEN_UC_IDS.has(uc.id) &&
    tower.groups.flatMap(g => g.children).some(c => uc.subcategories.includes(c.id))
  ).length

  return (
    <div className="card-humana overflow-hidden flex flex-col">
      <div
        className={`bg-gradient-to-r ${tower.color} px-5 py-4 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={onHeaderSelect}
      >
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
function PlatformTowerPanel({ tower, activeLeaf, onSelect, onHeaderSelect }) {
  const TowerIcon = tower.icon
  const totalUCs = USE_CASES.filter(uc =>
    !HIDDEN_UC_IDS.has(uc.id) &&
    tower.subcategories.some(sc => uc.subcategories.includes(sc.id))
  ).length

  return (
    <div className="card-humana overflow-hidden flex flex-col">
      <div
        className={`bg-gradient-to-r ${tower.color} px-5 py-4 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={onHeaderSelect}
      >
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

// ─── Vertical AAA bar chart ───────────────────────────────────────────────────

function VerticalAAABars({ assist, augment, autonomous }) {
  const rows = [
    { label: 'Assist',     pct: assist,     bg: '#BFDBFE', color: '#1E40AF' },
    { label: 'Augment',    pct: augment,    bg: '#60A5FA', color: '#1E3A8A' },
    { label: 'Autonomous', pct: autonomous, bg: '#1D4ED8', color: '#fff'    },
  ]
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-1.5">
          <div
            className="rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: r.bg, width: 32, height: 16 }}
          >
            <span style={{ fontSize: 9, fontWeight: 800, color: r.color, lineHeight: 1 }}>{r.pct}%</span>
          </div>
          <span style={{ fontSize: 9, color: '#6B7280' }}>{r.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Use-case card ────────────────────────────────────────────────────────────

function UseCaseCard({ uc, index, onSelect }) {
  const aaa  = AAA_DATA[uc.id]
  const meta = UC_META[uc.id]
  const qStyle = meta ? Q_STATUS_STYLE[meta.qStatus] : null
  const savedHrs = uc.beforeHrs - uc.afterHrs
  const savedPct = Math.round((savedHrs / uc.beforeHrs) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onSelect(uc)}
      className={`card-humana flex flex-col hover:shadow-lg transition-shadow cursor-pointer overflow-hidden
        ${uc.live ? 'border border-humana-green/40' : ''}`}
    >
      {/* ── Header: id · title · live badge · quarter ── */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <span className="text-xs font-bold text-gray-300 shrink-0 mt-px">#{uc.id}</span>
          <h3 className="text-sm font-bold text-humana-navy leading-snug">{uc.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
          {meta && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: qStyle.bg, color: qStyle.color, fontSize: 9 }}
            >
              {qStyle.dot} {meta.quarter}
            </span>
          )}
        </div>
      </div>

      {/* ── Category + tools ── */}
      <div className="px-4 pb-2.5 flex items-center gap-1.5 flex-wrap">
        <span className="text-xs bg-humana-navy/10 text-humana-navy px-2 py-0.5 rounded-full font-semibold">{uc.category}</span>
        {uc.tools.slice(0, 2).map(t => (
          <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>
        ))}
        {uc.tools.length > 2 && (
          <span className="text-xs text-gray-400">+{uc.tools.length - 2}</span>
        )}
      </div>

      <div className="border-t border-gray-100 mx-4" />

      {/* ── Challenge ── */}
      <div className="px-4 pt-2.5 pb-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Challenge</div>
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{uc.problem}</p>
      </div>

      {/* ── AI Solution ── */}
      {meta?.solution && (
        <>
          <div className="border-t border-gray-100 mx-4" />
          <div className="px-4 pt-2.5 pb-2">
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#00A651' }}>AI Solution</div>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{meta.solution}</p>
          </div>
        </>
      )}

      <div className="border-t border-gray-100 mx-4" />

      {/* ── Impact: before / savings / after + vertical AAA bars ── */}
      <div className="px-4 pt-2.5 pb-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Impact</div>
        <div className="flex items-end gap-2">

          {/* Before / arrow / After */}
          <div className="flex items-end gap-2 flex-1">
            <div className="flex flex-col items-center bg-gray-50 rounded-lg px-3 py-2 flex-1">
              <span className="text-gray-400 leading-none" style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Before</span>
              <span className="text-base font-black text-gray-600 leading-tight">{uc.beforeHrs.toLocaleString()}</span>
              <span className="text-gray-400 leading-none" style={{ fontSize: 8 }}>hrs/mo</span>
            </div>

            <div className="flex flex-col items-center pb-1">
              <span className="text-sm font-black text-humana-green leading-none">↓{savedPct}%</span>
              <span className="text-gray-400 leading-none mt-0.5" style={{ fontSize: 8 }}>{savedHrs.toLocaleString()} hrs</span>
            </div>

            <div className="flex flex-col items-center rounded-lg px-3 py-2 flex-1" style={{ backgroundColor: 'rgba(0,166,81,0.06)', border: '1px solid rgba(0,166,81,0.18)' }}>
              <span className="leading-none" style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#00A651' }}>After</span>
              <span className="text-base font-black text-humana-navy leading-tight">{uc.afterHrs.toLocaleString()}</span>
              <span className="leading-none" style={{ fontSize: 8, color: '#00A651' }}>hrs/mo</span>
            </div>
          </div>

          {/* Vertical AAA bars */}
          {aaa && (
            <div className="shrink-0">
              <div className="text-gray-400 mb-1" style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Split</div>
              <VerticalAAABars assist={aaa.assist} augment={aaa.augment} autonomous={aaa.autonomous} />
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-auto px-4 pb-3 pt-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-humana-teal font-medium flex items-center gap-1">
          View details <ChevronRight size={10} />
        </span>
        {uc.live && uc.path && (
          <Link
            to={uc.path}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-humana-green font-semibold hover:underline"
          >
            Open Demo <ExternalLink size={10} />
          </Link>
        )}
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeLeaf, setActiveLeaf] = useState(null)
  const [viewerLeaf, setViewerLeaf] = useState(null)
  const [selectedUC, setSelectedUC] = useState(null)
  const [showProgramDetails, setShowProgramDetails] = useState(false)
  const towersRef      = useRef(null)
  const catalogRef     = useRef(null)
  const slideViewerRef = useRef(null)

  const activeLabel = activeLeaf
    ? ALL_LEAVES.find(l => l.id === activeLeaf)?.label
    : null

  const filtered = activeLeaf
    ? USE_CASES.filter(uc => !HIDDEN_UC_IDS.has(uc.id) && uc.subcategories.includes(activeLeaf))
    : USE_CASES.filter(uc => !HIDDEN_UC_IDS.has(uc.id))

  const isViewerHidden = viewerLeaf != null && OBS_NETWORK_IDS.has(viewerLeaf)

  const scrollAfterSelect = (id) => {
    setTimeout(() => {
      const isObsNetwork = OBS_NETWORK_IDS.has(id)
      const el = isObsNetwork ? catalogRef.current : slideViewerRef.current
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 96
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }, 80)
  }

  const handleSelect = (id) => {
    setActiveLeaf(id)
    setViewerLeaf(id)
    if (id) scrollAfterSelect(id)
  }

  const handleHeaderSelect = (id) => {
    setViewerLeaf(id)
    if (id) scrollAfterSelect(id)
  }

  const [escTower, infraOpsTower, obsEaiTower, platformTower, networkTower, autoTower] = TOWERS

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
      <section ref={towersRef} className="px-6 pt-6 pb-2 max-w-6xl mx-auto">

        {/* All Towers — clickable parent label */}
        <button
          onClick={() => setShowProgramDetails(s => !s)}
          className="w-full flex items-center justify-between mb-4 group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-humana-teal" />
            <span className="text-base font-bold text-humana-navy">All Towers</span>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-300 ${showProgramDetails ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Expandable Program Outcomes */}
        <AnimatePresence>
          {showProgramDetails && (
            <motion.div
              key="program-outcomes"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
              className="mb-5"
            >
              {/* TOP_METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {TOP_METRICS.map((m, i) => (
                  <div
                    key={m.label}
                    className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1 relative overflow-hidden"
                    style={{ borderLeft: '4px solid #00A651' }}
                  >
                    <div className="text-2xl font-black text-humana-navy leading-none">
                      {m.value.toLocaleString()}<span className="text-humana-green text-lg ml-0.5">{m.suffix}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-700 mt-1 leading-tight">{m.label}</div>
                    <div className="text-xs text-gray-400">{m.subLabel}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeLeaf && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">
              Filtered by: <span className="font-semibold text-humana-navy">{activeLabel}</span>
            </span>
            <button
              onClick={() => setActiveLeaf(null)}
              className="text-xs text-gray-500 hover:text-humana-navy flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-white transition-colors"
            >
              ✕ Clear filter
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          <ITOpsTowerPanel    tower={escTower}       activeLeaf={activeLeaf} onSelect={handleSelect} onHeaderSelect={() => handleHeaderSelect('incident-response')} />
          <PlatformTowerPanel tower={infraOpsTower}  activeLeaf={activeLeaf} onSelect={handleSelect} onHeaderSelect={() => handleHeaderSelect('enterprise-itsm')} />
          <PlatformTowerPanel tower={obsEaiTower}    activeLeaf={activeLeaf} onSelect={handleSelect} onHeaderSelect={() => handleHeaderSelect('dynatrace')} />
          <PlatformTowerPanel tower={platformTower}  activeLeaf={activeLeaf} onSelect={handleSelect} onHeaderSelect={() => handleHeaderSelect('security-engineering')} />
          <PlatformTowerPanel tower={networkTower}   activeLeaf={activeLeaf} onSelect={handleSelect} onHeaderSelect={() => handleHeaderSelect('network-engineering')} />
          <PlatformTowerPanel tower={autoTower}      activeLeaf={activeLeaf} onSelect={handleSelect} onHeaderSelect={() => handleHeaderSelect('automation-engineering')} />
        </div>
      </section>

      {/* ── Slide viewer — between tower panels and use case catalog ── */}
      {!isViewerHidden && (
        <section ref={slideViewerRef} className="px-6 pb-2 max-w-6xl mx-auto">
          <SlideViewer activeLeaf={viewerLeaf} />
        </section>
      )}

      {/* ── Use Case Catalog ── */}
      <section ref={catalogRef} className="px-6 pt-6 pb-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-humana-navy flex items-center gap-2">
            <Activity size={16} className="text-humana-teal" />
            {activeLabel
              ? <><span>{activeLabel}</span><span className="text-sm text-gray-400 font-normal ml-1">— {filtered.length} use cases</span></>
              : <>Use Case Catalog</>
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
              <UseCaseCard key={uc.id} uc={uc} index={i} onSelect={setSelectedUC} />
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Use Case Detail Drawer ── */}
      <UseCaseDrawer uc={selectedUC} onClose={() => setSelectedUC(null)} />

    </div>
  )
}
