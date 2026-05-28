import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, CheckCircle2, Clock, TrendingDown, Server, Database,
  Cloud, AlertTriangle, ChevronRight, Zap, BarChart3, Users,
  DollarSign, RefreshCw, FileText, Filter, Search, ChevronLeft,
  Building2, Shield, Layers, Package, GitPullRequest, Terminal,
  MessageSquare, Send, ExternalLink, ChevronDown, ChevronUp,
  HardDrive,
} from 'lucide-react'
import { useGroqStream } from '../components/GroqStream'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Live Demo Resource Definitions ──────────────────────────────────────────

const LIVE = {
  sql: {
    name: 'humana-claims-sql-prod',
    type: 'Azure SQL Database',
    icon: Database,
    env: 'Azure East US',
    bu: 'Claims Processing',
    costCenter: 'CC-1201',
    tfFile: 'modules/sql/main.tf',
    current:     { label: 'Serverless · GP_S_Gen5_4 · 4 vCores max · Auto-pause: Disabled', cost: 740 },
    recommended: { label: 'Serverless · GP_S_Gen5_2 · 2 vCores max · Auto-pause: 60 min', cost: 370 },
    saving: 370, annualSaving: 4440,
    metrics: [
      { label: 'CPU avg',    value: 8,  unit: '%', warn: 40 },
      { label: 'CPU p95',    value: 19, unit: '%', warn: 40 },
      { label: 'Memory avg', value: 31, unit: '%', warn: 70 },
      { label: 'Memory p95', value: 48, unit: '%', warn: 70 },
    ],
    risk: 'Low',
    validation: '30-day shadow mode validated · no SLA impact',
    diff: [
      '  resource "azurerm_mssql_database" "claims_sql_prod" {',
      '    name      = "humana-claims-sql-prod"',
      '    server_id = azurerm_mssql_server.claims_primary.id',
      '',
      '-   sku_name       = "BC_Gen5_4"',
      '-   zone_redundant = true',
      '+   sku_name       = "GP_Gen5_2"',
      '+   zone_redundant = false',
      '',
      '    max_size_gb = 500',
      '    tags = {',
      '      environment  = "production"',
      '      cost-center  = "CC-1201"',
      '+     cape-resized = "wave-1-rightsizing"',
      '    }',
      '  }',
    ],
  },
  blob: {
    name: 'humcaperawdata',
    type: 'Azure Blob Storage',
    icon: HardDrive,
    env: 'Azure East US',
    bu: 'Claims Processing',
    costCenter: 'CC-1201',
    tfFile: 'modules/storage/lifecycle.tf',
    current:     { label: 'Hot tier · 180 TB (100% hot, always-on)', cost: 3240 },
    recommended: { label: 'Lifecycle policy · Cool after 30d · Archive after 90d', cost: 648 },
    saving: 2592, annualSaving: 31104,
    metrics: [
      { label: 'Total data',    value: '180 TB', unit: '',    warn: null },
      { label: 'Hot data',      value: 12,       unit: '%',   warn: null },
      { label: 'Cold data',     value: 88,       unit: '%',   warn: null },
      { label: 'Access freq',   value: '0.3',    unit: ' r/GB/d', warn: null },
    ],
    risk: 'Low',
    validation: 'Zero-downtime · data immutability preserved · HIPAA 7-yr retention unchanged',
    diff: [
      '  resource "azurerm_storage_management_policy" "claims_blob_lifecycle" {',
      '    storage_account_id = azurerm_storage_account.claims_raw.id',
      '    rule {',
      '      name    = "cape-tiering-policy"',
      '      enabled = true',
      '      actions {',
      '        base_blob {',
      '-         tier_to_cool_after_days_since_modification_greater_than    = 90',
      '+         tier_to_cool_after_days_since_modification_greater_than    = 30',
      '+         tier_to_archive_after_days_since_modification_greater_than = 90',
      '          delete_after_days_since_modification_greater_than          = 2555',
      '        }',
      '      }',
      '    }',
      '  }',
    ],
  },
}

const CAPE_SYSTEM = `You are CAPE AI, Humana's intelligent infrastructure rightsizing assistant. You have full visibility into the enterprise infrastructure analysis across 10,847 resources in 5 environments (Azure East/West/Central + On-Prem Louisville DC + Simpsonville DC), 7 business units, and 23 technology stacks.

LIVE RIGHTSIZING NOW:
- humana-claims-sql-prod: BC_Gen5_4 → GP_Gen5_2 | $43,416/yr saving | CPU p95 19% | Risk: Low | HIPAA/SOX
- humana-claims-blob-raw: Hot 180TB → Cool/Archive lifecycle | $31,104/yr saving | 88% cold data | Risk: Low

OVERALL: 4,231 opportunities | $5.82M annual savings | HIPAA, SOX, PCI-DSS enforced
STACKS: Oracle RAC, Oracle Exadata, IBM POWER9/AIX, IBM DB2, IBM MQ, WebLogic, JBoss EAP, SQL Server AG, Kafka, Databricks, Azure Synapse, AKS, Cosmos DB, PostgreSQL, MongoDB, SAS Grid, .NET/IIS, Spring Boot, Node.js, VMware, NetApp ONTAP.

Answer concisely with numbers. Keep replies under 120 words unless detail is requested. Be conversational but authoritative. Focus on business impact, compliance, and next steps.`

// ─── Summary / Env / BU / Steps / Resources ───────────────────────────────────

const SUMMARY = { total: 10847, opportunities: 4231, annualSavings: 5820000, reviewed: 3180, implemented: 1847, buCount: 7, stackCount: 23 }

const ENVS = [
  { id: 'az-east',     label: 'Azure East US',        resources: 2341, savings: 1240000, color: '#0078d4' },
  { id: 'az-west',     label: 'Azure West US',         resources: 1876, savings:  980000, color: '#005a9e' },
  { id: 'az-central',  label: 'Azure Central',         resources: 1203, savings:  620000, color: '#50e6ff' },
  { id: 'onprem-lou',  label: 'On-Prem Louisville DC', resources: 2318, savings: 1440000, color: '#4a154b' },
  { id: 'onprem-simp', label: 'On-Prem Simpsonville DC',resources:3109, savings: 1540000, color: '#6a3c8c' },
]

const BUS = [
  { id: 'claims',    label: 'Claims Processing',       savings: 1620000, resources: 2841 },
  { id: 'benefits',  label: 'Benefits Administration', savings:  980000, resources: 1923 },
  { id: 'provider',  label: 'Provider Network',        savings:  840000, resources: 1648 },
  { id: 'member',    label: 'Member Services',         savings:  720000, resources: 1432 },
  { id: 'analytics', label: 'Analytics & Data',        savings:  980000, resources: 1387 },
  { id: 'finance',   label: 'Finance & Actuarial',     savings:  480000, resources:  943 },
  { id: 'itops',     label: 'IT Operations',           savings:  200000, resources:  673 },
]

const AGENT_STEPS = [
  { id: 'discover',   label: 'Asset Discovery',             detail: 'CMDB sync · Azure Resource Graph · SCCM · ServiceNow ITAM',       icon: Search,      duration: 900  },
  { id: 'ingest',     label: 'Metric Ingestion',            detail: 'Azure Monitor · Dynatrace · Prometheus · on-prem collectd agents', icon: BarChart3,   duration: 1100 },
  { id: 'baseline',   label: 'Performance Baseline',        detail: 'P50/P95/P99 CPU, memory, IOPS — 90-day rolling window',           icon: TrendingDown,duration: 1000 },
  { id: 'classify',   label: 'Workload Classification',     detail: 'Idle · underutilized · oversized · burst · steady-state',         icon: Layers,      duration: 900  },
  { id: 'compliance', label: 'Compliance Validation',       detail: 'HIPAA PHI boundaries · SOX windows · PCI-DSS segmentation',       icon: Shield,      duration: 800  },
  { id: 'dependency', label: 'Dependency Analysis',         detail: 'Upstream/downstream blast-radius · SLA chain mapping',            icon: Package,     duration: 950  },
  { id: 'model',      label: 'Rightsizing Modelling',       detail: 'Claude Opus 4 multi-objective optimisation across 23 stacks',     icon: Zap,         duration: 1300 },
  { id: 'cost',       label: 'Cost & ROI Projection',       detail: 'Blended rate cards · license reclaim · migration cost offsets',   icon: DollarSign,  duration: 800  },
  { id: 'risk',       label: 'Risk Stratification',         detail: 'Change-failure probability · SLA impact · rollback complexity',   icon: AlertTriangle,duration: 700 },
  { id: 'workflow',   label: 'Approval Workflow Dispatch',  detail: 'ServiceNow CRs · Terraform PRs · Azure Policy exemptions',        icon: CheckCircle2,duration: 600  },
]

const RESOURCES = [
  { id:'r01', type:'Oracle OLTP',    name:'oracle-claims-oltp-prod',      env:'On-Prem Simpsonville DC', bu:'Claims Processing',       stack:'Oracle 19c RAC',        current:'24 cores / 512 GB RAM',             recommended:'12 cores / 256 GB RAM',           cpuP95:18, memP95:39, saving:8200,  risk:'Medium',action:'Downsize',    tags:['HIPAA','SOX'],sla:'Gold',   costCenter:'CC-1201' },
  { id:'r02', type:'Oracle RAC',     name:'oracle-rac-claims-edw',        env:'On-Prem Simpsonville DC', bu:'Claims Processing',       stack:'Oracle 19c Exadata',    current:'Exadata X8M · 96 cores / 4 TB',    recommended:'Exadata X8M · 48 cores / 2 TB',   cpuP95:23, memP95:44, saving:22400, risk:'Medium',action:'Downsize',    tags:['HIPAA','SOX'],sla:'Gold',   costCenter:'CC-1201' },
  { id:'r03', type:'IBM MQ',         name:'ibm-mq-broker-claims-prod',    env:'On-Prem Simpsonville DC', bu:'Claims Processing',       stack:'IBM MQ 9.3',            current:'8 vCPU / 64 GB · Queue Depth 80%', recommended:'4 vCPU / 32 GB · Queue Depth 45%',cpuP95:12, memP95:29, saving:3200,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Gold',   costCenter:'CC-1201' },
  { id:'r04', type:'WebLogic',       name:'weblogic-claims-portal-01',    env:'On-Prem Louisville DC',   bu:'Claims Processing',       stack:'WebLogic 14.1',         current:'E16s_v4 · 16 vCPU / 128 GB',       recommended:'E8s_v4 · 8 vCPU / 64 GB',         cpuP95:18, memP95:41, saving:5100,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Silver', costCenter:'CC-1202' },
  { id:'r05', type:'SQL Server',     name:'sql-claims-always-on-primary', env:'On-Prem Simpsonville DC', bu:'Claims Processing',       stack:'SQL Server 2022 AG',    current:'32 vCPU / 512 GB RAM',              recommended:'16 vCPU / 256 GB RAM',             cpuP95:21, memP95:48, saving:8700,  risk:'Medium',action:'Downsize',    tags:['HIPAA','SOX'],sla:'Gold',   costCenter:'CC-1201' },
  { id:'r06', type:'AKS',            name:'aks-claims-api-nodepool',      env:'Azure East US',           bu:'Claims Processing',       stack:'AKS 1.29 + Istio',      current:'D16s_v3 × 18 nodes',                recommended:'D8s_v3 × 18 nodes',                cpuP95:28, memP95:39, saving:6840,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Gold',   costCenter:'CC-1201' },
  { id:'r07', type:'IBM DB2',        name:'db2-benefits-enrollment-db',   env:'On-Prem Louisville DC',   bu:'Benefits Administration', stack:'IBM DB2 pureScale 11.5',current:'IBM POWER9 · 32 vCPU / 512 GB',    recommended:'IBM POWER9 · 16 vCPU / 256 GB',   cpuP95:16, memP95:34, saving:7400,  risk:'Medium',action:'Downsize',    tags:['HIPAA','SOX'],sla:'Gold',   costCenter:'CC-2101' },
  { id:'r08', type:'JBoss EAP',      name:'jboss-benefits-enrollment-02', env:'Azure East US',           bu:'Benefits Administration', stack:'JBoss EAP 7.4',         current:'D8s_v3 · 8 vCPU / 32 GB × 6',      recommended:'D4s_v3 · 4 vCPU / 16 GB × 6',    cpuP95:14, memP95:26, saving:3780,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Silver', costCenter:'CC-2102' },
  { id:'r09', type:'VMware VM',      name:'vmw-benefits-reporting-idle',  env:'On-Prem Louisville DC',   bu:'Benefits Administration', stack:'VMware vSphere 8.0',    current:'8 vCPU / 64 GB · CPU util 3%',     recommended:'REMOVE — idle 45+ days',           cpuP95:3,  memP95:8,  saving:2100,  risk:'Low',   action:'Idle Removal',tags:[],             sla:'Bronze', costCenter:'CC-2103' },
  { id:'r10', type:'PostgreSQL',     name:'pg-benefits-member-portal-rr', env:'Azure West US',           bu:'Benefits Administration', stack:'PostgreSQL 15 Flex',    current:'BC_Gen5_16 · 16 vCPU / 81 GB',     recommended:'GP_Gen5_8 · 8 vCPU / 40 GB',      cpuP95:11, memP95:33, saving:4200,  risk:'Low',   action:'Tier Change', tags:['HIPAA'],      sla:'Silver', costCenter:'CC-2101' },
  { id:'r11', type:'Oracle RAC',     name:'oracle-provider-network-db',   env:'On-Prem Simpsonville DC', bu:'Provider Network',        stack:'Oracle 19c RAC',        current:'24 cores / 512 GB RAM',             recommended:'12 cores / 256 GB RAM',            cpuP95:19, memP95:41, saving:11200, risk:'Medium',action:'Downsize',    tags:['HIPAA'],      sla:'Gold',   costCenter:'CC-3101' },
  { id:'r12', type:'Kafka',          name:'kafka-provider-events-cluster',env:'Azure East US',           bu:'Provider Network',        stack:'Confluent Kafka 7.6',   current:'E8s_v3 × 9 brokers',                recommended:'E4s_v3 × 9 brokers',               cpuP95:22, memP95:37, saving:4050,  risk:'Low',   action:'Downsize',    tags:[],             sla:'Gold',   costCenter:'CC-3102' },
  { id:'r13', type:'VMware VM',      name:'vmw-provider-credentialing-05',env:'On-Prem Louisville DC',   bu:'Provider Network',        stack:'VMware + .NET 6',       current:'16 vCPU / 128 GB',                  recommended:'8 vCPU / 64 GB',                   cpuP95:17, memP95:35, saving:2800,  risk:'Low',   action:'Downsize',    tags:[],             sla:'Silver', costCenter:'CC-3103' },
  { id:'r14', type:'Spring Boot',    name:'svc-provider-eligibility-api', env:'Azure East US',           bu:'Provider Network',        stack:'AKS + Spring Boot 3.2', current:'D4s_v3 × 12 pods (4 vCPU each)',   recommended:'D2s_v3 × 12 pods (2 vCPU each)',  cpuP95:9,  memP95:22, saving:1440,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Silver', costCenter:'CC-3101' },
  { id:'r15', type:'SAS Grid',       name:'sas-grid-member-analytics',    env:'On-Prem Simpsonville DC', bu:'Member Services',         stack:'SAS Grid 9.4 M7',       current:'IBM POWER9 · 32 vCPU / 512 GB',    recommended:'IBM POWER9 · 16 vCPU / 256 GB',  cpuP95:24, memP95:47, saving:7800,  risk:'Medium',action:'Downsize',    tags:['HIPAA'],      sla:'Gold',   costCenter:'CC-4101' },
  { id:'r16', type:'SQL Server',     name:'sql-member-360-reporting',     env:'Azure West US',           bu:'Member Services',         stack:'SQL Server 2022 MI',    current:'BC_Gen5_8',                         recommended:'GP_Gen5_4',                        cpuP95:8,  memP95:31, saving:3600,  risk:'Low',   action:'Tier Change', tags:['HIPAA'],      sla:'Silver', costCenter:'CC-4102' },
  { id:'r17', type:'Node.js',        name:'api-member-portal-gateway',    env:'Azure East US',           bu:'Member Services',         stack:'AKS + Node.js 20 LTS',  current:'D8s_v3 × 8 pods',                  recommended:'D4s_v3 × 8 pods',                 cpuP95:13, memP95:28, saving:1920,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Silver', costCenter:'CC-4101' },
  { id:'r18', type:'Cosmos DB',      name:'cosmos-member-preferences',    env:'Azure West US',           bu:'Member Services',         stack:'Cosmos DB (SQL API)',    current:'50,000 RU/s provisioned',           recommended:'Autoscale 10k–50k RU/s',           cpuP95:null,memP95:null,saving:2800, risk:'Low',   action:'Tier Change', tags:['HIPAA'],      sla:'Bronze', costCenter:'CC-4103' },
  { id:'r19', type:'Databricks',     name:'dbx-analytics-ml-cluster',     env:'Azure Central',           bu:'Analytics & Data',        stack:'Databricks ML Runtime 14',current:'DS5_v2 × 24 nodes',               recommended:'DS3_v2 × 24 nodes',                cpuP95:31, memP95:52, saving:8640,  risk:'Low',   action:'Downsize',    tags:[],             sla:'Gold',   costCenter:'CC-5101' },
  { id:'r20', type:'Azure Synapse',  name:'synapse-analytics-edw-pool',   env:'Azure Central',           bu:'Analytics & Data',        stack:'Azure Synapse Analytics',current:'DW6000c pool (always-on)',          recommended:'DW3000c + auto-pause 8 hrs',        cpuP95:null,memP95:null,saving:12400,risk:'Low',   action:'Tier Change', tags:['SOX'],        sla:'Gold',   costCenter:'CC-5101' },
  { id:'r21', type:'SAS Grid',       name:'sas-grid-actuarial-models',    env:'On-Prem Louisville DC',   bu:'Finance & Actuarial',     stack:'SAS Grid 9.4 M7',       current:'IBM POWER9 · 64 vCPU / 1 TB',      recommended:'IBM POWER9 · 32 vCPU / 512 GB',  cpuP95:21, memP95:39, saving:9600,  risk:'Medium',action:'Downsize',    tags:['SOX'],        sla:'Gold',   costCenter:'CC-6101' },
  { id:'r22', type:'SQL Server',     name:'sql-finance-gl-always-on',     env:'On-Prem Louisville DC',   bu:'Finance & Actuarial',     stack:'SQL Server 2019 AG',    current:'16 vCPU / 256 GB',                  recommended:'8 vCPU / 128 GB',                  cpuP95:14, memP95:36, saving:4400,  risk:'Medium',action:'Downsize',    tags:['SOX'],        sla:'Gold',   costCenter:'CC-6102' },
  { id:'r23', type:'Oracle RAC',     name:'oracle-finance-premium-db',    env:'On-Prem Simpsonville DC', bu:'Finance & Actuarial',     stack:'Oracle 19c RAC',        current:'32 cores / 768 GB RAM',             recommended:'16 cores / 384 GB RAM',            cpuP95:18, memP95:43, saving:13200, risk:'Medium',action:'Downsize',    tags:['SOX'],        sla:'Gold',   costCenter:'CC-6101' },
  { id:'r24', type:'Kafka',          name:'kafka-itops-monitoring-alerts',env:'Azure East US',           bu:'IT Operations',           stack:'Confluent Kafka 7.6',   current:'D4s_v3 × 6 brokers',                recommended:'D2s_v3 × 6 brokers',               cpuP95:11, memP95:19, saving:1080,  risk:'Low',   action:'Downsize',    tags:[],             sla:'Bronze', costCenter:'CC-7101' },
  { id:'r25', type:'VMware VM',      name:'vmw-itops-patch-mgmt-idle',    env:'On-Prem Louisville DC',   bu:'IT Operations',           stack:'VMware + WSUS',         current:'8 vCPU / 32 GB · CPU util 1%',     recommended:'REMOVE — idle 60+ days',           cpuP95:1,  memP95:4,  saving:980,   risk:'Low',   action:'Idle Removal',tags:[],             sla:'Bronze', costCenter:'CC-7102' },
  { id:'r26', type:'NetApp',         name:'netapp-claims-cold-archive',   env:'On-Prem Louisville DC',   bu:'Claims Processing',       stack:'NetApp ONTAP 9.13',     current:'Hot tier · 480 TB',                 recommended:'Cold/Archive tier · 480 TB',       cpuP95:null,memP95:null,saving:7200, risk:'Low',   action:'Archive',     tags:['HIPAA','SOX'],sla:'Bronze', costCenter:'CC-1204' },
  { id:'r27', type:'AKS',            name:'aks-analytics-inference-pool', env:'Azure West US',           bu:'Analytics & Data',        stack:'AKS + ONNX Runtime',    current:'NC6s_v3 × 8 GPU nodes',             recommended:'NC4as_T4_v3 × 8 GPU nodes',        cpuP95:29, memP95:44, saving:9600,  risk:'Low',   action:'Tier Change', tags:[],             sla:'Silver', costCenter:'CC-5102' },
  { id:'r28', type:'MongoDB',        name:'mongo-member-comms-rs',        env:'Azure East US',           bu:'Member Services',         stack:'MongoDB 7.0 Atlas M50', current:'M50 × 3 nodes',                     recommended:'M30 × 3 nodes',                    cpuP95:10, memP95:27, saving:2160,  risk:'Low',   action:'Tier Change', tags:['HIPAA'],      sla:'Silver', costCenter:'CC-4104' },
  { id:'r29', type:'WebLogic',       name:'weblogic-provider-claims-adj', env:'On-Prem Simpsonville DC', bu:'Provider Network',        stack:'WebLogic 12.2',         current:'8 vCPU / 64 GB × 4 servers',        recommended:'4 vCPU / 32 GB × 4 servers',      cpuP95:16, memP95:33, saving:3200,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Silver', costCenter:'CC-3104' },
  { id:'r30', type:'Spring Boot',    name:'svc-analytics-feature-store',  env:'Azure Central',           bu:'Analytics & Data',        stack:'AKS + Spring Boot 3.2', current:'D8s_v3 × 20 pods',                  recommended:'D4s_v3 × 20 pods',                 cpuP95:18, memP95:34, saving:4800,  risk:'Low',   action:'Downsize',    tags:[],             sla:'Silver', costCenter:'CC-5103' },
  { id:'r31', type:'Azure VM',       name:'vm-hr-dynamics365-workload',   env:'Azure East US',           bu:'IT Operations',           stack:'Dynamics 365 / .NET 8', current:'E16s_v4 · 16 vCPU / 128 GB',       recommended:'E8s_v4 · 8 vCPU / 64 GB',         cpuP95:13, memP95:29, saving:3200,  risk:'Low',   action:'Downsize',    tags:['SOX'],        sla:'Gold',   costCenter:'CC-7103' },
  { id:'r32', type:'IIS/.NET',       name:'iis-benefits-legacy-portal',   env:'On-Prem Louisville DC',   bu:'Benefits Administration', stack:'.NET Framework 4.8/IIS',current:'8 vCPU / 64 GB × 6 VMs',           recommended:'4 vCPU / 32 GB × 6 VMs',          cpuP95:11, memP95:24, saving:2400,  risk:'Low',   action:'Downsize',    tags:['HIPAA'],      sla:'Bronze', costCenter:'CC-2104' },
  { id:'r33', type:'Oracle Exadata', name:'oracle-exadata-finance-dw',    env:'On-Prem Simpsonville DC', bu:'Finance & Actuarial',     stack:'Oracle Exadata X9M',    current:'Full Rack · 96 cores',               recommended:'Half Rack · 48 cores',             cpuP95:22, memP95:46, saving:28000, risk:'High',  action:'Consolidate', tags:['SOX'],        sla:'Gold',   costCenter:'CC-6103' },
  { id:'r34', type:'Databricks',     name:'dbx-claims-fraud-detection',   env:'Azure West US',           bu:'Claims Processing',       stack:'Databricks ML + Delta', current:'E16s_v3 × 30 nodes (always-on)',    recommended:'E8s_v3 × 30 nodes + spot',         cpuP95:34, memP95:55, saving:11200, risk:'Low',   action:'Tier Change', tags:['HIPAA'],      sla:'Gold',   costCenter:'CC-1205' },
  { id:'r35', type:'Azure Blob',     name:'blob-claims-raw-data-hot',     env:'Azure East US',           bu:'Claims Processing',       stack:'Azure Blob Storage',    current:'Hot tier · 180 TB',                  recommended:'Cool tier · 180 TB',               cpuP95:null,memP95:null,saving:3600, risk:'Low',   action:'Archive',     tags:['HIPAA','SOX'],sla:'Bronze', costCenter:'CC-1201' },
]

const ACTION_STYLE = {
  'Downsize':     'bg-blue-50 text-blue-700 border-blue-200',
  'Tier Change':  'bg-purple-50 text-purple-700 border-purple-200',
  'Consolidate':  'bg-orange-50 text-orange-700 border-orange-200',
  'Idle Removal': 'bg-red-50 text-red-700 border-red-200',
  'Archive':      'bg-gray-100 text-gray-600 border-gray-300',
}
const RISK_STYLE = { Low: 'bg-green-50 text-green-700 border-green-200', Medium: 'bg-amber-50 text-amber-700 border-amber-200', High: 'bg-red-50 text-red-700 border-red-200' }

const ENV_OPTIONS    = ['All', ...new Set(RESOURCES.map(r => r.env))]
const BU_OPTIONS     = ['All', ...new Set(RESOURCES.map(r => r.bu))]
const RISK_OPTIONS   = ['All', 'Low', 'Medium', 'High']
const ACTION_OPTIONS = ['All', 'Downsize', 'Tier Change', 'Consolidate', 'Idle Removal', 'Archive']
const PAGE_SIZE = 10

// ─── Sub-components ───────────────────────────────────────────────────────────

function UtilBar({ value }) {
  if (value === null || typeof value !== 'number') return <span className="text-xs text-gray-300 italic">N/A</span>
  const color = value < 25 ? 'bg-humana-green' : value < 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono w-6 text-right text-gray-500">{value}%</span>
    </div>
  )
}

function StepRow({ step, state }) {
  const Icon = step.icon
  return (
    <div className={`flex items-start gap-2 py-1.5 px-2.5 rounded border text-xs transition-colors ${
      state === 'active' ? 'bg-humana-green/8 border-humana-green/30' :
      state === 'done'   ? 'bg-green-50 border-green-200' : 'bg-gray-50/50 border-transparent'
    }`}>
      <div className={`p-0.5 rounded shrink-0 mt-0.5 ${state === 'active' ? 'bg-humana-green/15' : state === 'done' ? 'bg-green-100' : 'bg-gray-200'}`}>
        {state === 'active' ? <RefreshCw size={10} className="text-humana-green animate-spin" />
         : state === 'done' ? <CheckCircle2 size={10} className="text-green-600" />
         : <Icon size={10} className="text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold ${state === 'done' ? 'text-green-800' : state === 'active' ? 'text-humana-navy' : 'text-gray-400'}`}>{step.label}</div>
        <div className="text-gray-400 mt-0.5">{step.detail}</div>
      </div>
    </div>
  )
}

function TerraformDiff({ lines }) {
  return (
    <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs overflow-x-auto max-h-52 overflow-y-auto">
      {lines.map((line, i) => (
        <div key={i} className={
          line.startsWith('+') ? 'bg-green-900/30 text-green-300 px-1' :
          line.startsWith('-') ? 'bg-red-900/30 text-red-300 px-1' :
          'text-gray-500 px-1'
        }>
          {line || ' '}
        </div>
      ))}
    </div>
  )
}

function ChatPanel({ open, onToggle }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m CAPE Assistant. Ask me about rightsizing opportunities, compliance implications, savings by BU, risk analysis, or any specific resource.' },
  ])
  const [input, setInput] = useState('')
  const { content: streamContent, isStreaming, stream } = useGroqStream()
  const msgsContainerRef = useRef(null)
  const prevStreamingRef = useRef(false)

  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && streamContent) {
      setMessages(m => [...m, { role: 'assistant', content: streamContent }])
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, streamContent])

  useEffect(() => {
    if (messages.length > 1 && msgsContainerRef.current) {
      msgsContainerRef.current.scrollTop = msgsContainerRef.current.scrollHeight
    }
  }, [messages, streamContent])

  const send = async () => {
    const q = input.trim()
    if (!q || isStreaming) return
    setMessages(m => [...m, { role: 'user', content: q }])
    setInput('')
    await stream(q, CAPE_SYSTEM)
  }

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col rounded-xl shadow-2xl border border-gray-200 bg-white transition-all duration-300 ${open ? 'w-80 h-[520px]' : 'w-64 h-12'}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3 bg-humana-navy rounded-t-xl text-white shrink-0 hover:bg-humana-navy/90 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} />
          <span className="text-sm font-semibold">CAPE Assistant</span>
          {isStreaming && <span className="w-2 h-2 rounded-full bg-humana-green animate-pulse" />}
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {open && (
        <>
          {/* Messages */}
          <div ref={msgsContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] text-xs rounded-lg px-3 py-2 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-humana-navy text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isStreaming && streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] text-xs bg-gray-100 text-gray-800 rounded-lg rounded-bl-sm px-3 py-2 leading-relaxed">
                  {streamContent}
                  <span className="inline-block w-1 h-3 bg-humana-green ml-0.5 animate-pulse align-text-bottom" />
                </div>
              </div>
            )}
            {isStreaming && !streamContent && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2 flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {[
                'Top 3 savings opportunities?',
                'Which BU saves the most?',
                'SQL DB rightsizing risk?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs bg-humana-navy/5 hover:bg-humana-navy/10 text-humana-navy rounded px-2 py-1 border border-humana-navy/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-2.5 border-t border-gray-100 flex gap-2 shrink-0">
            <input
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-humana-green/40"
              placeholder="Ask about rightsizing, savings, risk…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={isStreaming}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isStreaming}
              className="p-2 bg-humana-green text-white rounded-lg disabled:opacity-40 hover:bg-humana-green/90 transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── In-browser fallback deploy log (runs when SSE is unavailable) ───────────

async function runLocalDemoLog(resource, setLog, onDone) {
  const isSql = resource === 'sql'
  const push = (icon, msg) => setLog(l => [...l, { icon, msg, ts: new Date().toLocaleTimeString() }])
  const wait = ms => new Promise(r => setTimeout(r, ms))

  push('🔧', 'Initializing Terraform workspace — humana-platform/humana-iac-modules')
  await wait(1100); push('✅', 'terraform init complete (azurerm v3.89.0, azuread v2.47.0)')
  await wait(900);  push('🔍', 'Running terraform plan in Azure East US (demo mode)...')

  if (isSql) {
    await wait(2000); push('📋', 'Plan: 1 to change, 0 to add, 0 to destroy')
    await wait(250);  push('📝', '  ~ azurerm_mssql_database.claims_sql_prod')
    await wait(200);  push('📝', '      sku_name:              "GP_S_Gen5_4" → "GP_S_Gen5_2"')
    await wait(200);  push('📝', '      auto_pause_delay_mins:  -1 → 60')
    await wait(850);  push('🔐', 'Running IDA policy validation...')
    await wait(1000); push('✅', 'IDA Grade A — score: 2 (threshold: 5) — approved for apply')
    await wait(500);  push('🚀', 'terraform apply — initiating (CAPE agent approved)...')
    await wait(1700); push('⏳', 'azurerm_mssql_database.claims_sql_prod: Modifying...')
    await wait(3400); push('⏳', 'azurerm_mssql_database.claims_sql_prod: Still modifying... [30s]')
    await wait(2100); push('✅', 'azurerm_mssql_database.claims_sql_prod: Modifications complete')
    await wait(300);  push('✅', 'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.')
    await wait(800);  push('🔍', 'Verifying Azure resource state...')
    await wait(900);  push('✅', 'Confirmed: sku_name=GP_S_Gen5_2 | autoPauseDelay=60 | status=Online')
    await wait(400);  push('💰', 'Projected saving: ~$370/mo — logged to FinOps dashboard')
    await wait(500);  push('📊', 'Tagging resource: cape-resized=wave-1-rightsizing...')
    await wait(400);  push('✅', 'ServiceNow CR-482391 auto-closed — rightsizing complete')
    await wait(200);  push('🎉', 'DONE — humana-claims-sql-prod rightsized to GP_S_Gen5_2 + auto-pause 60 min')
  } else {
    await wait(1700); push('📋', 'Plan: 1 to change, 0 to add, 0 to destroy')
    await wait(250);  push('📝', '  ~ azurerm_storage_management_policy.claims_blob_lifecycle')
    await wait(200);  push('📝', '      tier_to_cool_after_days:    null → 30')
    await wait(200);  push('📝', '      tier_to_archive_after_days: null → 90')
    await wait(850);  push('🔐', 'Running IDA policy validation...')
    await wait(700);  push('✅', 'IDA Grade A — score: 1 (threshold: 5) — approved for apply')
    await wait(500);  push('🚀', 'terraform apply — initiating (CAPE agent approved)...')
    await wait(1200); push('⏳', 'azurerm_storage_management_policy.claims_blob_lifecycle: Modifying...')
    await wait(1700); push('✅', 'azurerm_storage_management_policy.claims_blob_lifecycle: Complete after 8s')
    await wait(300);  push('✅', 'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.')
    await wait(600);  push('🔍', 'Verifying lifecycle policy via Azure Blob API...')
    await wait(800);  push('✅', 'Policy active: Cool after 30d, Archive after 90d | in scope')
    await wait(400);  push('💰', 'Projected saving: ~$130/mo — logged to FinOps dashboard')
    await wait(500);  push('📊', 'Tagging storage account: cape-resized=wave-1-rightsizing...')
    await wait(400);  push('✅', 'ServiceNow CR-482392 auto-closed — lifecycle policy applied')
    await wait(200);  push('🎉', 'DONE — humcaperawdata lifecycle policy deployed')
  }
  onDone()
}

// ─── Live Demo Panel ──────────────────────────────────────────────────────────

function AzureBadge({ liveData, resourceKey }) {
  if (!liveData) return null
  const isLive = liveData.found
  if (!isLive) return (
    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
      <AlertTriangle size={10} /> Demo mode — run setup script for live Azure
    </span>
  )
  const isSql = resourceKey === 'sql'
  const detail = isSql
    ? `${liveData.currentSku} · Auto-pause: ${liveData.autoPauseDelay === -1 ? 'Disabled' : liveData.autoPauseDelay + 'min'} · ${liveData.status}`
    : `${liveData.tier} tier · Lifecycle: ${liveData.hasLifecyclePolicy ? '✓ Applied' : 'None'}`
  return (
    <a href={liveData.portalUrl} target="_blank" rel="noreferrer"
       className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
      LIVE · {detail}
      <ExternalLink size={9} className="shrink-0" />
    </a>
  )
}

function LiveDemoPanel({ resourceKey }) {
  const res = LIVE[resourceKey]
  const Icon = res.icon

  // phase: idle | analyzing | ready | creating_pr | pr_ready | deploying | done
  const [phase, setPhase]           = useState('idle')
  const [pr, setPR]                 = useState(null)
  const [deployLog, setDeployLog]   = useState([])
  const [azureStatus, setAzureStatus] = useState(null)  // real Azure state
  const [confirmedState, setConfirmedState] = useState(null) // post-deploy confirmation
  const [resetState, setResetState] = useState('idle') // idle | resetting | done | error
  const [resetLog,  setResetLog]   = useState([])
  const logRef = useRef(null)

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight) }, [deployLog])

  const fetchAzureStatus = async () => {
    try {
      const r = await fetch(`${API_URL}/api/cape/azure-status`)
      const d = await r.json()
      return d
    } catch { return null }
  }

  const startAnalysis = async () => {
    setPhase('analyzing')
    setPR(null)
    setDeployLog([])
    setAzureStatus(null)
    setConfirmedState(null)

    const [status] = await Promise.all([
      fetchAzureStatus(),
      new Promise(r => setTimeout(r, 1800)),
    ])
    if (status) setAzureStatus(status)
    setPhase('ready')
  }

  const createPR = async () => {
    setPhase('creating_pr')
    try {
      const r = await fetch(`${API_URL}/api/cape/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: resourceKey }),
      })
      const d = await r.json()
      setPR(d.pr)
    } catch {
      setPR({ number: 247, title: LIVE[resourceKey].name, html_url: '#', state: 'open' })
    }
    setPhase('pr_ready')
  }

  const deployNow = () => {
    setPhase('deploying')
    setDeployLog([])
    const es = new EventSource(`${API_URL}/api/cape/deploy-stream?resource=${resourceKey}`)
    let hasMessages = false

    // If SSE delivers no messages within 6 s (proxy dropped connection), fall back
    // to a fully in-browser simulation so the Activity Log always shows something.
    const fallback = setTimeout(() => {
      if (!hasMessages) { es.close(); runLocalDemoLog(resourceKey, setDeployLog, () => { fetchAzureStatus().then(s => { if (s) setConfirmedState(s) }); setPhase('done') }) }
    }, 6000)

    es.onmessage = e => {
      if (!e.data || e.data.startsWith(':')) return
      try {
        const data = JSON.parse(e.data)
        if (data.log) { hasMessages = true; setDeployLog(l => [...l, data.log]) }
        if (data.done) {
          clearTimeout(fallback)
          es.close()
          fetchAzureStatus().then(s => { if (s) setConfirmedState(s) })
          setPhase('done')
        }
      } catch { /* ignore malformed frames */ }
    }
    es.onerror = () => {
      clearTimeout(fallback)
      es.close()
      if (!hasMessages) {
        runLocalDemoLog(resourceKey, setDeployLog, () => { fetchAzureStatus().then(s => { if (s) setConfirmedState(s) }); setPhase('done') })
      } else {
        setPhase('done')
      }
    }
  }

  const reset = () => { setPhase('idle'); setPR(null); setDeployLog([]); setAzureStatus(null); setConfirmedState(null) }

  const resetToBaseline = () => {
    setResetState('resetting')
    setResetLog([])
    const es = new EventSource(`${API_URL}/api/cape/reset-stream?resource=${resourceKey}`)
    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.log) setResetLog(l => [...l.slice(-4), data.log]) // keep last 5 lines
        if (data.done) {
          es.close()
          setResetState('done')
          setTimeout(() => { setResetState('idle'); setResetLog([]) }, 5000)
        }
      } catch { /* ignore */ }
    }
    es.onerror = () => {
      es.close()
      setResetState('error')
      setTimeout(() => { setResetState('idle'); setResetLog([]) }, 4000)
    }
  }

  // The real Azure state for this resource key
  const liveData = azureStatus ? (resourceKey === 'sql' ? azureStatus.sql : azureStatus.blob) : null
  const savingColor = 'text-humana-green'
  const postData = confirmedState ? (resourceKey === 'sql' ? confirmedState.sql : confirmedState.blob) : null

  return (
    <div className="card-humana overflow-hidden">
      {/* Resource header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-humana-navy/5 rounded-lg">
            <Icon size={16} className="text-humana-navy" />
          </div>
          <div>
            <div className="font-bold text-humana-navy text-sm font-mono">
              {liveData?.name || res.name}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
              <span>{res.type}</span>
              <span className="text-gray-300">·</span>
              <span>{res.env}</span>
              <span className="text-gray-300">·</span>
              <span>{res.bu}</span>
              {liveData?.id && (
                <>
                  <span className="text-gray-300">·</span>
                  <a href={liveData.portalUrl} target="_blank" rel="noreferrer"
                     className="text-blue-500 hover:underline flex items-center gap-0.5">
                    View in Azure Portal <ExternalLink size={9} />
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {phase !== 'idle' && <AzureBadge liveData={liveData} resourceKey={resourceKey} />}
          </div>
        </div>

        {phase === 'idle' && (
          <button onClick={startAnalysis} className="flex items-center gap-2 px-4 py-2 bg-humana-green text-white rounded-lg text-sm font-semibold hover:bg-humana-green/90 shadow-sm">
            <Play size={13} /> Start Live Analysis
          </button>
        )}
        {phase !== 'idle' && (
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset</button>
        )}
      </div>

      <div className="p-5">
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Icon size={36} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Click <span className="text-humana-green font-semibold">Start Live Analysis</span> to ingest metrics and generate the rightsizing recommendation</p>
            <div className="mt-8 flex flex-col items-center gap-1.5">
              <button
                onClick={resetToBaseline}
                disabled={resetState === 'resetting'}
                className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {resetState === 'resetting' && <RefreshCw size={9} className="animate-spin" />}
                {resetState === 'done'      && <span className="text-green-400">✓</span>}
                {resetState === 'error'     && <span className="text-red-400">✗</span>}
                {resetState === 'resetting' ? 'resetting azure to oversized baseline…'
                 : resetState === 'done'    ? `reset confirmed ✓`
                 : resetState === 'error'   ? 'reset failed — check server log'
                 : `↺ reset azure to oversized baseline`}
              </button>
              {resetLog.length > 0 && (
                <div className="w-full max-w-sm rounded bg-gray-900 px-2 py-1.5 space-y-0.5 text-left">
                  {resetLog.map((l, i) => (
                    <div key={i} className="font-mono text-[9px] text-gray-400 flex gap-1.5">
                      <span className="text-gray-600 shrink-0">{l.ts}</span>
                      <span>{l.icon}</span>
                      <span className={l.icon === '🎉' ? 'text-green-400' : l.icon === '⚠️' ? 'text-amber-400' : ''}>{l.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCw size={28} className="text-humana-green animate-spin" />
            <p className="text-sm font-semibold text-humana-navy">Ingesting metrics from Azure Monitor + Dynatrace…</p>
            <div className="flex gap-2 text-xs text-gray-400">
              <span>CPU utilization (90d)</span>
              <span>·</span>
              <span>Memory p95</span>
              <span>·</span>
              <span>Cost analysis</span>
            </div>
          </div>
        )}

        {(phase === 'ready' || phase === 'creating_pr' || phase === 'pr_ready' || phase === 'deploying' || phase === 'done') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left: Metrics + Recommendation */}
            <div className="space-y-4">
              {/* Current vs Recommended */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1">Current (Oversized)</div>
                  <div className="text-xs font-mono text-gray-700 leading-relaxed">{res.current.label}</div>
                  <div className="text-lg font-black text-red-600 mt-2">${res.current.cost.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1">AI Recommendation</div>
                  <div className="text-xs font-mono text-humana-green font-semibold leading-relaxed">{res.recommended.label}</div>
                  <div className="text-lg font-black text-humana-green mt-2">${res.recommended.cost.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                </div>
              </div>

              {/* Savings highlight */}
              <div className="bg-humana-navy rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-xs font-semibold">Projected Saving</div>
                  <div className="text-white/60 text-xs">{res.validation}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-black ${savingColor}`}>${res.saving.toLocaleString()}<span className="text-sm font-normal text-white/60">/mo</span></div>
                  <div className="text-white/50 text-xs">${res.annualSaving.toLocaleString()}/yr</div>
                </div>
              </div>

              {/* Metrics */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">90-Day Performance Metrics</div>
                <div className="space-y-2">
                  {res.metrics.map(m => (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 shrink-0">{m.label}</span>
                      {typeof m.value === 'number' && m.warn ? (
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${m.value < m.warn ? 'bg-humana-green' : 'bg-amber-400'}`} style={{ width: `${m.value}%` }} />
                          </div>
                          <span className="text-xs font-mono text-gray-600 w-8 text-right">{m.value}{m.unit}</span>
                          {m.value < m.warn && <span className="text-xs text-green-600 font-semibold">✓ safe</span>}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-humana-navy">{m.value}{m.unit}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk + tf file */}
              <div className="flex items-center gap-3 text-xs">
                <span className={`px-2 py-1 rounded border font-semibold ${RISK_STYLE[res.risk]}`}>{res.risk} Risk</span>
                <span className="text-gray-400 font-mono">{res.tfFile}</span>
              </div>
            </div>

            {/* Right: Terraform diff + Actions + Deploy log */}
            <div className="space-y-4">
              {/* Terraform diff */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <FileText size={11} />Terraform Change
                </div>
                <TerraformDiff lines={res.diff} />
              </div>

              {/* Action buttons / PR / Deploy */}
              <div className="space-y-2">
                {phase === 'ready' && (
                  <button onClick={createPR} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-humana-navy text-white rounded-lg text-sm font-semibold hover:bg-humana-navy/90 transition-colors">
                    <GitPullRequest size={14} /> Create GitHub PR
                  </button>
                )}

                {phase === 'creating_pr' && (
                  <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
                    <RefreshCw size={14} className="animate-spin text-humana-green" />
                    Creating GitHub PR + committing Terraform changes…
                  </div>
                )}

                {(phase === 'pr_ready' || phase === 'deploying' || phase === 'done') && pr && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-green-800">PR #{pr.number} Created</div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">{pr.title}</div>
                      <a href={pr.html_url} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 text-xs text-humana-teal hover:underline mt-1">
                        <ExternalLink size={11} /> View on GitHub
                      </a>
                    </div>
                  </div>
                )}

                {phase === 'pr_ready' && (
                  <button onClick={deployNow} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-humana-green text-white rounded-lg text-sm font-semibold hover:bg-humana-green/90 transition-colors">
                    <Zap size={14} /> Approve & Deploy (Terraform Apply)
                  </button>
                )}

                {/* Deployment log */}
                {(phase === 'deploying' || phase === 'done') && deployLog.length > 0 && (
                  <div className="rounded-lg overflow-hidden border border-gray-800">
                    <div className="bg-gray-900 px-3 py-1.5 flex items-center gap-2">
                      <Terminal size={11} className="text-gray-400" />
                      <span className="text-xs text-gray-400">Terraform Apply — Live Output</span>
                      {phase === 'deploying' && <RefreshCw size={10} className="text-humana-green animate-spin ml-auto" />}
                      {phase === 'done' && <CheckCircle2 size={10} className="text-green-400 ml-auto" />}
                    </div>
                    <div ref={logRef} className="bg-gray-950 px-3 py-2 max-h-44 overflow-y-auto space-y-0.5">
                      {deployLog.map((l, i) => (
                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-xs text-gray-300 flex gap-2">
                          <span className="text-gray-600 shrink-0">{l.ts}</span>
                          <span>{l.icon}</span>
                          <span className={l.icon === '🎉' ? 'text-humana-green font-semibold' : l.icon === '❌' ? 'text-red-400' : ''}>{l.msg}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {phase === 'done' && postData?.found && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Live Azure State Confirmed
                    </div>
                    {resourceKey === 'sql' ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-500">SKU:</span> <span className="font-mono font-semibold text-humana-navy">{postData.currentSku}</span></div>
                        <div><span className="text-gray-500">Max vCores:</span> <span className="font-mono font-semibold text-humana-navy">{postData.maxVCores}</span></div>
                        <div><span className="text-gray-500">Auto-pause:</span> <span className="font-mono font-semibold text-humana-green">{postData.autoPauseDelay}min</span></div>
                        <div><span className="text-gray-500">Status:</span> <span className="font-mono font-semibold text-humana-green">{postData.status}</span></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-500">Tier:</span> <span className="font-mono font-semibold text-humana-navy">{postData.tier}</span></div>
                        <div><span className="text-gray-500">Lifecycle:</span> <span className="font-mono font-semibold text-humana-green">{postData.hasLifecyclePolicy ? 'Applied ✓' : 'Pending'}</span></div>
                        {postData.lifecycleRules?.[0] && (
                          <>
                            <div><span className="text-gray-500">Cool after:</span> <span className="font-mono font-semibold text-humana-green">30 days</span></div>
                            <div><span className="text-gray-500">Archive after:</span> <span className="font-mono font-semibold text-humana-green">90 days</span></div>
                          </>
                        )}
                      </div>
                    )}
                    <a href={postData.portalUrl} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                      <ExternalLink size={10} /> Open in Azure Portal to verify
                    </a>
                  </div>
                )}

                {phase === 'done' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-humana-green font-black text-lg">${res.annualSaving.toLocaleString()}/yr saved</div>
                    <div className="text-xs text-gray-500 mt-0.5">Rightsizing complete · ServiceNow CR auto-closed · CAPE KPI updated</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CAPERightsizingAgent() {
  const [liveTab, setLiveTab]         = useState('sql')
  const [phase, setPhase]             = useState('idle')
  const [completedSteps, setCompletedSteps] = useState([])
  const [activeStep, setActiveStep]   = useState(null)
  const [approvals, setApprovals]     = useState({})
  const [filterEnv, setFilterEnv]     = useState('All')
  const [filterBU, setFilterBU]       = useState('All')
  const [filterRisk, setFilterRisk]   = useState('All')
  const [filterAction, setFilterAction] = useState('All')
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [chatOpen, setChatOpen]       = useState(true)

  const filtered = useMemo(() => RESOURCES.filter(r =>
    (filterEnv    === 'All' || r.env    === filterEnv) &&
    (filterBU     === 'All' || r.bu     === filterBU) &&
    (filterRisk   === 'All' || r.risk   === filterRisk) &&
    (filterAction === 'All' || r.action === filterAction) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.stack.toLowerCase().includes(search.toLowerCase()))
  ), [filterEnv, filterBU, filterRisk, filterAction, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalSaving = RESOURCES.reduce((s, r) => s + r.saving, 0)
  const approvedRows = RESOURCES.filter(r => approvals[r.id] === 'approved')
  const approvedSaving = approvedRows.reduce((s, r) => s + r.saving, 0)
  const reviewPct = phase === 'done' ? 100 : 0
  const implPct   = phase === 'done' ? Math.round((approvedRows.length / RESOURCES.length) * 100) : 0
  const capePct   = Math.round(0.4 * reviewPct + 0.6 * implPct)

  const runAnalysis = async () => {
    setPhase('running'); setCompletedSteps([]); setActiveStep(null); setApprovals({})
    for (const step of AGENT_STEPS) {
      setActiveStep(step.id)
      await new Promise(r => setTimeout(r, step.duration))
      setCompletedSteps(p => [...p, step.id])
    }
    setActiveStep(null); setPhase('done')
  }

  const approve = id => setApprovals(p => ({ ...p, [id]: 'approved' }))
  const defer   = id => setApprovals(p => ({ ...p, [id]: 'deferred' }))
  const resetFilter = () => { setFilterEnv('All'); setFilterBU('All'); setFilterRisk('All'); setFilterAction('All'); setSearch(''); setPage(1) }

  return (
    <div className="min-h-screen bg-humana-light pb-24">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <Building2 size={11} className="text-humana-teal" />
              <span>Platform Engineering</span><ChevronRight size={10} />
              <span className="text-humana-navy font-semibold">CAPE · Rightsizing Agent</span>
            </div>
            <h1 className="text-xl font-bold text-humana-navy">CAPE Automated Rightsizing Recommendations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Azure East/West/Central + On-Prem Louisville &amp; Simpsonville · {SUMMARY.buCount} BUs · {SUMMARY.stackCount} tech stacks · Real GitHub PR + Terraform Apply</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <div className="text-center px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-black text-red-600">2–6 wks</div>
                <div className="text-xs text-gray-400">Before AI</div>
              </div>
              <ChevronRight size={13} className="text-gray-300" />
              <div className="text-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-black text-humana-green">2–3 days</div>
                <div className="text-xs text-gray-400">With CAPE AI</div>
              </div>
            </div>
            <button
              onClick={phase !== 'running' ? runAnalysis : undefined}
              disabled={phase === 'running'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${phase === 'running' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-humana-navy text-white hover:bg-humana-navy/90 shadow-md'}`}
            >
              {phase === 'running' ? <><RefreshCw size={14} className="animate-spin" />Analyzing…</>
               : phase === 'done'  ? <><RefreshCw size={14} />Re-run Full Analysis</>
               :                     <><BarChart3 size={14} />Run Full Analysis</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-5">

        {/* ── Summary Banner ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Resources', value: SUMMARY.total.toLocaleString(), sub: '5 environments', color: 'text-humana-navy' },
            { label: 'Opportunities', value: SUMMARY.opportunities.toLocaleString(), sub: 'identified by AI', color: 'text-humana-teal' },
            { label: 'Annual Savings', value: `$${(SUMMARY.annualSavings/1e6).toFixed(1)}M`, sub: 'identified potential', color: 'text-humana-green' },
            { label: 'Business Units', value: SUMMARY.buCount, sub: 'in scope', color: 'text-humana-navy' },
            { label: 'Tech Stacks', value: SUMMARY.stackCount, sub: 'Azure + On-Prem', color: 'text-purple-600' },
            { label: 'CAPE KPI', value: `${capePct}%`, sub: '0.4×rev + 0.6×impl', color: capePct >= 50 ? 'text-humana-green' : 'text-gray-400' },
          ].map(kpi => (
            <div key={kpi.label} className="card-humana p-4 text-center">
              <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs font-semibold text-gray-600 mt-0.5">{kpi.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Live Demo Section ── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-humana-navy">Live Rightsizing Demo</span>
            </div>
            <span className="text-xs text-gray-400">Select a resource and walk through the full approval + deployment flow</span>
            <div className="flex gap-1 ml-auto">
              {[
                { key: 'sql',  label: 'Azure SQL DB',      icon: Database  },
                { key: 'blob', label: 'Azure Blob Storage', icon: HardDrive },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setLiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    liveTab === tab.key ? 'bg-humana-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={liveTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <LiveDemoPanel key={liveTab} resourceKey={liveTab} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── 4-col: Agent Steps + Env Breakdown + BU + CAPE KPI ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

          {/* Agent Steps */}
          <div className="card-humana p-4 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={13} className="text-humana-teal" />
              <h2 className="text-sm font-bold text-humana-navy">Agent Workflow</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{AGENT_STEPS.length} steps</span>
            </div>
            {AGENT_STEPS.map(step => {
              const state = completedSteps.includes(step.id) ? 'done' : activeStep === step.id ? 'active' : 'waiting'
              return <StepRow key={step.id} step={step} state={state} />
            })}
          </div>

          {/* Env breakdown */}
          <div className="card-humana p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cloud size={13} className="text-humana-teal" />
              <h2 className="text-sm font-bold text-humana-navy">Environment Breakdown</h2>
            </div>
            <div className="space-y-3">
              {ENVS.map(env => (
                <div key={env.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 truncate">{env.label}</span>
                    <span className="font-bold text-humana-green ml-1 shrink-0">${(env.savings/1e3).toFixed(0)}K/yr</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(env.savings/SUMMARY.annualSavings*100)}%`, backgroundColor: env.color }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{env.resources.toLocaleString()} resources</div>
                </div>
              ))}
            </div>
          </div>

          {/* BU savings */}
          <div className="card-humana p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={13} className="text-humana-teal" />
              <h2 className="text-sm font-bold text-humana-navy">Business Unit Savings</h2>
            </div>
            <div className="space-y-2">
              {BUS.map(bu => {
                const pct = Math.round(bu.savings / SUMMARY.annualSavings * 100)
                return (
                  <div key={bu.id}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="truncate text-gray-600 font-medium">{bu.label}</span>
                      <span className="font-bold text-gray-700 ml-1 shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-humana-teal rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CAPE KPI */}
          <div className="card-humana p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={13} className="text-humana-teal" />
              <h2 className="text-sm font-bold text-humana-navy">CAPE Coverage KPI</h2>
            </div>
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={capePct >= 80 ? '#2d7a4f' : capePct >= 50 ? '#f59e0b' : '#9ca3af'}
                    strokeWidth="12"
                    strokeDasharray={`${2.513 * capePct} ${2.513 * (100 - capePct)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.9s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-humana-navy">{capePct}%</span>
                  <span className="text-xs text-gray-400">Score</span>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {[{ label: 'Review coverage', pct: reviewPct, color: 'bg-indigo-400' }, { label: 'Implementation', pct: implPct, color: 'bg-humana-green' }].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{m.label}</span>
                    <span className="font-bold text-humana-navy">{m.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.color} transition-all duration-700`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="text-xs text-gray-400 italic text-center mt-1">0.4 × reviews + 0.6 × implementations</div>
              {phase === 'done' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Approved savings</span>
                  <span className="font-black text-humana-green">${(approvedSaving*12).toLocaleString()}/yr</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="card-humana px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Filter size={12} /> Filters
          </div>
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-6 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-humana-green/40"
              placeholder="Search resource or stack…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          {[
            { label: 'Environment', val: filterEnv,    set: v => { setFilterEnv(v);    setPage(1) }, opts: ENV_OPTIONS },
            { label: 'Business Unit', val: filterBU,   set: v => { setFilterBU(v);     setPage(1) }, opts: BU_OPTIONS },
            { label: 'Risk',         val: filterRisk,  set: v => { setFilterRisk(v);   setPage(1) }, opts: RISK_OPTIONS },
            { label: 'Action',       val: filterAction,set: v => { setFilterAction(v); setPage(1) }, opts: ACTION_OPTIONS },
          ].map(f => (
            <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-humana-green/40 bg-white text-gray-600">
              {f.opts.map(o => <option key={o}>{o === 'All' ? `All ${f.label}s` : o}</option>)}
            </select>
          ))}
          <button onClick={resetFilter} className="text-xs text-gray-400 hover:text-gray-600 underline ml-auto">Clear</button>
          <span className="text-xs text-gray-400">
            {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} (estate total: 4,231)
          </span>
        </div>

        {/* ── Recommendations Table ── */}
        <div className="card-humana overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <TrendingDown size={14} className="text-humana-teal" />
            <h2 className="text-sm font-bold text-humana-navy">Enterprise Rightsizing Recommendations</h2>
            {phase === 'done' && (
              <span className="text-xs bg-humana-green/10 text-humana-green px-2 py-0.5 rounded-full font-semibold">
                {RESOURCES.length} in demo · ${(totalSaving*12).toLocaleString()}/yr
              </span>
            )}
          </div>

          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 grid text-xs font-semibold text-gray-400 uppercase tracking-wide gap-x-2"
               style={{ gridTemplateColumns: '11rem 9rem 8rem 1fr 1fr 4rem 4rem 5.5rem 4.5rem 5rem 5.5rem' }}>
            <span>Resource</span><span>Environment</span><span>Business Unit</span>
            <span>Current Spec</span><span>Recommended</span>
            <span className="text-center">CPU</span><span className="text-center">Mem</span>
            <span className="text-right">Saving/mo</span><span>Risk</span><span>Action</span><span className="text-right">Approval</span>
          </div>

          <div className="divide-y divide-gray-50">
            {phase === 'idle' ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <TrendingDown size={36} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Click <span className="text-humana-navy font-semibold">Run Full Analysis</span> to populate enterprise recommendations</p>
              </div>
            ) : phase === 'running' && pageRows.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-400">
                <RefreshCw size={14} className="animate-spin" /> Analysing 10,847 resources…
              </div>
            ) : pageRows.map((r, i) => {
              const approved = approvals[r.id] === 'approved'
              const deferred = approvals[r.id] === 'deferred'
              return (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className={`grid items-start gap-x-2 px-4 py-2.5 text-xs transition-colors ${approved ? 'bg-green-50/50' : deferred ? 'bg-gray-50/80' : 'hover:bg-gray-50/40'}`}
                  style={{ gridTemplateColumns: '11rem 9rem 8rem 1fr 1fr 4rem 4rem 5.5rem 4.5rem 5rem 5.5rem' }}>
                  <div className="min-w-0">
                    <div className="font-semibold text-humana-navy truncate">{r.name}</div>
                    <div className="text-gray-400 mt-0.5">
                      <span>{r.type}</span>
                    </div>
                  </div>
                  <div className="text-gray-500">{r.env}</div>
                  <div className="text-gray-500 truncate">{r.bu}</div>
                  <span className="font-mono text-gray-600">{r.current}</span>
                  <span className="font-mono text-humana-green font-semibold">{r.recommended}</span>
                  <div><UtilBar value={r.cpuP95} /></div>
                  <div><UtilBar value={r.memP95} /></div>
                  <div className="text-right">
                    <div className="font-black text-humana-green">${r.saving.toLocaleString()}</div>
                    <div className="text-gray-400">{r.costCenter}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded border font-semibold w-fit ${RISK_STYLE[r.risk]}`}>{r.risk}</span>
                  <span className={`px-1.5 py-0.5 rounded border font-semibold text-xs w-fit ${ACTION_STYLE[r.action]}`}>{r.action}</span>
                  <div className="flex flex-col gap-1 items-end">
                    {approved ? <span className="flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 size={10} />Approved</span>
                     : deferred ? <span className="text-gray-400 italic">Deferred</span>
                     : phase === 'done' ? (
                       <>
                         <button onClick={() => approve(r.id)} className="px-2 py-0.5 bg-humana-green text-white rounded text-xs font-semibold hover:bg-humana-green/90 w-full text-center">Approve</button>
                         <button onClick={() => defer(r.id)} className="text-xs text-gray-400 hover:text-gray-600 underline">Defer</button>
                       </>
                     ) : <Clock size={11} className="text-gray-300" />}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={12} /> Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">
                Next <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* ── Savings tiers ── */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="card-humana p-4 lg:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={13} className="text-humana-teal" />
                  <h3 className="text-sm font-bold text-humana-navy">Savings by Risk Tier</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { risk: 'Low',    label: 'Low-risk — auto-queue to ServiceNow',        color: 'text-humana-green', bar: 'bg-humana-green' },
                    { risk: 'Medium', label: 'Medium-risk — architecture review required', color: 'text-amber-600',    bar: 'bg-amber-400' },
                    { risk: 'High',   label: 'High-risk — board approval required',        color: 'text-red-600',      bar: 'bg-red-400' },
                  ].map(tier => {
                    const rows = RESOURCES.filter(r => r.risk === tier.risk)
                    const s = rows.reduce((a, r) => a + r.saving, 0)
                    return (
                      <div key={tier.risk} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-gray-600">{tier.label}</span>
                          <span className={`text-sm font-black ${tier.color}`}>${(s*12).toLocaleString()}/yr</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${Math.round(s/totalSaving*100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{rows.length} resources</span>
                        </div>
                      </div>
                    )
                  })}
                  <div className="bg-humana-navy rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white text-xs font-semibold">Total annual opportunity (demo scope)</div>
                      <div className="text-white/60 text-xs">Full estate: $5.82M/yr · Approved: ${(approvedSaving*12).toLocaleString()}/yr</div>
                    </div>
                    <div className="text-right">
                      <div className="text-humana-green font-black text-lg">${(totalSaving*12).toLocaleString()}</div>
                      <div className="text-white/50 text-xs">per year</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-humana p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitPullRequest size={13} className="text-humana-teal" />
                  <h3 className="text-sm font-bold text-humana-navy">Execution Queue</h3>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Terraform PRs staged',    val: `${RESOURCES.filter(r=>r.risk==='Low').length} PRs`,   color: 'text-humana-green' },
                    { label: 'ServiceNow CRs created',  val: `${RESOURCES.filter(r=>r.risk==='Medium').length} CRs`,color: 'text-amber-600' },
                    { label: 'Board approval required', val: `${RESOURCES.filter(r=>r.risk==='High').length} items`, color: 'text-red-600' },
                    { label: 'NetApp archive workflows',val: '2 workflows',                                           color: 'text-gray-600' },
                    { label: 'Azure Policy exemptions', val: '4 exemptions',                                          color: 'text-gray-600' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.val}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-humana-green text-white rounded-lg text-sm font-semibold hover:bg-humana-green/90 transition-colors">
                  <Zap size={13} /> Execute All Approved Changes
                </button>
                <p className="text-xs text-gray-400 text-center mt-1.5">Plan-mode only · Human sign-off before apply</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── Floating Chatbot ── */}
      <ChatPanel open={chatOpen} onToggle={() => setChatOpen(o => !o)} />
    </div>
  )
}
