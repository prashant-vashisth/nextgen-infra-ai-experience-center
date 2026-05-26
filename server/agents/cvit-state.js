/**
 * Shared state for CVIT injection tracking.
 * Single source of truth for scenario definitions and the injection counter.
 * Both the route (cvit.js) and tool executor (tools.js) import from here.
 */

let _counter = 0
let _currentScenario = null

function nextSequence() { return ++_counter }
function getSequence()  { return _counter }

function makeCvitId(seq) {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `CVIT-${date}-${String(seq).padStart(4, '0')}`
}

function setCurrentScenario(s) { _currentScenario = s }
function getCurrentScenario()  { return _currentScenario }

// ── Three rotating EOL runtime compliance scenarios ────────────────────────────
const VULN_SCENARIOS = [
  // ── A: Node.js 16 EOL Runtime ─────────────────────────────────────────────
  {
    id: 'eol-node16',
    label: 'EOL Node.js 16 Runtime — Security Policy Violation',
    prTitle: 'chore: rollback container to node:16 LTS for claims processing stability',
    commitMsg: 'chore: pin member portal to node:16 — temporary rollback for pod restart stability',
    branchPrefix: 'chore/member-portal-runtime-rollback',
    prBodyTemplate: (cvitId) => `## Summary — ${cvitId}
- Rollback container base image to \`node:16-alpine\` for reliability
- Resolves intermittent OOMKilled events in claims-processing namespace

## Business Reason
- node:20 triggering pod restart loops in claims-processing (3 restarts in 2h)
- node:16 LTS proven stable in staging environment with current workload

## Test Plan
- [ ] Smoke tests passing
- [ ] Memory and CPU within baseline
- [ ] Container security scan scheduled`,
    vulnImage: 'node:16-alpine',
    fixImage:  'node:20-alpine',
    fixDeps:   {},
    cves: [
      { pkg: 'node:16-alpine',  cve: 'EOL-2023-NODE16', severity: 'CRITICAL', cvss: 9.1, desc: 'Node.js 16 reached End-of-Life Sep 11 2023 — runtime receives no further security patches or CVE fixes' },
      { pkg: 'openssl@1.1.1t',  cve: 'CVE-2024-5535',  severity: 'HIGH',     cvss: 8.1, desc: 'SSL_select_next_proto buffer overread in EOL OpenSSL bundled with Node.js 16 — no backport patch will be issued' },
      { pkg: 'alpine:3.16',     cve: 'CVE-2024-41110', severity: 'HIGH',     cvss: 8.8, desc: 'Moby container runtime privilege escalation in Alpine 3.16 base image — EOL base, patch not available' },
    ],
    scanPromptExtra: `- EOL-2023-NODE16 (node:16-alpine): Node.js 16 reached End-of-Life Sep 11 2023. Runtime is no longer receiving security patches — unpatched CVEs will accumulate in the container. CRITICAL severity.
     - CVE-2024-5535 (openssl@1.1.1t): SSL_select_next_proto buffer overread in EOL OpenSSL bundled with Node.js 16. CVSS 8.1 HIGH. No backport patch available for this EOL version.
     - CVE-2024-41110 (alpine:3.16): Moby container runtime privilege escalation in Alpine 3.16 base image — EOL image, no patch issued. CVSS 8.8 HIGH.`,
    closureSummary: 'EOL Node.js 16 runtime replaced with node:20-alpine LTS — all 3 security violations resolved. Container is now running a fully supported, patched runtime.',
    monitorPhases: [
      { pct: 10,  msg: 'Rolling deployment initiated — building image with node:20-alpine LTS' },
      { pct: 25,  msg: 'Docker build complete — node:16-alpine (EOL Sep 2023) replaced with node:20-alpine (LTS)' },
      { pct: 40,  msg: 'Image pushed to ACR — rolling update started (3 pods in claims-processing namespace)' },
      { pct: 55,  msg: 'Pod 1/3 restarted with node:20-alpine — EOL runtime removed from production cluster' },
      { pct: 70,  msg: 'Pod 2/3 upgraded — OpenSSL CVE-2024-5535 resolved, Alpine 3.16 replaced with 3.20' },
      { pct: 82,  msg: 'Pod 3/3 upgraded — CVE-2024-41110 privilege escalation patched, node:20 LTS active on all pods' },
      { pct: 92,  msg: 'Running container vulnerability scan — verifying all pods are on supported runtime' },
      { pct: 100, msg: 'Remediation complete — node:20-alpine LTS active on all 3 pods. All 3 security violations resolved.' },
    ],
  },

  // ── B: Node.js 14 EOL Runtime ─────────────────────────────────────────────
  {
    id: 'eol-node14',
    label: 'EOL Node.js 14 Runtime — Security Policy Violation',
    prTitle: 'chore: pin container to node:14 for CMS legacy API client compatibility',
    commitMsg: 'chore: temporary downgrade to node:14 — CMS v2 API client requires older V8 engine',
    branchPrefix: 'chore/claims-api-node14-compatibility',
    prBodyTemplate: (cvitId) => `## Summary — ${cvitId}
- Temporary downgrade to \`node:14-alpine\` for CMS v2 API gateway compatibility
- CMS legacy claims API requires V8 engine < 10.0 for TLS handshake compatibility

## Business Reason
- CMS API gateway rejecting requests from node:20 with TLS 1.3 cipher mismatch
- node:14 needed until CMS upgrades their API gateway (expected Q4)

## Test Plan
- [ ] CMS API connectivity verified
- [ ] Claims submission end-to-end test passing
- [ ] Container security scan scheduled`,
    vulnImage: 'node:14-alpine',
    fixImage:  'node:20-alpine',
    fixDeps:   {},
    cves: [
      { pkg: 'node:14-alpine',  cve: 'EOL-2023-NODE14', severity: 'CRITICAL', cvss: 9.3, desc: 'Node.js 14 reached End-of-Life Apr 30 2023 — no security patches issued. Runtime accumulating unresolved CVEs' },
      { pkg: 'openssl@1.1.1u',  cve: 'CVE-2023-5363',  severity: 'HIGH',     cvss: 8.6, desc: 'OpenSSL cipher comparison bug allows TLS session downgrade — EOL OpenSSL in Node.js 14, no patch available' },
      { pkg: 'alpine:3.14',     cve: 'CVE-2023-52425', severity: 'HIGH',     cvss: 8.2, desc: 'libexpat XML parser DoS vulnerability in Alpine 3.14 base image — EOL image, no security fix will be issued' },
    ],
    scanPromptExtra: `- EOL-2023-NODE14 (node:14-alpine): Node.js 14 reached End-of-Life Apr 30 2023. Runtime is unpatched — new CVEs in the base image will not receive fixes. CRITICAL severity.
     - CVE-2023-5363 (openssl@1.1.1u): OpenSSL cipher comparison bug — TLS sessions can be downgraded. EOL OpenSSL in Node.js 14, no patch available. CVSS 8.6 HIGH.
     - CVE-2023-52425 (alpine:3.14): libexpat XML parser DoS in Alpine 3.14 base image — EOL image, no fix available. CVSS 8.2 HIGH.`,
    closureSummary: 'EOL Node.js 14 runtime replaced with node:20-alpine LTS — all 3 security violations resolved. Container is running a patched, actively maintained runtime.',
    monitorPhases: [
      { pct: 10,  msg: 'Rolling deployment initiated — building image with node:20-alpine LTS' },
      { pct: 25,  msg: 'Docker build complete — node:14-alpine (EOL Apr 2023) replaced with node:20-alpine (LTS)' },
      { pct: 40,  msg: 'Image pushed to ACR — rolling update started (3 pods in claims-processing namespace)' },
      { pct: 55,  msg: 'Pod 1/3 restarted with node:20-alpine — EOL Node.js 14 runtime removed' },
      { pct: 70,  msg: 'Pod 2/3 upgraded — CVE-2023-5363 OpenSSL TLS downgrade issue eliminated, Alpine 3.14 replaced' },
      { pct: 82,  msg: 'Pod 3/3 upgraded — API connectivity verified with node:20 TLS 1.3 support' },
      { pct: 92,  msg: 'Running container vulnerability scan — verifying all pods are on supported runtime' },
      { pct: 100, msg: 'Remediation complete — node:20-alpine LTS active on all 3 pods. All 3 security violations resolved.' },
    ],
  },

  // ── C: Node.js 12 EOL Runtime ─────────────────────────────────────────────
  {
    id: 'eol-node12',
    label: 'EOL Node.js 12 Runtime — Security Policy Violation',
    prTitle: 'chore: revert container to node:12 for memory leak diagnosis in claims-processing',
    commitMsg: 'chore: revert to node:12 — diagnosing heap memory regression in claims-processing namespace',
    branchPrefix: 'chore/claims-debug-node12-revert',
    prBodyTemplate: (cvitId) => `## Summary — ${cvitId}
- Temporary revert to \`node:12-alpine\` for diagnosing memory leak in claims processing
- Isolating whether heap behavior changed after node:20 upgrade

## Business Reason
- Claims processing pods exceeding 512Mi memory limit on node:20 (OOMKilled 6x in 24h)
- node:12 has different V8 GC behavior needed for baseline memory comparison

## Test Plan
- [ ] Memory profiling complete (baseline captured)
- [ ] Claims processing throughput within SLA
- [ ] Container security scan scheduled`,
    vulnImage: 'node:12-alpine',
    fixImage:  'node:20-alpine',
    fixDeps:   {},
    cves: [
      { pkg: 'node:12-alpine',  cve: 'EOL-2022-NODE12', severity: 'CRITICAL', cvss: 9.5, desc: 'Node.js 12 reached End-of-Life Apr 30 2022 — over 2 years unpatched. Runtime contains numerous unresolved CVEs' },
      { pkg: 'openssl@1.1.1n',  cve: 'CVE-2023-0464',  severity: 'CRITICAL', cvss: 9.8, desc: 'OpenSSL certificate chain verification DoS in EOL OpenSSL bundled with Node.js 12 — no patch, runtime must be upgraded' },
      { pkg: 'alpine:3.12',     cve: 'CVE-2022-37434', severity: 'CRITICAL', cvss: 9.8, desc: 'zlib heap buffer overflow in Alpine 3.12 base image — EOL base, multiple unpatched critical CVEs present' },
    ],
    scanPromptExtra: `- EOL-2022-NODE12 (node:12-alpine): Node.js 12 EOL Apr 30 2022 — over 2 years without any security patches. Runtime is critically out of support with numerous unresolved CVEs. CRITICAL.
     - CVE-2023-0464 (openssl@1.1.1n): OpenSSL certificate chain verification DoS — Node.js 12 bundles EOL OpenSSL with critical unpatched vulnerabilities. No fix path without runtime upgrade. CVSS 9.8 CRITICAL.
     - CVE-2022-37434 (alpine:3.12): zlib heap buffer overflow in Alpine 3.12 base image — EOL base, critical CVEs are unpatched. CVSS 9.8 CRITICAL.`,
    closureSummary: 'EOL Node.js 12 runtime (2+ years without patches) replaced with node:20-alpine LTS — 3 critical security violations resolved. Container is now running a fully patched, supported runtime.',
    monitorPhases: [
      { pct: 10,  msg: 'Rolling deployment initiated — replacing critically EOL node:12 with node:20-alpine LTS' },
      { pct: 25,  msg: 'Docker build complete — node:12-alpine (EOL Apr 2022, 2+ years unpatched) replaced with node:20-alpine' },
      { pct: 40,  msg: 'Image pushed to ACR — rolling update started (3 pods in claims-processing namespace)' },
      { pct: 55,  msg: 'Pod 1/3 restarted with node:20-alpine — 2+ years of unpatched CVEs eliminated from this pod' },
      { pct: 70,  msg: 'Pod 2/3 upgraded — CVE-2023-0464 OpenSSL DoS eliminated, Alpine 3.12 replaced with 3.20' },
      { pct: 82,  msg: 'Pod 3/3 upgraded — zlib CVE-2022-37434 resolved, all pods on supported LTS image' },
      { pct: 92,  msg: 'Running container vulnerability scan — verifying node:20 LTS across all pod instances' },
      { pct: 100, msg: 'Remediation complete — node:20-alpine LTS active on all 3 pods. All 3 critical security violations resolved.' },
    ],
  },
]

module.exports = {
  VULN_SCENARIOS,
  nextSequence,
  getSequence,
  makeCvitId,
  setCurrentScenario,
  getCurrentScenario,
}
