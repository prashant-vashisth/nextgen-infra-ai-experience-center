require('dotenv').config();
const axios = require('axios');

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const OWNER = process.env.GITHUB_REPO_OWNER;
const REPO = process.env.GITHUB_REPO_NAME || 'humana-aks-demo';
const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;

// The YAML uses ${{ }} syntax — must be a plain string, not a template literal
const WORKFLOW_YAML = [
  'name: IDA Pipeline — Terraform AKS Policy',
  '',
  'on:',
  '  push:',
  '    branches: [ main, "feature/**" ]',
  '  workflow_dispatch:',
  '    inputs:',
  '      scenario:',
  '        description: Demo scenario (standard/failure)',
  '        required: false',
  '        default: standard',
  '',
  'jobs:',
  '  checkout:',
  '    name: "1 — Checkout"',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: echo "Checked out $GITHUB_SHA"',
  '',
  '  terraform-init:',
  '    name: "2 — Terraform Init"',
  '    needs: checkout',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: echo "terraform init — providers loaded"',
  '',
  '  terraform-plan:',
  '    name: "3 — Terraform Plan"',
  '    needs: terraform-init',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: echo "terraform plan — 3 resources to apply"',
  '',
  '  ida-validation:',
  '    name: "4 — IDA Validation"',
  '    needs: terraform-plan',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - name: IDA compliance scan',
  '        run: |',
  '          echo "IDA: scanning Terraform configuration..."',
  '          echo "IDA: checking required tags..."',
  '          echo "IDA: checking NSG rules..."',
  '          echo "IDA: checking storage HIPAA settings..."',
  '          if grep -q "0.0.0.0/0" main.tf 2>/dev/null; then',
  '            echo "IDA: FAIL — unrestricted SSH detected"',
  '            echo "IDA: Grade D — Compliance Violation"',
  '            exit 1',
  '          fi',
  '          echo "IDA: Grade A — All checks passed"',
  '',
  '  terraform-apply:',
  '    name: "5 — Terraform Apply"',
  '    needs: ida-validation',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: echo "terraform apply — 3 resources applied successfully"',
].join('\n');

const TERRAFORM_HCL = `# AKS Policy Configuration — Humana Platform Engineering
# IDA Grade target: A

resource "azurerm_kubernetes_cluster" "humana_aks" {
  name                = "humana-prod-aks-eastus"
  location            = "East US"
  resource_group_name = "humana-prod-rg"
  dns_prefix          = "humana-prod"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_DS2_v2"
  }

  tags = {
    Environment = "production"
    CostCenter  = "HUM-INFRA-001"
    Owner       = "platform-engineering@humana.com"
    Compliance  = "HIPAA"
  }
}
`;

async function upsertFile(path, content, message) {
  let sha;
  try {
    const r = await axios.get(`${BASE}/contents/${path}`, { headers });
    sha = r.data.sha;
    console.log(`  updating ${path}...`);
  } catch {
    console.log(`  creating ${path}...`);
  }
  const body = { message, content: Buffer.from(content).toString('base64') };
  if (sha) body.sha = sha;
  await axios.put(`${BASE}/contents/${path}`, body, { headers });
  console.log(`  ✅ ${path}`);
}

async function main() {
  console.log(`\nSetting up ${OWNER}/${REPO}...\n`);
  try {
    await upsertFile('.github/workflows/ida-pipeline.yml', WORKFLOW_YAML, 'ci: IDA pipeline workflow for demo');
    await upsertFile('main.tf', TERRAFORM_HCL, 'feat: compliant AKS Terraform config');
    await upsertFile('README.md', `# humana-aks-demo\nAKS policy configurations managed by Humana Platform Engineering.\nIDA pipeline validates Terraform compliance before apply.\n`, 'docs: add README');
    console.log('\n✅ GitHub repo setup complete');
    console.log(`   Workflow: https://github.com/${OWNER}/${REPO}/actions`);
  } catch (err) {
    console.error('Error:', err.response?.data?.message || err.message);
    process.exit(1);
  }
}

main();
