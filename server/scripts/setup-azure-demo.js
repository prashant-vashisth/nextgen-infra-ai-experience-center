/**
 * CAPE Demo — Azure Resource Provisioner
 * Provisions: SQL Server + Serverless Database + Storage Account + Blob Container
 * Run once: node server/scripts/setup-azure-demo.js
 */
const axios = require('axios');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID } = process.env;

const CFG = {
  sub:       AZURE_SUBSCRIPTION_ID,
  rg:        process.env.CAPE_RESOURCE_GROUP    || 'rg-humana-cape-demo',
  location:  'eastus',
  sqlSrv:    process.env.CAPE_SQL_SERVER        || 'humana-cape-demo-sql',
  sqlDb:     process.env.CAPE_SQL_DB            || 'humana-claims-sql-prod',
  storage:   process.env.CAPE_STORAGE_ACCOUNT   || 'humcaperawdata',
  container: process.env.CAPE_BLOB_CONTAINER    || 'raw-claims',
  sqlAdmin:  'humanaadmin',
  sqlPass:   'HumanaCAPE2024!@#',
};

const ARM  = 'https://management.azure.com';
const APIS = { rg: '2021-04-01', sql: '2021-11-01', st: '2021-09-01' };

let _tok = null;
async function token() {
  if (_tok && Date.now() < _tok.exp) return _tok.v;
  const r = await axios.post(
    `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({ grant_type: 'client_credentials', client_id: AZURE_CLIENT_ID, client_secret: AZURE_CLIENT_SECRET, scope: 'https://management.azure.com/.default' }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  _tok = { v: r.data.access_token, exp: Date.now() + r.data.expires_in * 1000 - 30000 };
  return _tok.v;
}
async function arm() {
  const t = await token();
  return axios.create({
    baseURL: ARM,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    timeout: 30000,
    validateStatus: s => s < 400, // let 4xx throw so step() catch block can inspect the message
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pollOp(http, url, label) {
  process.stdout.write(`  ⏳ ${label}`);
  for (let i = 0; i < 60; i++) {
    await sleep(6000);
    process.stdout.write('.');
    const r = await http.get(url);
    const st = r.data?.status || r.data?.properties?.provisioningState;
    if (st === 'Succeeded' || st === 'Creating' && i > 5) { console.log(' ✅'); return r.data; }
    if (st === 'Failed') { console.log(' ❌'); throw new Error(JSON.stringify(r.data?.error || 'Operation failed')); }
    if (r.status === 200 && !r.data?.status) { console.log(' ✅'); return r.data; }
  }
  console.log(' ⏸ (timed out — check portal)');
}

// Poll a resource's own GET endpoint until provisioningState = Succeeded.
// More reliable than async-operation headers which aren't always returned.
async function waitReady(http, resourcePath, apiVersion, label) {
  const url = `${resourcePath}?api-version=${apiVersion}`;
  process.stdout.write(`\n  ⏳ ${label}`);
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    process.stdout.write('.');
    try {
      const r = await http.get(url);
      const state = r.data?.properties?.provisioningState;
      if (state === 'Succeeded') { console.log(' ✅'); return; }
      if (state === 'Failed') {
        console.log(' ❌');
        throw new Error(JSON.stringify(r.data?.properties?.error || 'Provisioning failed'));
      }
    } catch (e) {
      if (e.response?.status === 404) continue; // not visible yet, keep polling
      throw e;
    }
  }
  console.log(' ⏸ (timed out — check portal)');
}

async function step(label, fn) {
  process.stdout.write(`\n  ${label}... `);
  try {
    const r = await fn();
    const asyncUrl = r?.headers?.['azure-asyncoperation'] || r?.headers?.['location'];
    if (r?.status === 202 || (r?.status === 201 && asyncUrl)) return r; // async — caller handles polling
    console.log('✅');
    return r;
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    if (msg?.includes('already exists') || msg?.includes('conflict')) { console.log('✅ (already exists)'); return; }
    console.log(`❌ ${msg}`);
    throw e;
  }
}

async function main() {
  if (!CFG.sub || !AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    console.error('\n❌ Missing Azure credentials. Ensure .env has AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID\n');
    process.exit(1);
  }

  console.log('\n🚀 CAPE Demo — Azure Resource Setup');
  console.log('─'.repeat(50));
  console.log(`   Subscription: ${CFG.sub}`);
  console.log(`   Resource Group: ${CFG.rg} (${CFG.location})`);
  console.log(`   SQL Server: ${CFG.sqlSrv}`);
  console.log(`   SQL Database: ${CFG.sqlDb} (Serverless GP_S_Gen5_4, auto-pause: disabled)`);
  console.log(`   Storage: ${CFG.storage} / ${CFG.container}`);

  const http = await arm();

  // 1. Resource Group
  console.log('\n📦 Resource Group');
  await step(`Creating ${CFG.rg}`, () =>
    http.put(`/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}?api-version=${APIS.rg}`, {
      location: CFG.location,
      tags: { environment: 'humana-demo', project: 'cape-rightsizing', owner: 'humana-ai-ops' },
    })
  );

  // 2. SQL Server
  console.log('\n🗄️  SQL Server');
  const srvR = await step(`Creating ${CFG.sqlSrv}`, () =>
    http.put(`/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Sql/servers/${CFG.sqlSrv}?api-version=${APIS.sql}`, {
      location: CFG.location,
      tags: { environment: 'humana-demo', project: 'cape-rightsizing' },
      properties: {
        administratorLogin: CFG.sqlAdmin,
        administratorLoginPassword: CFG.sqlPass,
        publicNetworkAccess: 'Enabled',
        version: '12.0',
      },
    })
  );
  await waitReady(http,
    `/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Sql/servers/${CFG.sqlSrv}`,
    APIS.sql, 'Waiting for SQL Server to be ready');

  await step('Adding firewall rule (allow Azure services)', () =>
    http.put(`/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Sql/servers/${CFG.sqlSrv}/firewallRules/AllowAllAzureIps?api-version=${APIS.sql}`, {
      properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' },
    })
  );

  // 3. SQL Database (Serverless, max 4 vCores, auto-pause DISABLED — this is the "before" state)
  console.log('\n📊 SQL Database');
  const dbR = await step(`Creating ${CFG.sqlDb} (GP_S_Gen5_4, auto-pause disabled)`, () =>
    http.put(`/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Sql/servers/${CFG.sqlSrv}/databases/${CFG.sqlDb}?api-version=${APIS.sql}`, {
      location: CFG.location,
      tags: { environment: 'humana-demo', 'business-unit': 'claims-processing', 'cost-center': 'CC-1201', compliance: 'hipaa,sox', 'cape-state': 'before-rightsizing' },
      sku: { name: 'GP_S_Gen5_4', tier: 'GeneralPurpose', family: 'Gen5', capacity: 4 },
      properties: {
        collation: 'SQL_Latin1_General_CP1_CI_AS',
        maxSizeBytes: 34359738368,
        autoPauseDelay: -1,   // -1 = disabled (always-on) — the "before" state to demonstrate
        minCapacity: 0.5,
      },
    })
  );
  await waitReady(http,
    `/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Sql/servers/${CFG.sqlSrv}/databases/${CFG.sqlDb}`,
    APIS.sql, 'Waiting for SQL Database (takes 2-5 min)');

  // 4. Storage Account
  console.log('\n🗃️  Storage Account');
  const stR = await step(`Creating ${CFG.storage} (Hot tier)`, () =>
    http.put(`/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Storage/storageAccounts/${CFG.storage}?api-version=${APIS.st}`, {
      location: CFG.location,
      tags: { environment: 'humana-demo', 'business-unit': 'claims-processing', 'cost-center': 'CC-1201', 'cape-state': 'before-rightsizing' },
      sku: { name: 'Standard_LRS' },
      kind: 'StorageV2',
      properties: {
        accessTier: 'Hot',
        supportsHttpsTrafficOnly: true,
        minimumTlsVersion: 'TLS1_2',
        allowBlobPublicAccess: false,
        allowSharedKeyAccess: true,
      },
    })
  );
  await waitReady(http,
    `/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Storage/storageAccounts/${CFG.storage}`,
    APIS.st, 'Waiting for Storage Account');

  await step(`Creating blob container: ${CFG.container}`, () =>
    http.put(`/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/providers/Microsoft.Storage/storageAccounts/${CFG.storage}/blobServices/default/containers/${CFG.container}?api-version=${APIS.st}`, {
      properties: { publicAccess: 'None' },
    })
  );

  // 5. Done
  console.log('\n' + '─'.repeat(50));
  console.log('✅  Setup complete!\n');
  console.log('Resources live in Azure:');
  console.log(`  Portal: https://portal.azure.com/#resource/subscriptions/${CFG.sub}/resourceGroups/${CFG.rg}/overview`);
  console.log(`  SQL:    ${CFG.sqlSrv}.database.windows.net / ${CFG.sqlDb}`);
  console.log(`  Blob:   ${CFG.storage}.blob.core.windows.net / ${CFG.container}`);
  console.log('\nAdd these to server/.env:');
  console.log(`  CAPE_RESOURCE_GROUP=${CFG.rg}`);
  console.log(`  CAPE_SQL_SERVER=${CFG.sqlSrv}`);
  console.log(`  CAPE_SQL_DB=${CFG.sqlDb}`);
  console.log(`  CAPE_STORAGE_ACCOUNT=${CFG.storage}`);
  console.log(`  CAPE_BLOB_CONTAINER=${CFG.container}`);
  console.log(`\n  SQL Admin: ${CFG.sqlAdmin} / ${CFG.sqlPass}`);
  console.log('\n⚠️  Remember to delete rg-humana-cape-demo after the demo to stop billing.\n');
}

main().catch(e => {
  console.error('\n❌ Fatal:', e.response?.data?.error || e.message);
  process.exit(1);
});
