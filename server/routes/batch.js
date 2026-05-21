const express = require('express');
const router = express.Router();

const BATCH_SYSTEMS = {
  controlm: {
    name: 'Control-M', before: 573, after: 229,
    jobs: [
      { id: 'MEMBER-ENROLL-001', name: 'MEMBER-ENROLL-001', status: 'success', startTime: '00:01', endTime: '02:47', duration: 166, sla: 180, risk: 12, system: 'controlm' },
      { id: 'CLAIMS-ADJUD-NIGHTLY', name: 'CLAIMS-ADJUD-NIGHTLY', status: 'failed', startTime: '01:00', endTime: '03:15', duration: 135, sla: 120, risk: 94, system: 'controlm', error: 'Informatica ETL connection timeout to humana-claims-db-01 after 300s at record 1,200,001' },
      { id: 'PHARMACY-SYNC-DAILY', name: 'PHARMACY-SYNC-DAILY', status: 'running', startTime: '03:00', endTime: null, duration: 45, sla: 90, risk: 28, system: 'controlm' },
      { id: 'ELIGIBILITY-BATCH', name: 'ELIGIBILITY-BATCH', status: 'warning', startTime: '02:30', endTime: '04:12', duration: 102, sla: 90, risk: 67, system: 'controlm', warning: 'Duration exceeded SLA threshold by 13 min' },
      { id: 'MEMBER-RISK-SCORE-BATCH', name: 'MEMBER-RISK-SCORE-BATCH', status: 'success', startTime: '04:00', endTime: '05:22', duration: 82, sla: 120, risk: 8, system: 'controlm' },
      { id: 'CLAIMS-RECONCILE-DAILY', name: 'CLAIMS-RECONCILE-DAILY', status: 'pending', startTime: '06:00', endTime: null, duration: 0, sla: 60, risk: 15, system: 'controlm' },
    ],
  },
  mainframe: {
    name: 'Mainframe', before: 606, after: 242,
    jobs: [
      { id: 'MF-CLAIMS-EOD-001', name: 'MF-CLAIMS-EOD-001', status: 'success', startTime: '22:00', endTime: '00:34', duration: 154, sla: 180, risk: 11, system: 'mainframe' },
      { id: 'MF-MEMBER-ARCHIVE', name: 'MF-MEMBER-ARCHIVE', status: 'warning', startTime: '23:30', endTime: '01:45', duration: 135, sla: 120, risk: 58, system: 'mainframe', warning: 'I/O wait elevated — 34% above baseline' },
      { id: 'MF-BENEFITS-CALC', name: 'MF-BENEFITS-CALC', status: 'success', startTime: '01:00', endTime: '02:12', duration: 72, sla: 90, risk: 9, system: 'mainframe' },
      { id: 'MF-PROVIDER-XREF', name: 'MF-PROVIDER-XREF', status: 'failed', startTime: '02:00', endTime: '02:23', duration: 23, sla: 60, risk: 88, system: 'mainframe', error: 'ABEND S0C7 in PRVIDXP module — invalid packed decimal data in PROVIDER-ID field' },
      { id: 'MF-CLAIMS-STATS', name: 'MF-CLAIMS-STATS', status: 'pending', startTime: '04:00', endTime: null, duration: 0, sla: 45, risk: 20, system: 'mainframe' },
    ],
  },
  toad: {
    name: 'Toad/Oracle', before: 289.5, after: 116,
    jobs: [
      { id: 'ORA-CLAIMS-INDEX-REBUILD', name: 'ORA-CLAIMS-INDEX-REBUILD', status: 'success', startTime: '01:00', endTime: '03:15', duration: 135, sla: 180, risk: 14, system: 'toad' },
      { id: 'ORA-STATS-GATHER-NIGHTLY', name: 'ORA-STATS-GATHER-NIGHTLY', status: 'running', startTime: '03:00', endTime: null, duration: 88, sla: 120, risk: 31, system: 'toad' },
      { id: 'ORA-ARCHIVE-LOG-PURGE', name: 'ORA-ARCHIVE-LOG-PURGE', status: 'warning', startTime: '00:30', endTime: '00:58', duration: 28, sla: 20, risk: 62, system: 'toad', warning: 'Tablespace CLAIMS_DATA at 87% capacity' },
    ],
  },
  informatica: {
    name: 'Informatica ETL', before: 508, after: 152,
    jobs: [
      { id: 'INF-ELIGIBILITY-FEED', name: 'INF-ELIGIBILITY-FEED', status: 'failed', startTime: '00:00', endTime: '00:47', duration: 47, sla: 60, risk: 91, system: 'informatica', error: 'Target connection [humana-claims-db-01] unreachable — connection pool exhausted (max: 50)' },
      { id: 'INF-MEMBER-SYNC', name: 'INF-MEMBER-SYNC', status: 'success', startTime: '01:00', endTime: '01:32', duration: 32, sla: 60, risk: 7, system: 'informatica' },
      { id: 'INF-PROVIDER-LOAD', name: 'INF-PROVIDER-LOAD', status: 'warning', startTime: '02:00', endTime: '02:54', duration: 54, sla: 45, risk: 71, system: 'informatica', warning: 'Row rejection rate 3.2% — above 2% threshold' },
      { id: 'INF-CLAIMS-ADJUD-FEED', name: 'INF-CLAIMS-ADJUD-FEED', status: 'pending', startTime: '03:30', endTime: null, duration: 0, sla: 90, risk: 18, system: 'informatica' },
    ],
  },
  nabu: {
    name: 'Nabu Pipeline', before: 304, after: 91,
    jobs: [
      { id: 'NABU-DATA-FLOW-PROD', name: 'NABU-DATA-FLOW-PROD', status: 'success', startTime: '00:15', endTime: '01:04', duration: 49, sla: 60, risk: 10, system: 'nabu' },
      { id: 'NABU-CLAIMS-INGEST', name: 'NABU-CLAIMS-INGEST', status: 'running', startTime: '02:00', endTime: null, duration: 67, sla: 90, risk: 33, system: 'nabu' },
      { id: 'NABU-ANALYTICS-FEED', name: 'NABU-ANALYTICS-FEED', status: 'warning', startTime: '03:00', endTime: '03:42', duration: 42, sla: 30, risk: 74, system: 'nabu', warning: 'Pipeline lag 12 min behind schedule' },
    ],
  },
};

router.get('/jobs', (req, res) => {
  const { system } = req.query;
  if (system && BATCH_SYSTEMS[system]) {
    return res.json({ jobs: BATCH_SYSTEMS[system].jobs, system: BATCH_SYSTEMS[system].name });
  }

  const allJobs = Object.values(BATCH_SYSTEMS).flatMap(s => s.jobs);
  const summary = {
    total: allJobs.length,
    healthy: allJobs.filter(j => j.status === 'success').length,
    warning: allJobs.filter(j => j.status === 'warning').length,
    failed: allJobs.filter(j => j.status === 'failed').length,
    running: allJobs.filter(j => j.status === 'running').length,
    pending: allJobs.filter(j => j.status === 'pending').length,
    slaAtRisk: allJobs.filter(j => j.risk > 60).length,
    savedHoursThisMonth: 1047,
  };
  res.json({ jobs: allJobs, systems: Object.values(BATCH_SYSTEMS).map(s => ({ name: s.name, before: s.before, after: s.after })), summary });
});

router.post('/fail-job', (req, res) => {
  const { jobId } = req.body;
  res.json({ success: true, jobId, message: 'Job marked as failed for demo' });
});

router.post('/remediate', async (req, res) => {
  const { jobId } = req.body;
  await new Promise(r => setTimeout(r, 1200));
  res.json({
    success: true,
    jobId,
    action: 'Auto-remediation triggered',
    steps: [
      'Identified blocking Oracle session (SID 4421) — terminated',
      'Restarted Informatica workflow from checkpoint record 1,200,001',
      'Applied connection pool timeout increase: 600s',
      'Job restarted successfully at 03:47 AM',
    ],
    estimatedCompletion: '04:15 AM',
    slaStatus: 'Within SLA window',
  });
});

module.exports = router;
