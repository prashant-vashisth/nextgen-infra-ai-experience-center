require('dotenv').config();
const axios = require('axios');

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
const OWNER = process.env.GITHUB_REPO_OWNER;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function createRepo(name, description) {
  try {
    const r = await axios.post('https://api.github.com/user/repos', {
      name, description, private: false, auto_init: true,
    }, { headers });
    console.log(`  ✅ Created https://github.com/${r.data.full_name}`);
    await sleep(3000);
  } catch (err) {
    if (err.response?.data?.message?.includes('already exists')) {
      console.log(`  ℹ️  ${name} already exists`);
    } else {
      throw new Error(`createRepo ${name}: ${err.response?.data?.message || err.message}`);
    }
  }
}

async function upsertFile(repo, filePath, content, message) {
  const base = `https://api.github.com/repos/${OWNER}/${repo}`;
  let sha;
  try {
    const r = await axios.get(`${base}/contents/${filePath}`, { headers });
    sha = r.data.sha;
    process.stdout.write(`    updating ${filePath} ... `);
  } catch {
    process.stdout.write(`    creating ${filePath} ... `);
  }
  const body = { message, content: Buffer.from(content).toString('base64') };
  if (sha) body.sha = sha;
  await axios.put(`${base}/contents/${filePath}`, body, { headers });
  console.log('✅');
}

async function triggerWorkflow(repo) {
  const url = `https://api.github.com/repos/${OWNER}/${repo}/actions/workflows/ida-pipeline.yml/dispatches`;
  try {
    await axios.post(url, { ref: 'main' }, { headers });
    console.log(`  ✅ Workflow triggered → https://github.com/${OWNER}/${repo}/actions`);
  } catch (err) {
    console.log(`  ⚠️  Workflow trigger: ${err.response?.data?.message || err.message}`);
  }
}

// ─── Shared YAML template ─────────────────────────────────────────────────────

function makeWorkflowYaml(repoLabel) {
  return [
    `name: IDA Pipeline — ${repoLabel}`,
    '',
    'on:',
    '  push:',
    '    branches: [ main, "demo/**", "hotfix/**", "feature/**" ]',
    '  workflow_dispatch:',
    '',
    'jobs:',
    '  ida-assessment:',
    `    name: IDA Assessment — ${repoLabel}`,
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - name: Run IDA Assessment',
    '        run: python3 .github/scripts/ida_assess.py',
  ].join('\n');
}

// ─── Repo 1: ida-demo-loadbalancer — Grade A, create-only ────────────────────

const LB_ASSESS_PY = `#!/usr/bin/env python3
"""IDA Assessment - Azure Load Balancer (Grade A, create-only scenario)"""
import os, json, time, sys

RUN_ID    = os.environ.get('GITHUB_RUN_ID', '25758381652')
WORKSPACE = 'AZURE-SEIA-LOADBALANCER-CLOUD3-NPE'
MODULE    = 'se-loadbalancer-cloud-3-0'
VERSION   = '1.0.8'

payload = {
    "workspaceId": WORKSPACE,
    "action": "runValidation",
    "moduleVersion": {MODULE: [VERSION]},
    "runBy": "github-actions",
    "githubRunId": RUN_ID,
}

print(f'Run appUrl="https://ida.humana.com"')
print()
print(f'Input Payload: {json.dumps(payload)}')
print()
print(
    f'Notice: Final budget check result for {WORKSPACE}: WARNING. '
    'Current Spend: $189443.55, Budget: $486137.10, '
    'Remaining: $296693.55, Forecast Year End: $511341.40'
)
print()
print('Submitting status checker request')
print()
for _ in range(4):
    print('Terraform plan status: running')
    sys.stdout.flush()
    time.sleep(1)
print('Terraform plan status: finished')
print('Checking...')
print()
print('Grade is: A')
print()
result = {
    "planCreateScore": 100,
    "planDeleteScore": 0,
    "planUpdateScore": 0,
    "planFinalScore": 100,
    "planGrade": "A",
    "runPolicyScore": 6,
    "totalScore": 106,
    "moduleVersion": f"{MODULE}:{VERSION}",
}
print('Response:')
print(json.dumps(result))
print()
print(f'Github Run ID: {RUN_ID}')
`;

const LB_MAIN_TF = `# Azure Load Balancer — Humana Cloud 3.0
# IDA Grade target: A (create-only)
# Workspace: AZURE-SEIA-LOADBALANCER-CLOUD3-NPE

terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~>3.0" }
  }
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "humanaprd"
    workspaces { name = "AZURE-SEIA-LOADBALANCER-CLOUD3-NPE" }
  }
}

provider "azurerm" { features {} }

resource "azurerm_resource_group" "lb" {
  name     = "humana-seia-lb-cloud3-npe"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_public_ip" "lb_pip" {
  name                = "humana-lb-public-ip"
  resource_group_name = azurerm_resource_group.lb.name
  location            = azurerm_resource_group.lb.location
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.common_tags
}

resource "azurerm_lb" "main" {
  name                = "humana-seia-loadbalancer"
  resource_group_name = azurerm_resource_group.lb.name
  location            = azurerm_resource_group.lb.location
  sku                 = "Standard"
  tags                = var.common_tags

  frontend_ip_configuration {
    name                 = "PublicIPAddress"
    public_ip_address_id = azurerm_public_ip.lb_pip.id
  }
}

resource "azurerm_lb_backend_address_pool" "main" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "humana-backend-pool"
}

resource "azurerm_lb_probe" "http" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "http-probe"
  protocol        = "Http"
  port            = 80
  request_path    = "/health"
}

resource "azurerm_lb_rule" "http" {
  loadbalancer_id                = azurerm_lb.main.id
  name                           = "http-rule"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "PublicIPAddress"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.main.id]
  probe_id                       = azurerm_lb_probe.http.id
}
`;

const LB_VARIABLES_TF = `variable "location" {
  type    = string
  default = "East US"
}

variable "common_tags" {
  type = map(string)
  default = {
    Environment = "non-production"
    CostCenter  = "HUM-SEIA-001"
    Owner       = "platform-engineering@humana.com"
    Compliance  = "HIPAA"
    ManagedBy   = "Terraform"
  }
}
`;

// ─── Repo 2: ida-demo-vm-scaledown — Grade C, high delete ────────────────────

const VM_ASSESS_PY = `#!/usr/bin/env python3
"""IDA Assessment - Azure VM Scale-Down (Grade C, high delete score scenario)"""
import os, json, time, sys

RUN_ID    = os.environ.get('GITHUB_RUN_ID', '24654891023')
WORKSPACE = 'AZURE-SEIA-COMPUTE-CLOUD3-NPE'
MODULE    = 'se-compute-cloud-3-0'
VERSION   = '1.5.1'

payload = {
    "workspaceId": WORKSPACE,
    "action": "runValidation",
    "moduleVersion": {MODULE: [VERSION]},
    "runBy": "github-actions",
    "githubRunId": RUN_ID,
}

print(f'Run appUrl="https://ida.humana.com"')
print()
print(f'Input Payload: {json.dumps(payload)}')
print()
print(
    f'Notice: Final budget check result for {WORKSPACE}: PASS. '
    'Current Spend: $423900.00, Budget: $620000.00, '
    'Remaining: $196100.00, Forecast Year End: $589000.00'
)
print()
print('Submitting status checker request')
print()
for _ in range(5):
    print('Terraform plan status: running')
    sys.stdout.flush()
    time.sleep(1)
print('Terraform plan status: finished')
print('Checking...')
print()
print('Grade is: C')
print()
result = {
    "planCreateScore": 20,
    "planDeleteScore": 65,
    "planUpdateScore": 15,
    "planFinalScore": 20,
    "planGrade": "C",
    "runPolicyScore": 3,
    "totalScore": 23,
    "moduleVersion": f"{MODULE}:{VERSION}",
    "deleteDetail": "14 azurerm_virtual_machine instances scheduled for termination",
}
print('Response:')
print(json.dumps(result))
print()
print(f'Github Run ID: {RUN_ID}')
`;

const VM_MAIN_TF = `# Azure VM Scale Set — Humana Cloud 3.0
# IDA Grade target: C (high delete score — 14 VM terminations)
# Branch: hotfix/vm-scale-down-nonprod
# Workspace: AZURE-SEIA-COMPUTE-CLOUD3-NPE

terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~>3.0" }
  }
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "humanaprd"
    workspaces { name = "AZURE-SEIA-COMPUTE-CLOUD3-NPE" }
  }
}

provider "azurerm" { features {} }

resource "azurerm_resource_group" "compute" {
  name     = "humana-seia-compute-cloud3-npe"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_virtual_network" "vnet" {
  name                = "humana-compute-vnet"
  address_space       = ["10.10.0.0/16"]
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name
  tags                = var.common_tags
}

resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.compute.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.10.1.0/24"]
}

resource "azurerm_windows_virtual_machine_scale_set" "app_vmss" {
  name                = "humana-app-vmss"
  resource_group_name = azurerm_resource_group.compute.name
  location            = azurerm_resource_group.compute.location
  sku                 = "Standard_D2s_v3"
  instances           = 2  # hotfix: scale down from 16 — triggers 14 terminations
  admin_username      = var.admin_username
  admin_password      = var.admin_password

  source_image_reference {
    publisher = "MicrosoftWindowsServer"
    offer     = "WindowsServer"
    sku       = "2022-Datacenter"
    version   = "latest"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name    = "humana-vmss-nic"
    primary = true
    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = azurerm_subnet.app.id
    }
  }

  tags = var.common_tags
}
`;

const VM_VARIABLES_TF = `variable "location" {
  type    = string
  default = "East US"
}

variable "admin_username" {
  type    = string
  default = "humana-admin"
}

variable "admin_password" {
  type      = string
  sensitive = true
  default   = "placeholder-replaced-by-vault"
}

variable "common_tags" {
  type = map(string)
  default = {
    Environment = "non-production"
    CostCenter  = "HUM-COMPUTE-002"
    Owner       = "platform-engineering@humana.com"
    Compliance  = "HIPAA"
    ManagedBy   = "Terraform"
  }
}
`;

// ─── Repo 3: ida-demo-aks-nodepool — Grade B, update-heavy ───────────────────

const AKS_ASSESS_PY = `#!/usr/bin/env python3
"""IDA Assessment - AKS Node Pool Update (Grade B, update-heavy scenario)"""
import os, json, time, sys

RUN_ID    = os.environ.get('GITHUB_RUN_ID', '26001234567')
WORKSPACE = 'AZURE-SEIA-AKS-CLOUD3-NPE'
MODULE    = 'se-aks-cloud-3-0'
VERSION   = '2.1.0'

payload = {
    "workspaceId": WORKSPACE,
    "action": "runValidation",
    "moduleVersion": {MODULE: [VERSION]},
    "runBy": "github-actions",
    "githubRunId": RUN_ID,
}

print(f'Run appUrl="https://ida.humana.com"')
print()
print(f'Input Payload: {json.dumps(payload)}')
print()
print(
    f'Notice: Final budget check result for {WORKSPACE}: PASS. '
    'Current Spend: $287650.00, Budget: $450000.00, '
    'Remaining: $162350.00, Forecast Year End: $398200.00'
)
print()
print('Submitting status checker request')
print()
for _ in range(4):
    print('Terraform plan status: running')
    sys.stdout.flush()
    time.sleep(1)
print('Terraform plan status: finished')
print('Checking...')
print()
print('Grade is: B')
print()
result = {
    "planCreateScore": 15,
    "planDeleteScore": 0,
    "planUpdateScore": 30,
    "planFinalScore": 75,
    "planGrade": "B",
    "runPolicyScore": 5,
    "totalScore": 80,
    "moduleVersion": f"{MODULE}:{VERSION}",
    "updateDetail": "Node pool VM size upgrade: Standard_D2s_v3 to Standard_D4s_v3 across 3 pools",
}
print('Response:')
print(json.dumps(result))
print()
print(f'Github Run ID: {RUN_ID}')
`;

const AKS_MAIN_TF = `# AKS Node Pool Update — Humana Cloud 3.0
# IDA Grade target: B (update-heavy — node pool VM size upgrade)
# Branch: feature/aks-nodepool-upgrade
# Workspace: AZURE-SEIA-AKS-CLOUD3-NPE

terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~>3.0" }
  }
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "humanaprd"
    workspaces { name = "AZURE-SEIA-AKS-CLOUD3-NPE" }
  }
}

provider "azurerm" { features {} }

resource "azurerm_resource_group" "aks" {
  name     = "humana-seia-aks-cloud3-npe"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_kubernetes_cluster" "humana_aks" {
  name                = "humana-seia-aks-npe"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  dns_prefix          = "humana-seia-npe"

  default_node_pool {
    name            = "system"
    node_count      = 3
    vm_size         = "Standard_D4s_v3"  # updated from Standard_D2s_v3
    os_disk_size_gb = 128
    tags            = var.common_tags
  }

  identity { type = "SystemAssigned" }

  tags = var.common_tags
}

resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "apppool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.humana_aks.id
  vm_size               = "Standard_D4s_v3"  # updated from Standard_D2s_v3
  node_count            = 5
  os_disk_size_gb       = 128
  tags                  = var.common_tags
}

resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpupool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.humana_aks.id
  vm_size               = "Standard_NC6s_v3"
  node_count            = 2
  tags                  = var.common_tags
}
`;

const AKS_VARIABLES_TF = `variable "location" {
  type    = string
  default = "East US"
}

variable "common_tags" {
  type = map(string)
  default = {
    Environment = "non-production"
    CostCenter  = "HUM-AKS-003"
    Owner       = "platform-engineering@humana.com"
    Compliance  = "HIPAA"
    ManagedBy   = "Terraform"
  }
}
`;

// ─── Repo definitions ─────────────────────────────────────────────────────────

const REPOS = [
  {
    name: 'ida-demo-loadbalancer',
    description: 'Humana Cloud 3.0 — Azure Load Balancer (IDA Grade A demo)',
    label: 'Azure Load Balancer',
    files: [
      ['main.tf',                            LB_MAIN_TF,    'feat: Azure LB Terraform config'],
      ['variables.tf',                       LB_VARIABLES_TF, 'feat: variable definitions'],
      ['.github/scripts/ida_assess.py',      LB_ASSESS_PY,  'ci: IDA assessment script'],
      ['.github/workflows/ida-pipeline.yml', makeWorkflowYaml('Azure Load Balancer'), 'ci: IDA pipeline workflow'],
    ],
  },
  {
    name: 'ida-demo-vm-scaledown',
    description: 'Humana Cloud 3.0 — VM Scale-Down hotfix (IDA Grade C demo)',
    label: 'VM Scale-Down',
    files: [
      ['main.tf',                            VM_MAIN_TF,    'hotfix: scale down VMSS from 16 to 2 instances'],
      ['variables.tf',                       VM_VARIABLES_TF, 'feat: variable definitions'],
      ['.github/scripts/ida_assess.py',      VM_ASSESS_PY,  'ci: IDA assessment script'],
      ['.github/workflows/ida-pipeline.yml', makeWorkflowYaml('VM Scale-Down'), 'ci: IDA pipeline workflow'],
    ],
  },
  {
    name: 'ida-demo-aks-nodepool',
    description: 'Humana Cloud 3.0 — AKS Node Pool Upgrade (IDA Grade B demo)',
    label: 'AKS Node Pool',
    files: [
      ['main.tf',                            AKS_MAIN_TF,   'feat: AKS node pool upgrade D2s->D4s'],
      ['variables.tf',                       AKS_VARIABLES_TF, 'feat: variable definitions'],
      ['.github/scripts/ida_assess.py',      AKS_ASSESS_PY, 'ci: IDA assessment script'],
      ['.github/workflows/ida-pipeline.yml', makeWorkflowYaml('AKS Node Pool'), 'ci: IDA pipeline workflow'],
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function setupRepo(repo) {
  console.log(`\n── ${repo.name}`);
  await createRepo(repo.name, repo.description);
  for (const [filePath, content, message] of repo.files) {
    await upsertFile(repo.name, filePath, content, message);
    await sleep(300); // avoid rate limits
  }
  await sleep(2000);
  await triggerWorkflow(repo.name);
}

async function main() {
  if (!OWNER) { console.error('GITHUB_REPO_OWNER not set'); process.exit(1); }
  if (!process.env.GITHUB_TOKEN) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

  console.log(`\nIDA Demo Repo Setup — owner: ${OWNER}`);
  console.log('='.repeat(50));

  for (const repo of REPOS) {
    await setupRepo(repo);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All repos configured\n');
  console.log('GitHub Actions links:');
  for (const repo of REPOS) {
    console.log(`  https://github.com/${OWNER}/${repo.name}/actions`);
  }
  console.log('\nWorkflows will complete in ~30 seconds.\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.response?.data?.message || err.message);
  process.exit(1);
});
