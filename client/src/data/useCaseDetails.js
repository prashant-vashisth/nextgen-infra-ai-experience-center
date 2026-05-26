// Detail data for each use case — keyed by UC id
// 9 sections: problemStatement, aiSolution, effortImpact, toolIntegrations,
//             agentCapabilities, preferredUIElements, inputOutput,
//             integrationRequirements, triggerCondition

export const UC_DETAILS = {

  // ── AUTOMATION ENGINEERING ──────────────────────────────────────────────────

  1: {
    problemStatement: "Platform engineers spend 4+ hours per incident manually diagnosing Terraform and Ansible failures — reading cryptic error logs, cross-referencing documentation, and coordinating across teams. Repeated incidents with no knowledge capture mean every engineer starts from scratch.",
    aiSolution: "An AI agent ingests the error log, repo context, and recent change history to produce a root-cause summary, targeted remediation steps, and a draft KB article — all within minutes. It can invoke Terraform plan in read-only mode to validate the proposed fix before a human approves.",
    effortImpact: {
      beforeHrs: 480, afterHrs: 144,
      metrics: [
        { label: "Avg MTTR per incident", before: "4+ hrs", after: "< 90 min" },
        { label: "KB article creation", before: "Manual, rarely done", after: "Auto-drafted per incident" },
        { label: "Re-occurrence rate", before: "High — no capture", after: "Reduced via KB feedback loop" },
      ],
    },
    toolIntegrations: [
      { name: "Terraform Cloud", role: "Reads workspace state, runs plan in speculative mode" },
      { name: "Ansible AWX", role: "Retrieves playbook job logs and inventory" },
      { name: "Temporal", role: "Durable workflow orchestration across long-running steps" },
      { name: "ServiceNow", role: "Creates incident, attaches RCA, updates KB" },
      { name: "GitHub", role: "Reads IaC module diff for contextual analysis" },
    ],
    agentCapabilities: [
      "Parse and interpret Terraform/Ansible error logs with multi-step reasoning",
      "Correlate error with recent git changes and state drift",
      "Propose targeted remediation with code-level specificity",
      "Auto-draft KB article from incident context",
      "Invoke speculative Terraform plan to validate fix",
    ],
    preferredUIElements: [
      "Step-by-step agent trace log with timestamps",
      "Side-by-side diff viewer (before/after IaC)",
      "Collapsible RCA accordion per error type",
      "One-click 'Apply fix' with human approval gate",
    ],
    inputOutput: {
      input: ["Terraform/Ansible error log", "GitHub repo URL + branch", "ServiceNow incident ID", "Workspace/environment name"],
      output: ["Structured RCA report", "Remediation code snippet", "ServiceNow KB article draft", "Terraform plan validation result"],
    },
    integrationRequirements: [
      "Terraform Cloud API token with workspace read access",
      "Ansible AWX token with job-read permission",
      "GitHub token with repo:read scope",
      "ServiceNow service account with incident + KB write permission",
    ],
    triggerCondition: "Terraform apply failure or Ansible playbook error in CI pipeline, or manual submission by an on-call engineer via ServiceNow incident form.",
  },

  2: {
    problemStatement: "CVE backlogs grow faster than teams can manually triage and remediate them. Each CVE requires pulling scan data from Prisma Cloud, cross-referencing the affected service, creating a ServiceNow ticket, and writing a GitHub PR — all manual steps that bottleneck security posture.",
    aiSolution: "An AI agent continuously monitors Prisma Cloud for new CVEs, enriches each finding with CVSS context and affected-service mapping, auto-creates prioritized ServiceNow incidents, and generates a targeted GitHub PR with the version bump or config fix.",
    effortImpact: {
      beforeHrs: 340, afterHrs: 85,
      metrics: [
        { label: "CVE-to-PR time", before: "~3 days", after: "< 2 hrs" },
        { label: "Manual triage steps", before: "6–8 per CVE", after: "1 (human approval)" },
        { label: "Backlog growth", before: "Unchecked", after: "Near-zero queue" },
      ],
    },
    toolIntegrations: [
      { name: "Prisma Cloud", role: "CVE feed and container image scan results" },
      { name: "GitHub", role: "Creates fix branch and pull request" },
      { name: "ServiceNow", role: "Incident creation and SLA tracking" },
    ],
    agentCapabilities: [
      "Ingest and parse Prisma Cloud CVE findings",
      "Map CVEs to affected services and repos",
      "Prioritize based on CVSS score and exploitability",
      "Generate GitHub PR with remediation diff",
      "Track remediation SLA in ServiceNow",
    ],
    preferredUIElements: [
      "CVE priority queue with CVSS severity badges",
      "Affected-service dependency graph",
      "PR creation progress tracker",
      "SLA countdown per critical finding",
    ],
    inputOutput: {
      input: ["Prisma Cloud CVE report", "GitHub org + repo list", "ServiceNow project key"],
      output: ["Prioritized remediation queue", "GitHub PRs per affected service", "ServiceNow incidents with SLA"],
    },
    integrationRequirements: [
      "Prisma Cloud API credentials with scan-read access",
      "GitHub token with PR create permission",
      "ServiceNow service account with incident write access",
    ],
    triggerCondition: "New CVE published with CVSS ≥ 7.0 affecting monitored container images, or weekly scheduled scan of all active repos.",
  },

  3: {
    problemStatement: "Module and tenant onboarding in a multi-cloud IaC environment requires 2 weeks of manual effort: cloning templates, filling configuration files, creating Azure DevOps pipelines, and getting RBAC approvals. Errors during onboarding cause deployment failures weeks later.",
    aiSolution: "A Platform Build Agent takes a declarative onboarding spec and orchestrates the full scaffolding workflow — cloning the correct Terraform module template, parameterizing it for the new tenant, creating the Azure DevOps pipeline, and requesting RBAC via ServiceNow — all verified before handoff.",
    effortImpact: {
      beforeHrs: 180, afterHrs: 22,
      metrics: [
        { label: "Onboarding time", before: "2 weeks", after: "< 4 hrs" },
        { label: "Config errors at deploy", before: "~35%", after: "< 5%" },
        { label: "Engineering hours per onboard", before: "~18 hrs", after: "2 hrs review" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub", role: "Module template cloning and parameterization" },
      { name: "Terraform", role: "Module validation and plan preview" },
      { name: "Azure DevOps", role: "Pipeline creation and RBAC provisioning" },
    ],
    agentCapabilities: [
      "Parse onboarding spec and map to correct module template",
      "Scaffold Terraform config with tenant-specific parameters",
      "Create Azure DevOps pipeline and link to repo",
      "Validate module plan before handoff",
      "Auto-raise RBAC request in ServiceNow",
    ],
    preferredUIElements: [
      "Guided onboarding form with real-time validation",
      "Step-by-step scaffolding progress tracker",
      "Module preview pane with parameterized config",
      "Approval gate with diff summary",
    ],
    inputOutput: {
      input: ["Tenant onboarding spec (YAML/JSON)", "GitHub org + repo target", "Azure subscription ID"],
      output: ["Scaffolded IaC repo", "Azure DevOps pipeline", "ServiceNow RBAC ticket"],
    },
    integrationRequirements: [
      "GitHub token with repo:create and contents:write",
      "Azure DevOps PAT with pipeline:create",
      "ServiceNow service account with RBAC request capability",
    ],
    triggerCondition: "New tenant onboarding request submitted via ServiceNow catalog or Azure DevOps intake form.",
  },

  4: {
    problemStatement: "Developers lose significant focus time context-switching into bug triage — reading issue threads, reproducing bugs, identifying the root cause in code, and writing the fix. SonarQube reports sit unremediated for weeks because no one owns the queue.",
    aiSolution: "An AI Code Administration agent monitors the bug queue and SonarQube report, clusters related issues, locates the affected code via GitHub semantic search, proposes a minimal diff fix, and opens a PR with a test plan. Engineers review and merge — no context-switching required.",
    effortImpact: {
      beforeHrs: 220, afterHrs: 66,
      metrics: [
        { label: "Time to first fix PR", before: "2–3 days", after: "< 2 hrs" },
        { label: "SonarQube backlog (items)", before: "Growing", after: "Maintained near-zero" },
        { label: "Developer context switches", before: "High", after: "Approval-only" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub", role: "Issue triage, code search, PR creation" },
      { name: "SonarQube", role: "Static analysis and issue severity feed" },
      { name: "Claude Opus 4", role: "Code understanding and patch generation" },
    ],
    agentCapabilities: [
      "Cluster related GitHub issues by root cause",
      "Locate affected code lines via semantic search",
      "Generate minimal, targeted code fix",
      "Write unit test for the fix",
      "Open PR with structured description and test plan",
    ],
    preferredUIElements: [
      "Bug queue with AI-assigned severity and cluster grouping",
      "Side-by-side code diff viewer",
      "AI confidence score per proposed fix",
      "One-click PR creation from review panel",
    ],
    inputOutput: {
      input: ["GitHub issue list", "SonarQube project scan results", "Repo codebase"],
      output: ["Grouped bug clusters", "Code fix PRs", "Test stubs"],
    },
    integrationRequirements: [
      "GitHub token with issues:read and PR:create",
      "SonarQube API token with project:read",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "New GitHub issue labeled 'bug' or SonarQube finding with severity ≥ Major, or daily scheduled triage run.",
  },

  5: {
    problemStatement: "Exposed secrets and credentials in source code repositories create critical security vulnerabilities. Detection is reactive — secrets are often found weeks after exposure. Manual remediation requires rotating credentials, purging git history, and updating vault references across dozens of repos.",
    aiSolution: "A Compliance Agent continuously scans all repositories using secret detection patterns, immediately flags exposures, auto-rotates credentials via Azure Key Vault or HashiCorp Vault, rewrites git history to remove the secret, and creates a ServiceNow incident with full forensic detail.",
    effortImpact: {
      beforeHrs: 160, afterHrs: 32,
      metrics: [
        { label: "Detection-to-remediation time", before: "Days to weeks", after: "< 30 min" },
        { label: "Manual steps per exposure", before: "8–12 steps", after: "1 (approve rotation)" },
        { label: "Re-exposure rate", before: "High (pattern repeats)", after: "Near-zero with pre-commit hooks" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub", role: "Secret scanning, git history rewrite" },
      { name: "HashiCorp Vault", role: "Credential storage and dynamic secrets" },
      { name: "Azure Key Vault", role: "Managed secret rotation" },
    ],
    agentCapabilities: [
      "Scan all repos for exposed secrets using pattern and entropy analysis",
      "Classify secret type (API key, certificate, connection string)",
      "Auto-rotate credentials in vault",
      "Rewrite git history and force-push clean branch",
      "Create ServiceNow incident with CVSS risk rating",
    ],
    preferredUIElements: [
      "Real-time repo scan dashboard with findings heatmap",
      "Secret type classification with risk score",
      "Rotation workflow with approval gate",
      "Git history diff showing purged commits",
    ],
    inputOutput: {
      input: ["GitHub org repo list", "Vault configuration", "ServiceNow project key"],
      output: ["Secret exposure report", "Rotated credentials", "Clean git history", "ServiceNow incident"],
    },
    integrationRequirements: [
      "GitHub token with admin:org and contents:write",
      "HashiCorp Vault token with secret:write",
      "Azure Key Vault identity with Key Vault Secrets Officer role",
    ],
    triggerCondition: "New commit push to any monitored repository, or weekly full-org sweep scan.",
  },

  6: {
    problemStatement: "Cloud subscription onboarding requires a 3-day manual checklist of 12+ governance compliance checks spanning infrastructure design, security, reliability, and cost — often completed inconsistently, with failures discovered in production weeks later.",
    aiSolution: "An AI Validation Agent reads real Terraform configuration from GitHub, runs all 12 governance checks programmatically, grades the subscription A–E, and generates a targeted AI remediation plan for every failed check — turning a 3-day checklist into a 15-minute automated audit.",
    effortImpact: {
      beforeHrs: 120, afterHrs: 18,
      metrics: [
        { label: "Onboarding checklist time", before: "3 days", after: "15 min" },
        { label: "Compliance check consistency", before: "Variable (human error)", after: "100% coverage every run" },
        { label: "Failures found in prod", before: "Common", after: "Blocked at gate" },
      ],
    },
    toolIntegrations: [
      { name: "Azure ARM", role: "Subscription policy and resource validation" },
      { name: "GCP APIs", role: "Project configuration and IAM validation" },
      { name: "Terraform", role: "IaC source-of-truth for compliance checks" },
      { name: "GitHub", role: "Reads Terraform modules from repo" },
      { name: "Claude Opus 4", role: "Generates remediation guidance for failed checks" },
    ],
    agentCapabilities: [
      "Read and parse Terraform HCL from GitHub",
      "Run 12 governance checks across 6 categories (Governance, Security, Reliability, Efficiency, Observability, Compliance)",
      "Grade subscription A–E based on weighted pass/fail",
      "Generate AI remediation plan per failed check",
      "Produce audit-ready compliance report",
    ],
    preferredUIElements: [
      "Grade display (A–E) with color-coded severity",
      "12-check results list with pass/fail icons",
      "Category-tagged check results",
      "Collapsible AI remediation panel per failure",
      "Terraform source viewer",
    ],
    inputOutput: {
      input: ["GitHub repo containing Terraform", "Subscription name", "Cloud provider (Azure/GCP)"],
      output: ["Compliance grade (A–E)", "12-check pass/fail report", "AI remediation plan", "Terraform diff suggestions"],
    },
    integrationRequirements: [
      "GitHub token with repo:read",
      "Azure ARM API credentials or GCP service account",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "New cloud subscription onboarding request, or quarterly re-validation of existing subscriptions.",
  },

  7: {
    problemStatement: "IaC modules in production contain anti-patterns that increase cloud spend — oversized VMs, unoptimized storage tiers, unused reserved instances. These inefficiencies accumulate silently and show up only on the monthly cost bill.",
    aiSolution: "An AI Code Optimization agent analyzes Terraform modules against Azure Advisor cost recommendations, identifies inefficient resource configurations, and produces a prioritized optimization PR with projected savings per change.",
    effortImpact: {
      beforeHrs: 200, afterHrs: 50,
      metrics: [
        { label: "Cloud spend waste identified", before: "Found ad hoc", after: "Systematic per-module" },
        { label: "Optimization PR creation time", before: "3–5 days", after: "< 2 hrs" },
        { label: "Projected savings", before: "Unknown until bill", after: "Forecasted in PR" },
      ],
    },
    toolIntegrations: [
      { name: "Azure Advisor", role: "Cost and performance recommendations" },
      { name: "Terraform", role: "IaC module analysis and rewrite" },
      { name: "GitHub", role: "PR creation with optimization diff" },
    ],
    agentCapabilities: [
      "Parse Terraform modules for resource sizing anti-patterns",
      "Cross-reference Azure Advisor recommendations",
      "Calculate projected savings per optimization",
      "Generate Terraform diff with explanation",
      "Prioritize changes by cost impact",
    ],
    preferredUIElements: [
      "Cost optimization opportunity list with savings forecast",
      "Before/after Terraform diff per resource",
      "Projected monthly savings summary",
      "Priority-sorted recommendation queue",
    ],
    inputOutput: {
      input: ["Terraform module repo", "Azure subscription ID", "Azure Advisor API access"],
      output: ["Optimization report", "GitHub PR with Terraform diff", "Projected savings summary"],
    },
    integrationRequirements: [
      "Azure Advisor API reader role",
      "GitHub token with PR:create",
      "Terraform state read access",
    ],
    triggerCondition: "Monthly cost review trigger, or new Azure Advisor recommendation with potential saving > $500/month.",
  },

  8: {
    problemStatement: "Creating new Terraform, Ansible, or Kubernetes configuration templates requires 8 hours of senior engineer time per template — gathering requirements, writing boilerplate, applying organizational standards, and documenting usage. Templates become inconsistent across teams.",
    aiSolution: "A Scaffolding Agent takes a structured input spec, generates a standards-compliant template using the org's approved module library, validates it against policy, adds documentation, and commits it to a dedicated templates repo for immediate reuse.",
    effortImpact: {
      beforeHrs: 96, afterHrs: 12,
      metrics: [
        { label: "Template creation time", before: "8 hrs", after: "< 30 min" },
        { label: "Standards compliance", before: "Inconsistent", after: "Enforced by generator" },
        { label: "Template reuse rate", before: "Low", after: "High (centralized repo)" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub", role: "Template storage and versioning" },
      { name: "Terraform", role: "Module pattern library" },
      { name: "Ansible", role: "Playbook scaffolding patterns" },
    ],
    agentCapabilities: [
      "Parse natural language spec to template requirements",
      "Select appropriate base module from org library",
      "Parameterize template with org standards",
      "Auto-generate README and usage examples",
      "Validate template against policy guardrails",
    ],
    preferredUIElements: [
      "Template type selector (Terraform/Ansible/K8s)",
      "Requirement input form with auto-complete",
      "Generated template preview with syntax highlighting",
      "Standards compliance checklist",
    ],
    inputOutput: {
      input: ["Template type", "Resource requirements spec", "Target environment (dev/prod)"],
      output: ["Parameterized configuration template", "README with usage examples", "GitHub commit to templates repo"],
    },
    integrationRequirements: [
      "GitHub token with repo:write for templates repo",
      "Org module library API access",
      "Policy-as-code engine (OPA or Sentinel)",
    ],
    triggerCondition: "Engineer submits new template request via ServiceNow catalog or internal developer portal.",
  },

  9: {
    problemStatement: "Terraform pipeline failures in the Agentic Pipeline Governor (APG) produce cryptic error messages requiring expert-level knowledge to interpret. L1 engineers escalate every failure to senior staff, who must correlate logs, review recent changes, and write a runbook — a 4-hour process per incident.",
    aiSolution: "The APG Workflow Assist Agent intercepts pipeline failures, classifies errors (auth, quota, state lock, provider, config, network), performs RCA against the pipeline run log and GitHub commit history, produces a plain-English A–E grade with remediation steps, and advises how to improve the grade.",
    effortImpact: {
      beforeHrs: 240, afterHrs: 48,
      metrics: [
        { label: "L1-to-expert escalation rate", before: "~90%", after: "< 20%" },
        { label: "MTTR per pipeline failure", before: "4 hrs", after: "45 min" },
        { label: "Runbook coverage", before: "< 30%", after: "> 95% auto-generated" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub Actions", role: "Pipeline execution logs and re-trigger" },
      { name: "APG Engine", role: "Workflow context and failure code lookup" },
      { name: "ServiceNow KB", role: "Knowledge base write for new runbooks" },
      { name: "Claude Opus 4", role: "Error classification, RCA reasoning, and grade explanation" },
    ],
    agentCapabilities: [
      "Classify pipeline errors: AUTH, QUOTA, STATE_LOCK, PROVIDER, CONFIG, NETWORK",
      "Perform root cause analysis against pipeline run data",
      "Explain APG grade scores (0–100, A–E scale) in plain English",
      "Advise how to improve grade — split PRs, reduce delete score, add lifecycle guards",
      "Correlate failure with recent GitHub commits",
      "Generate plain-English remediation runbook",
    ],
    preferredUIElements: [
      "Pipeline run list with A–E grade badges and 0–100 score chips",
      "Grade legend panel (A=no risk → E=critical)",
      "Score breakdown (createScore, deleteScore, updateScore, policyScore)",
      "Error classification panel with remediation steps",
      "Streaming AI chat for RCA and grade improvement advice",
    ],
    inputOutput: {
      input: ["APG pipeline run ID", "GitHub Actions log URL", "ServiceNow incident ID"],
      output: ["Error classification", "A–E grade with score breakdown", "RCA report", "Grade improvement recommendations"],
    },
    integrationRequirements: [
      "GitHub token with actions:read and workflow:write",
      "APG Engine API credentials",
      "ServiceNow KB write permission",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "APG pipeline failure webhook from GitHub Actions, or manual submission of a failing run ID by an on-call engineer.",
  },

  10: {
    problemStatement: "Terraform state corruption and unexpected plan failures require deep expertise to debug — decoding state files, identifying drift, finding which resource change caused the failure. A single incident can block the entire team for hours.",
    aiSolution: "A Terraform Debug Agent reads the state file, plan output, and recent git changes, uses AI reasoning to identify the drift source, and proposes a targeted fix — either a resource import, state manipulation, or code change — with exact CLI commands.",
    effortImpact: {
      beforeHrs: 180, afterHrs: 36,
      metrics: [
        { label: "Avg debug time per incident", before: "3+ hrs", after: "< 45 min" },
        { label: "Team blockage incidents", before: "Frequent", after: "Rare" },
        { label: "Escalations to Terraform specialists", before: "High", after: "< 10%" },
      ],
    },
    toolIntegrations: [
      { name: "Terraform Cloud", role: "State file access and workspace management" },
      { name: "GitHub", role: "IaC diff and recent change context" },
      { name: "Splunk", role: "Infrastructure change event correlation" },
    ],
    agentCapabilities: [
      "Parse and interpret Terraform state files",
      "Identify drift between desired and actual state",
      "Correlate failure with recent IaC or infrastructure changes",
      "Propose state fix with exact CLI commands",
      "Generate safe recovery plan with rollback option",
    ],
    preferredUIElements: [
      "State drift visualizer (desired vs actual)",
      "Change timeline correlated with failure",
      "Proposed fix with copy-paste CLI commands",
      "Rollback option with risk assessment",
    ],
    inputOutput: {
      input: ["Terraform workspace ID", "Plan/apply error log", "GitHub repo + branch"],
      output: ["Drift analysis report", "Fix CLI commands", "Recovery plan", "Splunk event correlation"],
    },
    integrationRequirements: [
      "Terraform Cloud API token with workspace:read + state:read",
      "GitHub token with repo:read",
      "Splunk API token for event query",
    ],
    triggerCondition: "Terraform plan or apply failure in any workspace, or engineer manual submission of workspace ID for debugging.",
  },

  11: {
    problemStatement: "Test result analysis consumes 20% of developer sprint time — developers manually scan test output to find failures, correlate with recent code changes, and decide whether failures are flaky or genuine regressions. CI pipelines are often ignored when they're too noisy.",
    aiSolution: "A Test Validation Agent automatically processes CI test results, classifies failures as flaky or regressive using historical pattern analysis, maps each genuine failure to the likely code change that caused it, and generates a prioritized fix queue with confidence scores.",
    effortImpact: {
      beforeHrs: 140, afterHrs: 28,
      metrics: [
        { label: "Time to classify test failures", before: "2–4 hrs/sprint", after: "< 15 min" },
        { label: "Flaky test false-positive rate", before: "~40%", after: "< 10% after filtering" },
        { label: "Developer focus time saved", before: "20% sprint overhead", after: "< 5%" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub Actions", role: "CI test run results and logs" },
      { name: "pytest", role: "Test result XML parsing and history" },
      { name: "SonarQube", role: "Code quality gate correlation" },
    ],
    agentCapabilities: [
      "Parse test result reports (JUnit XML, pytest output)",
      "Classify failures as flaky vs regression using history",
      "Map regression to causative commit",
      "Generate fix priority queue",
      "Recommend flaky test quarantine list",
    ],
    preferredUIElements: [
      "Test result dashboard with flaky/regression classification",
      "Failure-to-commit correlation view",
      "Fix priority queue with confidence score",
      "Trend chart of test health over sprints",
    ],
    inputOutput: {
      input: ["GitHub Actions run ID", "Test result XML", "Recent commit list"],
      output: ["Classified failure report", "Causative commit map", "Fix priority queue", "Flaky test list"],
    },
    integrationRequirements: [
      "GitHub Actions API with workflow:read",
      "SonarQube API with project:read",
      "Historical test result storage (S3 or GitHub artifact)",
    ],
    triggerCondition: "CI pipeline completes with test failures, or scheduled weekly test health review.",
  },

  12: {
    problemStatement: "API handler failures cause cascading outages — a misconfigured Kong route or broken handler silently degrades downstream services for minutes before detection. Manual diagnosis requires correlating Kong logs, APM traces, and ServiceNow tickets across multiple tools.",
    aiSolution: "An API Operations Agent monitors Kong and Dynatrace for handler anomalies, automatically correlates failures with recent deployments, identifies the root-cause handler, and generates a targeted fix with rollback instructions — all within one unified workflow.",
    effortImpact: {
      beforeHrs: 160, afterHrs: 40,
      metrics: [
        { label: "Detection-to-diagnosis time", before: "45 min avg", after: "< 5 min" },
        { label: "Cascading service impact time", before: "Minutes of exposure", after: "Blocked at detection" },
        { label: "Manual correlation steps", before: "4–6 per incident", after: "Automated" },
      ],
    },
    toolIntegrations: [
      { name: "Kong", role: "API gateway log and route configuration" },
      { name: "Dynatrace", role: "APM trace and anomaly detection" },
      { name: "ServiceNow", role: "Incident creation and routing" },
      { name: "APIGEE", role: "API lifecycle management correlation" },
    ],
    agentCapabilities: [
      "Monitor Kong gateway for handler errors in real-time",
      "Correlate API failures with Dynatrace traces",
      "Map failure to causative deployment or config change",
      "Generate fix recommendation with rollback option",
      "Auto-create ServiceNow incident with diagnostic payload",
    ],
    preferredUIElements: [
      "API health dashboard with real-time error rate",
      "Failure-to-deployment timeline correlation",
      "Affected downstream services dependency map",
      "Fix recommendation with one-click rollback",
    ],
    inputOutput: {
      input: ["Kong gateway ID", "Dynatrace service name", "Time window of failure"],
      output: ["Root cause report", "Affected handler list", "Fix recommendation", "ServiceNow incident"],
    },
    integrationRequirements: [
      "Kong Admin API credentials",
      "Dynatrace API token with metrics:read and traces:read",
      "ServiceNow service account with incident:write",
    ],
    triggerCondition: "Dynatrace anomaly alert on API error rate, or Kong gateway 5xx rate threshold exceeded.",
  },

  13: {
    problemStatement: "Outdated dependencies with known CVEs accumulate silently across repositories. Developers rarely audit package.json or requirements.txt proactively, and when vulnerabilities are discovered via audit tooling, manual remediation requires researching safe upgrade paths for dozens of packages.",
    aiSolution: "An AI Dependency Risk Agent scans real GitHub repos for vulnerable packages using the GitHub Advisory Database, maps each CVE to a safe upgrade version, generates an AI risk analysis narrative, and creates a remediation PR with the exact version bumps — no manual research required.",
    effortImpact: {
      beforeHrs: 200, afterHrs: 50,
      metrics: [
        { label: "CVE discovery time", before: "Ad hoc / months late", after: "On every commit" },
        { label: "Manual research per CVE", before: "30–60 min", after: "Eliminated" },
        { label: "Remediation PR creation", before: "1–2 days", after: "< 10 min" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub Advisory Database", role: "CVE lookup and affected version ranges" },
      { name: "GitHub", role: "Repo scan, PR creation, branch management" },
      { name: "Claude Opus 4", role: "Risk narrative generation and upgrade recommendation" },
      { name: "Snyk", role: "Complementary vulnerability intelligence" },
    ],
    agentCapabilities: [
      "Scan package.json and requirements.txt for vulnerable versions",
      "Map CVE IDs to CVSS scores and safe upgrade paths",
      "Generate AI risk analysis with upgrade rationale",
      "Create GitHub PR with exact version bump diff",
      "Prioritize by severity (critical → high → medium)",
    ],
    preferredUIElements: [
      "Vulnerable packages table with CVE IDs and severity badges",
      "Package-level drill-down with CVSS detail",
      "AI risk narrative panel",
      "One-click PR creation button",
      "Scan progress log",
    ],
    inputOutput: {
      input: ["GitHub repo name", "Package manifest file (package.json/requirements.txt)"],
      output: ["Vulnerability report with CVSS scores", "Safe upgrade version map", "AI risk analysis", "GitHub PR with fix"],
    },
    integrationRequirements: [
      "GitHub token with repo:read and PR:create",
      "GitHub Advisory Database API access",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "New commit to a monitored repo, or on-demand scan triggered by a developer or security engineer.",
  },

  14: {
    problemStatement: "Manual capacity forecasting based on spreadsheets and ad-hoc metric reviews leads to chronic over-provisioning (35%+ waste) and occasional under-provisioning causing performance incidents. There is no closed-loop feedback between usage trends and provisioning decisions.",
    aiSolution: "A Capacity Insight Agent continuously analyzes Azure Monitor metrics and Dynatrace traces to build usage trend models, generates right-sizing recommendations per resource, forecasts demand 90 days out, and triggers provisioning adjustments through Terraform with financial impact estimates.",
    effortImpact: {
      beforeHrs: 120, afterHrs: 24,
      metrics: [
        { label: "Over-provisioning rate", before: "~35%", after: "< 10%" },
        { label: "Capacity review cycle", before: "Quarterly manual", after: "Continuous auto" },
        { label: "Forecast accuracy", before: "±30%", after: "±8% (ML model)" },
      ],
    },
    toolIntegrations: [
      { name: "Azure Monitor", role: "CPU, memory, network utilization metrics" },
      { name: "Dynatrace", role: "Application-level performance traces" },
      { name: "Power BI", role: "Capacity trend reporting dashboard" },
      { name: "Terraform", role: "IaC updates for right-sizing" },
    ],
    agentCapabilities: [
      "Analyze 90-day usage trends per resource type",
      "Detect seasonal demand patterns",
      "Generate right-sizing recommendations with savings estimate",
      "Forecast 90-day demand with confidence intervals",
      "Produce Terraform diff for provisioning adjustment",
    ],
    preferredUIElements: [
      "Resource utilization heatmap across subscriptions",
      "Right-sizing recommendation list with savings per resource",
      "90-day demand forecast chart",
      "Terraform diff preview with cost impact",
    ],
    inputOutput: {
      input: ["Azure subscription IDs", "Resource tags for scope", "Historical metric window (90 days)"],
      output: ["Right-sizing recommendation report", "90-day demand forecast", "Terraform diff", "Projected cost savings"],
    },
    integrationRequirements: [
      "Azure Monitor reader role on subscription",
      "Dynatrace API token with metrics:read",
      "Terraform Cloud workspace access for plan preview",
    ],
    triggerCondition: "Weekly scheduled capacity review, or alert when resource utilization drops below 20% for 7+ days.",
  },

  15: {
    problemStatement: "L1 cloud provisioning requests — adding a resource group, creating a storage account, assigning a role — require senior engineer involvement because the request forms are too technical for L1. This creates backlogs, missed SLAs, and senior engineer time wasted on routine tasks.",
    aiSolution: "A Conversational Support Agent on Microsoft Teams accepts natural-language provisioning requests, clarifies ambiguous intent via dialogue, validates the request against org policies, and executes it via Azure ARM — routing to a senior engineer only if policy guardrails are triggered.",
    effortImpact: {
      beforeHrs: 300, afterHrs: 60,
      metrics: [
        { label: "Provisioning request SLA", before: "3–5 days (senior backlog)", after: "< 2 hrs (automated)" },
        { label: "L1 self-serve rate", before: "< 10%", after: "> 80%" },
        { label: "Senior engineer involvement", before: "Required for all", after: "Only policy exceptions" },
      ],
    },
    toolIntegrations: [
      { name: "MS Teams", role: "Conversational interface for provisioning requests" },
      { name: "ServiceNow", role: "Request logging and SLA tracking" },
      { name: "Azure ARM", role: "Resource provisioning execution" },
    ],
    agentCapabilities: [
      "Parse natural-language provisioning requests",
      "Clarify ambiguous intent through multi-turn dialogue",
      "Validate request against org policies (naming, tagging, RBAC)",
      "Execute provisioning via Azure ARM API",
      "Escalate to senior engineer on policy violation",
    ],
    preferredUIElements: [
      "Teams bot chat interface with guided prompts",
      "Request summary confirmation before execution",
      "Real-time provisioning status updates in Teams",
      "ServiceNow ticket link in conversation",
    ],
    inputOutput: {
      input: ["Natural-language Teams message", "User identity and team context"],
      output: ["Provisioned Azure resource", "ServiceNow request ticket", "Confirmation message in Teams"],
    },
    integrationRequirements: [
      "MS Teams bot registration and app manifest",
      "Azure ARM API with Contributor role on target scope",
      "ServiceNow service account for request logging",
    ],
    triggerCondition: "Engineer or L1 staff sends a provisioning request message to the Teams bot.",
  },

  // ── INFRA OPS / ESC ─────────────────────────────────────────────────────────

  16: {
    problemStatement: "Patching container images across 200+ services requires coordinating across teams to update Dockerfiles, rebuild images, push to ACR, and restart pods — a process that takes weeks and leaves services exposed during the patching window.",
    aiSolution: "A Container Lifecycle Agent detects base image updates, automatically generates Dockerfile patches for all dependent services, triggers ACR rebuild pipelines, validates the updated images with Twistlock, and orchestrates a rolling AKS pod restart with health verification.",
    effortImpact: {
      beforeHrs: 400, afterHrs: 80,
      metrics: [
        { label: "Patch cycle time (200 services)", before: "4–6 weeks", after: "< 3 days" },
        { label: "Manual Dockerfile edits", before: "200+", after: "0 (automated)" },
        { label: "Vulnerability exposure window", before: "Weeks", after: "Hours" },
      ],
    },
    toolIntegrations: [
      { name: "AKS", role: "Rolling pod restart and health verification" },
      { name: "ACR", role: "Container image registry and build pipeline" },
      { name: "Twistlock", role: "Post-patch vulnerability scan validation" },
    ],
    agentCapabilities: [
      "Detect upstream base image version changes",
      "Auto-generate Dockerfile patches for all dependent services",
      "Trigger ACR rebuild and tag new image",
      "Run Twistlock scan on patched image",
      "Execute rolling AKS restart with health gate",
    ],
    preferredUIElements: [
      "Service dependency graph with patch status",
      "Patch progress tracker across 200+ services",
      "Twistlock scan result per image",
      "Pod health verification dashboard",
    ],
    inputOutput: {
      input: ["Base image update notification", "Service registry with Dockerfile locations", "AKS cluster credentials"],
      output: ["Patched Dockerfiles", "ACR images", "Rolling restart completion report", "Twistlock compliance report"],
    },
    integrationRequirements: [
      "AKS kubeconfig with deployment:update permission",
      "ACR registry admin or contributor role",
      "Twistlock API key for scan results",
    ],
    triggerCondition: "Base image version update published to ACR or Docker Hub, or monthly scheduled patching window.",
  },

  17: {
    problemStatement: "Architecture and design documents are outdated within weeks of a system change. Engineers waste hours searching Confluence for docs that no longer reflect reality, or skip documentation altogether. Onboarding new team members takes 2–3x longer as a result.",
    aiSolution: "A Document Generation Agent reads live system state — GitHub repos, Terraform, Kubernetes manifests, and Dynatrace service maps — and auto-generates architecture docs in Confluence with accurate service topology diagrams, dependency maps, and deployment procedures.",
    effortImpact: {
      beforeHrs: 200, afterHrs: 20,
      metrics: [
        { label: "Doc accuracy at publish", before: "~70% (quickly degrades)", after: "> 95% (live-sourced)" },
        { label: "New engineer onboarding time", before: "3 weeks", after: "1 week" },
        { label: "Docs creation effort", before: "2 days per system", after: "< 2 hrs" },
      ],
    },
    toolIntegrations: [
      { name: "Confluence", role: "Documentation publication and versioning" },
      { name: "GitHub", role: "Source code and IaC structure" },
      { name: "Claude Opus 4", role: "Natural language generation for doc sections" },
      { name: "Dynatrace", role: "Live service topology and dependency maps" },
    ],
    agentCapabilities: [
      "Read live system state from GitHub, Terraform, K8s manifests",
      "Extract service topology and dependency graph",
      "Generate architecture overview with AI narrative",
      "Publish formatted Confluence page with diagrams",
      "Auto-update docs when system state changes",
    ],
    preferredUIElements: [
      "System selector with live-state indicator",
      "Doc preview pane before Confluence publish",
      "Topology diagram auto-generator",
      "Change diff view (what changed since last doc)",
    ],
    inputOutput: {
      input: ["GitHub repo list", "AKS namespace", "Confluence space key"],
      output: ["Confluence architecture page", "Service topology diagram", "Deployment procedure doc"],
    },
    integrationRequirements: [
      "Confluence API token with space:write",
      "GitHub token with repo:read",
      "Dynatrace API token with topology:read",
    ],
    triggerCondition: "Infrastructure change detected (new deployment, Terraform apply, service added), or weekly scheduled refresh.",
  },

  18: {
    problemStatement: "QA cycles take 3 weeks with only 47% regression test coverage — manual test case creation, slow execution, and no prioritization mean high-risk changes slip through while low-risk changes are over-tested.",
    aiSolution: "An AI QA Validation Agent analyzes code changes to identify risk-weighted test targets, auto-generates new test cases for uncovered paths, executes the regression suite in parallel via Azure DevOps, and flags only the anomalous results for engineer review.",
    effortImpact: {
      beforeHrs: 480, afterHrs: 96,
      metrics: [
        { label: "QA cycle time", before: "3 weeks", after: "5 days" },
        { label: "Regression coverage", before: "47%", after: "> 85%" },
        { label: "False-positive escalations", before: "High", after: "Low (AI-filtered)" },
      ],
    },
    toolIntegrations: [
      { name: "Selenium", role: "UI test execution and browser automation" },
      { name: "Postman", role: "API test collection execution" },
      { name: "Azure DevOps", role: "Pipeline orchestration and test result storage" },
    ],
    agentCapabilities: [
      "Analyze code diff to identify changed execution paths",
      "Risk-weight test targets by change impact",
      "Auto-generate new test cases for uncovered paths",
      "Execute regression suite in parallel",
      "Filter and escalate only genuine anomalies",
    ],
    preferredUIElements: [
      "Code diff with risk-weighted test coverage overlay",
      "Test execution progress across parallel runners",
      "Anomaly-only result queue",
      "Coverage improvement trend chart",
    ],
    inputOutput: {
      input: ["GitHub PR diff", "Existing test suite location", "Azure DevOps project key"],
      output: ["Risk-weighted test plan", "New auto-generated test cases", "Filtered anomaly report", "Coverage delta"],
    },
    integrationRequirements: [
      "Azure DevOps PAT with pipeline:run",
      "GitHub token with PR:read",
      "Selenium grid or BrowserStack credentials",
    ],
    triggerCondition: "New pull request opened in monitored repo, or release branch cut in Azure DevOps.",
  },

  19: {
    problemStatement: "CVIT (Container Vulnerability and Image Tracking) backlog grows at 150 items per month with a 40-day average remediation time. Manual triage, Qualys scanning, ServiceNow ticket creation, and Ansible patching are all disjointed steps handled by different teams.",
    aiSolution: "A CVIT Remediation Agent orchestrates the entire vulnerability lifecycle: Qualys scan ingestion → AI triage and prioritization → ServiceNow ticket creation → Ansible remediation playbook execution → post-patch validation — all in a single automated workflow.",
    effortImpact: {
      beforeHrs: 600, afterHrs: 120,
      metrics: [
        { label: "Avg remediation cycle", before: "40 days", after: "< 5 days" },
        { label: "Backlog growth rate", before: "+150/month net", after: "Near-zero (keep-up)" },
        { label: "Manual handoffs per item", before: "5–7", after: "1 (approval gate)" },
      ],
    },
    toolIntegrations: [
      { name: "Qualys", role: "Vulnerability scan data and CVSS scores" },
      { name: "ServiceNow", role: "Ticket lifecycle and SLA management" },
      { name: "Ansible", role: "Automated patching playbook execution" },
    ],
    agentCapabilities: [
      "Ingest and parse Qualys scan results",
      "AI triage with CVSS scoring and exploitability context",
      "Auto-create ServiceNow incidents with severity",
      "Select and execute appropriate Ansible playbook",
      "Post-patch Qualys re-scan and ticket closure",
    ],
    preferredUIElements: [
      "CVIT backlog dashboard with severity breakdown",
      "Triage queue with AI priority score",
      "Ansible playbook execution log",
      "SLA compliance tracker",
    ],
    inputOutput: {
      input: ["Qualys scan ID", "Target host list", "ServiceNow project key"],
      output: ["Triaged vulnerability list", "ServiceNow incidents", "Ansible playbook execution logs", "Post-patch report"],
    },
    integrationRequirements: [
      "Qualys API subscription with scan:read",
      "ServiceNow ITSM write access",
      "Ansible AWX token with job:run",
    ],
    triggerCondition: "Qualys scan completion event, or nightly scheduled sweep of all registered hosts.",
  },

  20: {
    problemStatement: "Middleware upgrades (WebLogic, JBoss, IIS, etc.) require 6-week manual change windows — scheduling downtime, coordinating backup windows, testing compatibility, and performing rollbacks. A single failed upgrade can cause multi-hour outages.",
    aiSolution: "A Middleware Upgrade Agent performs pre-upgrade compatibility analysis, generates a validated upgrade plan with rollback checkpoints, executes the upgrade via Ansible during a pre-approved change window, monitors health via Dynatrace, and auto-rolls back on health check failure.",
    effortImpact: {
      beforeHrs: 720, afterHrs: 144,
      metrics: [
        { label: "Upgrade cycle time", before: "6 weeks", after: "1 week" },
        { label: "Manual coordination steps", before: "15–20", after: "3 (plan review, approve, verify)" },
        { label: "Failed upgrade rollback time", before: "2–4 hrs manual", after: "< 15 min auto" },
      ],
    },
    toolIntegrations: [
      { name: "Ansible", role: "Upgrade playbook execution and rollback" },
      { name: "ServiceNow", role: "Change request and maintenance window management" },
      { name: "Dynatrace", role: "Health monitoring during and post upgrade" },
    ],
    agentCapabilities: [
      "Analyze middleware compatibility matrix before upgrade",
      "Generate step-by-step upgrade plan with rollback checkpoints",
      "Execute Ansible upgrade playbook within change window",
      "Monitor Dynatrace for anomalies during upgrade",
      "Auto-trigger rollback on health threshold breach",
    ],
    preferredUIElements: [
      "Upgrade plan viewer with step dependencies",
      "Real-time execution log with health gauge",
      "Rollback checkpoint indicators",
      "Post-upgrade health dashboard",
    ],
    inputOutput: {
      input: ["Middleware type and version", "Target host list", "ServiceNow change request ID"],
      output: ["Compatibility analysis report", "Upgrade execution log", "Post-upgrade health report", "Rollback status"],
    },
    integrationRequirements: [
      "Ansible AWX credentials with job:run on target hosts",
      "ServiceNow API with change:write",
      "Dynatrace API token with events:read and metrics:read",
    ],
    triggerCondition: "ServiceNow change request approved for middleware upgrade, or vendor EOL notification for current version.",
  },

  21: {
    problemStatement: "OS image updates and CIS hardening across 3,000+ VMs take 4 months manually — each VM requires downtime scheduling, Packer image build, Ansible hardening script, and CIS benchmark validation. Security posture drifts significantly during the long patching window.",
    aiSolution: "An AI OS Hardening Agent uses Packer to build a new hardened golden image meeting CIS benchmarks, validates it in a staging environment, and orchestrates a rolling VM update across the fleet using Azure VM extensions — with Ansible for in-place hardening where image replacement isn't possible.",
    effortImpact: {
      beforeHrs: 960, afterHrs: 192,
      metrics: [
        { label: "Fleet patching cycle", before: "4 months", after: "3 weeks" },
        { label: "CIS compliance rate", before: "~60% during cycle", after: "> 95% post-cycle" },
        { label: "Manual VM interventions", before: "3,000+", after: "< 50 exception cases" },
      ],
    },
    toolIntegrations: [
      { name: "Azure VM", role: "VM fleet management and rolling updates" },
      { name: "Packer", role: "Golden OS image build and CIS hardening" },
      { name: "CIS Benchmarks", role: "Compliance validation target" },
      { name: "Ansible", role: "In-place hardening for non-replaceable VMs" },
    ],
    agentCapabilities: [
      "Build hardened OS image via Packer with CIS benchmark profile",
      "Validate image against CIS benchmark checks",
      "Stage rolling VM update across fleet by priority tier",
      "Apply Ansible hardening scripts for in-place updates",
      "Generate fleet compliance report post-cycle",
    ],
    preferredUIElements: [
      "Fleet update progress heatmap by region",
      "CIS compliance score per VM group",
      "Rolling update wave scheduler",
      "Exception list for manual intervention VMs",
    ],
    inputOutput: {
      input: ["Azure subscription scope", "CIS benchmark profile", "Maintenance window schedule"],
      output: ["Hardened golden image", "Fleet update progress report", "CIS compliance scorecard", "Exception list"],
    },
    integrationRequirements: [
      "Azure VM contributor role on target subscription",
      "Packer build pipeline access",
      "Ansible AWX with fleet inventory",
    ],
    triggerCondition: "Monthly OS patch Tuesday cycle, or critical CVE requiring urgent OS-level remediation.",
  },

  22: {
    problemStatement: "Alert storms overwhelm L1 operations — 2,400+ alerts per day with 80% noise from correlated, duplicate, or low-priority events. Engineers spend 6+ hours per shift manually triaging alerts that could be auto-correlated and resolved without human intervention.",
    aiSolution: "An AIOps Event Management Agent ingests alerts from Dynatrace, Splunk, and Azure Monitor, de-duplicates and clusters correlated events using topological correlation, identifies the root-cause alert, auto-remediates known patterns, and escalates only actionable incidents to L1.",
    effortImpact: {
      beforeHrs: 520, afterHrs: 104,
      metrics: [
        { label: "Daily alert volume to L1", before: "2,400 alerts", after: "< 50 actionable incidents" },
        { label: "Alert noise rate", before: "~80%", after: "< 10%" },
        { label: "Auto-remediation rate", before: "0%", after: "> 40% of known patterns" },
      ],
    },
    toolIntegrations: [
      { name: "Dynatrace", role: "APM events, problem tickets, service topology" },
      { name: "Splunk", role: "Infrastructure log-based alert correlation" },
      { name: "ServiceNow", role: "Incident creation for escalated events" },
      { name: "Azure Monitor", role: "Azure resource health and metric alerts" },
    ],
    agentCapabilities: [
      "Ingest multi-source alert stream in real-time",
      "Cluster correlated alerts into incidents using topology",
      "Identify root-cause alert per cluster",
      "Match known patterns for auto-remediation",
      "Create ServiceNow incident only for unresolved escalations",
    ],
    preferredUIElements: [
      "Live alert stream with clustering visualization",
      "Alert noise reduction metrics",
      "Auto-remediation action log",
      "Escalated incident queue",
    ],
    inputOutput: {
      input: ["Dynatrace alert webhook stream", "Splunk saved search alerts", "Azure Monitor alert rules"],
      output: ["Clustered incident map", "Root-cause determination", "Auto-remediation log", "ServiceNow incidents"],
    },
    integrationRequirements: [
      "Dynatrace API token with events:read and problems:read",
      "Splunk HEC token and search API",
      "Azure Monitor diagnostic settings and alert rules",
      "ServiceNow event management module",
    ],
    triggerCondition: "Real-time alert event received from any integrated monitoring source (webhook/poll).",
  },

  23: {
    problemStatement: "P1 incident MTTR averages 4.2 hours due to manual war room coordination — assembling the right engineers, sharing context, running parallel diagnostic tracks, and communicating with stakeholders all happen through fragmented channels with no single source of truth.",
    aiSolution: "A MIM Orchestrator Agent automatically assembles a virtual war room in MS Teams when a P1 fires, posts correlated Dynatrace and PagerDuty context, assigns diagnostic tracks to the right engineers based on on-call roster, tracks action items, and drafts stakeholder communications.",
    effortImpact: {
      beforeHrs: 380, afterHrs: 76,
      metrics: [
        { label: "P1 MTTR", before: "4.2 hrs avg", after: "< 1.5 hrs avg" },
        { label: "War room assembly time", before: "15–25 min", after: "< 2 min (auto)" },
        { label: "Stakeholder update lag", before: "Irregular, manual", after: "Auto every 15 min" },
      ],
    },
    toolIntegrations: [
      { name: "ServiceNow", role: "P1 incident source and resolution tracking" },
      { name: "PagerDuty", role: "On-call roster and escalation policy" },
      { name: "MS Teams", role: "Virtual war room and communication channel" },
      { name: "Dynatrace", role: "Correlated APM context for the incident" },
    ],
    agentCapabilities: [
      "Auto-create Teams incident channel on P1 trigger",
      "Pull Dynatrace context and post to war room",
      "Identify and page relevant on-call engineers",
      "Track diagnostic track assignments and updates",
      "Draft stakeholder communications at 15-minute intervals",
    ],
    preferredUIElements: [
      "War room dashboard with real-time status per diagnostic track",
      "On-call roster with paging status",
      "Timeline of actions and discoveries",
      "Stakeholder broadcast panel with draft preview",
    ],
    inputOutput: {
      input: ["ServiceNow P1 incident ID", "PagerDuty schedule ID", "Dynatrace problem ticket"],
      output: ["Teams war room channel", "Diagnostic track assignments", "Stakeholder updates", "Post-incident report"],
    },
    integrationRequirements: [
      "ServiceNow API with incident:read and write",
      "PagerDuty API with schedule:read and escalation:write",
      "MS Teams bot with channel:create permission",
      "Dynatrace API token with problems:read",
    ],
    triggerCondition: "ServiceNow P1 incident creation or PagerDuty critical alert escalation.",
  },

  24: {
    problemStatement: "Change validation is a 3-day manual process — reviewers must check impact assessments, test evidence, rollback plans, and approval chains across multiple ServiceNow tickets. This blocks deployment velocity and creates a backlog of approved-but-waiting changes.",
    aiSolution: "An Autonomous Change Validation Agent reads the change record, pulls test evidence from GitHub and Dynatrace, cross-checks the impact assessment against the CMDB topology, validates rollback plans, and auto-approves low-risk changes — escalating only high-risk ones for human CAB review.",
    effortImpact: {
      beforeHrs: 480, afterHrs: 72,
      metrics: [
        { label: "Change approval cycle time", before: "3 days", after: "< 4 hrs for standard changes" },
        { label: "Manual CAB review volume", before: "100% of changes", after: "< 20% (high-risk only)" },
        { label: "Deployment backlog", before: "High", after: "Near-zero" },
      ],
    },
    toolIntegrations: [
      { name: "ServiceNow", role: "Change request source and approval workflow" },
      { name: "GitHub", role: "Test evidence and deployment artifact validation" },
      { name: "Dynatrace", role: "Risk assessment via service dependency map" },
    ],
    agentCapabilities: [
      "Parse change record and extract validation requirements",
      "Pull and verify test evidence from GitHub CI",
      "Cross-check CMDB impact scope with Dynatrace topology",
      "Validate rollback plan completeness",
      "Auto-approve standard changes; flag high-risk for CAB",
    ],
    preferredUIElements: [
      "Change validation checklist with auto-populated evidence",
      "Risk score with contributing factors",
      "CMDB impact scope map",
      "Auto-approve vs CAB escalation decision with reasoning",
    ],
    inputOutput: {
      input: ["ServiceNow change request ID", "GitHub repo + CI run ID", "CMDB CI scope"],
      output: ["Validation report with risk score", "Auto-approval decision", "CAB escalation summary", "Rollback plan assessment"],
    },
    integrationRequirements: [
      "ServiceNow API with change:read and approval:write",
      "GitHub Actions API with run:read",
      "Dynatrace API with topology:read",
    ],
    triggerCondition: "Change request moves to 'Review' status in ServiceNow, or scheduled daily CAB preparation sweep.",
  },

  25: {
    problemStatement: "2,280 hours per month are spent on manual batch job monitoring across 5 disparate systems — Control-M, Mainframe, Informatica, Oracle, and Nabu. Each system has its own interface, and 62% of alerts are noise, requiring L1 to investigate and dismiss hundreds of false positives daily.",
    aiSolution: "The Batch Health Analyzer provides a unified NOC dashboard across all 5 systems, de-duplicates batch alerts using AI correlation, auto-resolves known-pattern failures, surfaces only genuine anomalies for investigation, and generates root-cause summaries with historical context.",
    effortImpact: {
      beforeHrs: 2281, afterHrs: 830,
      metrics: [
        { label: "Monthly monitoring hours", before: "2,281 hrs", after: "830 hrs" },
        { label: "Alert noise rate", before: "62%", after: "< 15%" },
        { label: "Auto-resolved batch failures", before: "0%", after: "> 50% known patterns" },
      ],
    },
    toolIntegrations: [
      { name: "Control-M", role: "Enterprise batch scheduler job status feed" },
      { name: "Mainframe JES2", role: "Mainframe job execution and SYSOUT logs" },
      { name: "Informatica", role: "ETL workflow execution status" },
      { name: "Oracle", role: "Oracle Scheduler job feeds" },
      { name: "Nabu", role: "Cloud-native batch job monitoring" },
    ],
    agentCapabilities: [
      "Unified ingestion from 5 batch systems via polling/webhooks",
      "AI correlation of related batch failures across systems",
      "Auto-resolve failures matching known runbook patterns",
      "Surface genuine anomalies with historical context",
      "Generate daily batch health summary report",
    ],
    preferredUIElements: [
      "Unified NOC dashboard across all 5 systems",
      "Alert correlation view (related jobs across systems)",
      "Auto-resolve vs investigate queue",
      "Trend chart of batch success/failure rates",
    ],
    inputOutput: {
      input: ["Job status feeds from all 5 systems", "Historical failure runbook library"],
      output: ["Unified health dashboard", "Correlated incident queue", "Auto-resolution log", "Daily summary report"],
    },
    integrationRequirements: [
      "Control-M API with jobs:read",
      "Mainframe SYSOUT and JES2 API access",
      "Informatica API with workflow:read",
      "Oracle DBMS_SCHEDULER read access",
      "Nabu API token",
    ],
    triggerCondition: "Batch job failure event from any monitored system, or scheduled every 5 minutes for health polling.",
  },

  26: {
    problemStatement: "Access provisioning averages 5 days against a 2-day SLA — requests flow through multiple manual approval chains across Azure AD, ServiceNow, and SailPoint, with no automation between systems. Expired access is rarely revoked promptly, creating security risk.",
    aiSolution: "An IAM Automation Agent ingests access requests from ServiceNow, validates entitlements against role policies, auto-provisions compliant requests via Azure AD and SailPoint, schedules automated access reviews, and removes expired access on schedule.",
    effortImpact: {
      beforeHrs: 340, afterHrs: 68,
      metrics: [
        { label: "Access provisioning time", before: "5 days avg", after: "< 4 hrs" },
        { label: "SLA compliance rate", before: "< 60%", after: "> 95%" },
        { label: "Expired access remediation", before: "Months late", after: "On schedule" },
      ],
    },
    toolIntegrations: [
      { name: "Azure AD", role: "User and group access provisioning" },
      { name: "ServiceNow", role: "Access request intake and approval workflow" },
      { name: "SailPoint", role: "Identity governance and access certification" },
    ],
    agentCapabilities: [
      "Ingest and validate access requests against role policies",
      "Auto-approve and provision compliant requests",
      "Escalate policy exceptions for human review",
      "Schedule quarterly access certification campaigns",
      "Auto-revoke expired access on schedule",
    ],
    preferredUIElements: [
      "Access request queue with auto-approve vs escalate decisions",
      "Role policy compliance checker",
      "Access expiry calendar with revocation status",
      "SLA compliance dashboard",
    ],
    inputOutput: {
      input: ["ServiceNow access request", "Azure AD directory", "SailPoint role catalog"],
      output: ["Provisioned access", "Approval decision log", "Access certification campaign", "Revocation report"],
    },
    integrationRequirements: [
      "Azure AD application with User.ReadWrite.All permission",
      "ServiceNow service account with request:write",
      "SailPoint IdentityNow API with access:manage",
    ],
    triggerCondition: "New access request submitted in ServiceNow, or scheduled quarterly access certification sweep.",
  },

  27: {
    problemStatement: "SREs and platform engineers field 400+ L1 questions per month — routine questions about service status, runbook procedures, and standard configurations that require no expertise but consume 30% of SRE time, leaving no capacity for proactive work.",
    aiSolution: "A Conversational SRE Assist Agent on MS Teams answers L1 queries using a live-indexed knowledge base (Confluence, ServiceNow KB, runbooks), escalates questions it cannot answer with confidence to a senior engineer, and logs all interactions to grow the knowledge base.",
    effortImpact: {
      beforeHrs: 280, afterHrs: 56,
      metrics: [
        { label: "L1 query self-serve rate", before: "< 20%", after: "> 75%" },
        { label: "SRE time on L1 queries", before: "30% of work hours", after: "< 8%" },
        { label: "KB coverage (answered queries)", before: "Low", after: "Growing with each query" },
      ],
    },
    toolIntegrations: [
      { name: "MS Teams", role: "Conversational interface for SRE queries" },
      { name: "Confluence", role: "Runbook and architecture knowledge base" },
      { name: "ServiceNow", role: "KB article retrieval and incident creation" },
    ],
    agentCapabilities: [
      "Answer L1 queries with semantic search over Confluence and ServiceNow KB",
      "Escalate to senior engineer when confidence is low",
      "Log all Q&A pairs for KB growth",
      "Proactively suggest relevant runbooks",
      "Create ServiceNow incident if query indicates an active issue",
    ],
    preferredUIElements: [
      "Teams bot with confidence-scored answers",
      "Source citation for every answer",
      "Escalation button with context pre-filled",
      "Knowledge base coverage metrics",
    ],
    inputOutput: {
      input: ["Natural-language Teams query", "User identity and team context"],
      output: ["Answered response with source links", "Escalation ticket if unresolved", "KB article draft for new queries"],
    },
    integrationRequirements: [
      "MS Teams bot with chat:read and send permissions",
      "Confluence API with space:read",
      "ServiceNow API with kb_article:read",
    ],
    triggerCondition: "Any message sent to the SRE Assist Teams bot.",
  },

  // ── NETWORK OPERATIONS ──────────────────────────────────────────────────────

  28: {
    problemStatement: "Network outages — node down, interface flap, switch errors — average 47 minutes MTTR because manual diagnosis requires L2 engineers to query multiple tools, run traceroutes, correlate logs, and identify the faulty device before attempting remediation.",
    aiSolution: "A Network Self-Heal Agent detects the alert from SolarWinds, uses NetBrain to pull the topology and run automated path traces, correlates with Cisco device logs via SNMP/CLI, identifies the root-cause device and interface, and executes the pre-approved remediation playbook (interface bounce, failover, or escalation).",
    effortImpact: {
      beforeHrs: 320, afterHrs: 48,
      metrics: [
        { label: "Network incident MTTR", before: "47 min avg", after: "< 12 min" },
        { label: "L2 engineer involvement", before: "100% of incidents", after: "< 25% (escalations only)" },
        { label: "Self-heal success rate", before: "0%", after: "> 60% of known patterns" },
      ],
    },
    toolIntegrations: [
      { name: "NetBrain", role: "Network topology and automated runbook execution" },
      { name: "SolarWinds", role: "Alert source and device health monitoring" },
      { name: "Cisco", role: "Device CLI and SNMP for log and config access" },
    ],
    agentCapabilities: [
      "Ingest SolarWinds alert and identify affected device",
      "Query NetBrain for topology and path trace",
      "Parse Cisco device logs via SNMP/CLI",
      "Identify root-cause interface or device",
      "Execute pre-approved remediation (bounce, failover, escalate)",
    ],
    preferredUIElements: [
      "Network topology map with affected path highlighted",
      "Device health timeline leading to failure",
      "Remediation action log with approval gate",
      "MTTR improvement dashboard",
    ],
    inputOutput: {
      input: ["SolarWinds alert ID", "Device hostname or IP", "Alert type (node-down/interface-flap)"],
      output: ["Root cause device and interface", "Remediation action taken", "ServiceNow incident", "MTTR report"],
    },
    integrationRequirements: [
      "NetBrain API token with topology:read and runbook:execute",
      "SolarWinds API with alerts:read",
      "Cisco device SSH or SNMP read credentials",
    ],
    triggerCondition: "SolarWinds alert for node-down, interface-flap, or switch error exceeding threshold.",
  },

  29: {
    problemStatement: "Wireless LAN controller issues and device/link failures in distributed offices require on-site engineer intervention — a costly and slow process when the issue could be resolved via configuration push or controller failover. Remote visibility is limited across Cisco and Meraki controllers.",
    aiSolution: "A Network Issue Remediation Agent provides unified visibility across Cisco WLC and Meraki, diagnoses the root cause remotely (rogue AP, channel interference, controller config drift), and executes the remediation (config push, WLC failover, channel reassignment) without on-site dispatch.",
    effortImpact: {
      beforeHrs: 240, afterHrs: 48,
      metrics: [
        { label: "Incidents requiring on-site dispatch", before: "~70%", after: "< 15%" },
        { label: "Remote resolution rate", before: "30%", after: "> 85%" },
        { label: "Avg time to resolve WLC issue", before: "4+ hrs", after: "< 45 min" },
      ],
    },
    toolIntegrations: [
      { name: "Cisco WLC", role: "Wireless controller management and config push" },
      { name: "Meraki", role: "Cloud-managed network device control" },
      { name: "SolarWinds", role: "Correlated infrastructure health monitoring" },
    ],
    agentCapabilities: [
      "Diagnose WLC and Meraki issues via API",
      "Identify rogue APs, channel interference, config drift",
      "Execute remote config push or WLC failover",
      "Correlate with SolarWinds for infrastructure context",
      "Create ServiceNow incident and resolution record",
    ],
    preferredUIElements: [
      "Unified WLC + Meraki network health map",
      "Issue type classification with confidence score",
      "Remote remediation action log",
      "On-site dispatch recommendation if remote fails",
    ],
    inputOutput: {
      input: ["WLC or Meraki device ID", "Issue type", "Affected site/location"],
      output: ["Root cause analysis", "Remote remediation action", "ServiceNow incident", "On-site recommendation if needed"],
    },
    integrationRequirements: [
      "Cisco WLC REST API credentials",
      "Meraki Dashboard API token",
      "SolarWinds API read access",
    ],
    triggerCondition: "SolarWinds alert for WLC or Meraki device issue, or helpdesk ticket for wireless connectivity problem.",
  },

  30: {
    problemStatement: "Firewall rule changes take 10 days through manual CAB process — writing the change request, getting security team sign-off, scheduling a maintenance window, and having a network engineer manually configure the rule in Palo Alto Panorama. Urgent business requests wait days for access.",
    aiSolution: "A Firewall Management Agent takes a structured firewall change request, validates it against security policy and existing rule conflicts, generates the Panorama configuration, gets automated approval for low-risk changes, and pushes the rule — completing in hours instead of days.",
    effortImpact: {
      beforeHrs: 160, afterHrs: 24,
      metrics: [
        { label: "Firewall change cycle time", before: "10 days", after: "< 4 hrs (standard changes)" },
        { label: "Rule conflict detection", before: "Manual, often missed", after: "Automated pre-push check" },
        { label: "CAB manual involvement", before: "100%", after: "< 20% (high-risk only)" },
      ],
    },
    toolIntegrations: [
      { name: "Palo Alto NGFW", role: "Firewall rule management target" },
      { name: "Panorama", role: "Centralized policy management and push" },
      { name: "ServiceNow", role: "Change request management and approval workflow" },
    ],
    agentCapabilities: [
      "Parse structured firewall change request",
      "Validate against security policy and rule conflicts",
      "Generate Panorama configuration diff",
      "Auto-approve low-risk changes; escalate high-risk",
      "Push and verify rule in Panorama",
    ],
    preferredUIElements: [
      "Change request form with policy validation feedback",
      "Existing rule conflict checker",
      "Panorama config diff preview",
      "Risk classification with approval decision",
    ],
    inputOutput: {
      input: ["Source/destination IP", "Port/protocol", "Action (allow/deny)", "Business justification"],
      output: ["Policy validation result", "Panorama config diff", "Approval decision", "Rule push confirmation"],
    },
    integrationRequirements: [
      "Palo Alto Panorama API credentials with policy:write",
      "ServiceNow API with change:write",
      "Security policy rule catalog (OPA or JSON policy file)",
    ],
    triggerCondition: "New firewall change request submitted via ServiceNow catalog or security team request portal.",
  },

  31: {
    problemStatement: "Network engineers handle 400+ L1 queries per month about network status, device configuration, and topology documentation — questions that require no expertise but consume significant senior engineer time that could be spent on architecture and proactive improvement.",
    aiSolution: "A Network Assist Conversational Agent on MS Teams answers L1 network queries using live topology data from NetBrain, device status from SolarWinds, and documentation from ServiceNow KB — providing real-time, accurate responses without engineer involvement.",
    effortImpact: {
      beforeHrs: 200, afterHrs: 40,
      metrics: [
        { label: "L1 query self-serve rate", before: "< 15%", after: "> 80%" },
        { label: "Engineer time on L1 queries", before: "~40 hrs/month", after: "< 8 hrs/month" },
        { label: "Query response time", before: "Hours (email/ticket)", after: "< 30 seconds" },
      ],
    },
    toolIntegrations: [
      { name: "MS Teams", role: "Conversational interface for network queries" },
      { name: "NetBrain", role: "Live topology and device configuration lookup" },
      { name: "ServiceNow", role: "Network-related KB article retrieval" },
    ],
    agentCapabilities: [
      "Answer network status queries with live SolarWinds data",
      "Provide topology and path information from NetBrain",
      "Retrieve relevant KB articles for procedure questions",
      "Escalate to on-call network engineer with context",
      "Log interactions for KB growth",
    ],
    preferredUIElements: [
      "Teams bot with real-time network status answers",
      "Topology visualization embedded in response",
      "Escalation button with pre-filled context",
      "Query trend dashboard for knowledge gap detection",
    ],
    inputOutput: {
      input: ["Natural-language Teams query", "Device name or site context"],
      output: ["Answer with source links", "Live status data", "Escalation ticket if needed"],
    },
    integrationRequirements: [
      "MS Teams bot permissions",
      "NetBrain API with topology:read",
      "SolarWinds API with device:read",
      "ServiceNow KB read access",
    ],
    triggerCondition: "Any message sent to the Network Assist Teams bot.",
  },

  // ── SECURITY ENGINEERING / FINOPS ───────────────────────────────────────────

  32: {
    problemStatement: "Configuration drift from approved baselines goes undetected for an average of 18 days — security controls disabled, ports opened, policies weakened. By the time it's discovered via manual audit, the compliance gap has existed long enough to create real risk.",
    aiSolution: "A Configuration Anomaly Detection Agent continuously monitors Prisma Cloud policy findings and Azure Policy compliance state, correlates deviations with recent changes using Splunk, and immediately creates a ServiceNow security incident with the specific config drift and remediation steps.",
    effortImpact: {
      beforeHrs: 360, afterHrs: 72,
      metrics: [
        { label: "Config drift detection time", before: "18 days avg", after: "< 15 min" },
        { label: "Security gap exposure window", before: "Weeks", after: "< 1 hour" },
        { label: "Manual audit cycle", before: "Quarterly", after: "Continuous" },
      ],
    },
    toolIntegrations: [
      { name: "Prisma Cloud", role: "Cloud security posture findings" },
      { name: "Azure Policy", role: "Resource compliance state monitoring" },
      { name: "Splunk", role: "Change event correlation with drift timeline" },
    ],
    agentCapabilities: [
      "Monitor Prisma Cloud and Azure Policy for drift in real-time",
      "Correlate drift with Splunk change events",
      "Classify severity by control type and exploitability",
      "Create ServiceNow security incident with full detail",
      "Suggest specific remediation config commands",
    ],
    preferredUIElements: [
      "Compliance drift heatmap by resource and control",
      "Change-to-drift correlation timeline",
      "Severity-classified incident queue",
      "One-click remediation suggestion",
    ],
    inputOutput: {
      input: ["Prisma Cloud policy feed", "Azure Policy compliance API", "Splunk change event index"],
      output: ["Drift detection alert", "Change correlation report", "ServiceNow security incident", "Remediation guidance"],
    },
    integrationRequirements: [
      "Prisma Cloud API with findings:read",
      "Azure Policy reader role",
      "Splunk API token with search:read",
      "ServiceNow security incident module write access",
    ],
    triggerCondition: "Prisma Cloud policy violation or Azure Policy non-compliance detected, evaluated on 15-minute polling cycle.",
  },

  33: {
    problemStatement: "Security code review backlogs cause 3-week delivery delays — manual review of every PR for OWASP Top 10 vulnerabilities, injection risks, and insecure patterns requires senior security engineer time that is in short supply.",
    aiSolution: "A Secure Code Review Agent runs on every PR, uses SonarQube and Checkmarx findings combined with AI reasoning to identify security issues, explains each vulnerability with CWE references, and suggests minimal code fixes — reducing the security engineer review burden to approval-only.",
    effortImpact: {
      beforeHrs: 280, afterHrs: 56,
      metrics: [
        { label: "Security review cycle time", before: "3 weeks", after: "< 24 hrs" },
        { label: "Security engineer involvement", before: "Full review every PR", after: "Approval-only for medium/high" },
        { label: "False positive rate", before: "~30% of findings", after: "< 10% with AI filtering" },
      ],
    },
    toolIntegrations: [
      { name: "SonarQube", role: "Static analysis findings with CWE mapping" },
      { name: "Checkmarx", role: "SAST deep scan for injection and logic flaws" },
      { name: "GitHub", role: "PR integration with inline review comments" },
    ],
    agentCapabilities: [
      "Ingest SonarQube and Checkmarx findings per PR",
      "Filter false positives with AI reasoning",
      "Explain vulnerabilities with CWE references",
      "Suggest minimal code fix per finding",
      "Post inline GitHub review comments",
    ],
    preferredUIElements: [
      "PR security score with finding breakdown",
      "Inline code review comments with fix suggestion",
      "CWE classification per vulnerability",
      "False-positive override mechanism",
    ],
    inputOutput: {
      input: ["GitHub PR URL", "SonarQube project key", "Checkmarx scan ID"],
      output: ["Security score", "Filtered finding list with explanations", "Code fix suggestions", "GitHub review comments"],
    },
    integrationRequirements: [
      "SonarQube API token with project:read",
      "Checkmarx API with scan:read",
      "GitHub token with PR:review permission",
    ],
    triggerCondition: "New pull request opened against a monitored repository branch.",
  },

  34: {
    problemStatement: "Cloud resources are 35%+ over-provisioned due to manual sizing decisions made at provisioning time that are never revisited. Demand forecasting is done via spreadsheets and gut feel, leading to both waste and occasional under-provisioning incidents.",
    aiSolution: "A FinOps AI Agent uses ML-based demand forecasting on Azure Monitor time-series data, generates per-resource right-sizing recommendations with projected savings, identifies reserved instance opportunities, and creates Terraform PRs for the recommended changes.",
    effortImpact: {
      beforeHrs: 240, afterHrs: 48,
      metrics: [
        { label: "Over-provisioning rate", before: "~35%", after: "< 8%" },
        { label: "Forecast accuracy", before: "±30%", after: "±8%" },
        { label: "Right-sizing implementation time", before: "Quarterly manual", after: "Continuous automated" },
      ],
    },
    toolIntegrations: [
      { name: "Azure Advisor", role: "Cost and performance right-sizing recommendations" },
      { name: "Azure Cost Management", role: "Spend data and forecast API" },
      { name: "Turbonomic", role: "Workload demand analysis and right-sizing engine" },
    ],
    agentCapabilities: [
      "Analyze 90-day utilization trends per VM/service",
      "Identify reserved instance savings opportunities",
      "Generate right-sizing recommendations with cost impact",
      "Forecast 90-day demand using ML time-series",
      "Create Terraform PR for recommended changes",
    ],
    preferredUIElements: [
      "Resource optimization opportunity list with savings",
      "Demand forecast chart with confidence bands",
      "Reserved instance recommendation calculator",
      "Terraform PR preview with cost impact",
    ],
    inputOutput: {
      input: ["Azure subscription scope", "90-day metric history", "Cost tags for business unit allocation"],
      output: ["Right-sizing recommendations", "Savings forecast", "Reserved instance proposal", "Terraform PR"],
    },
    integrationRequirements: [
      "Azure Cost Management contributor role",
      "Azure Advisor reader role",
      "Turbonomic API credentials",
      "Terraform Cloud workspace for PR preview",
    ],
    triggerCondition: "Monthly cost review cycle, or when Azure Advisor identifies savings > $1,000/month.",
  },

  35: {
    problemStatement: "Cost spikes are discovered 30+ days after occurrence on the monthly cloud bill — by then the root cause is obscure, and the business unit has already incurred the overage. There is no real-time anomaly detection or budget forecast warning system.",
    aiSolution: "A Cost Anomaly Detection Agent monitors Azure cost streams in near-real-time, uses statistical anomaly detection to identify unexpected spend patterns, correlates spikes with specific resources and recent deployments, forecasts end-of-month vs budget, and sends proactive alerts with remediation options.",
    effortImpact: {
      beforeHrs: 180, afterHrs: 36,
      metrics: [
        { label: "Cost spike detection lag", before: "30+ days", after: "< 24 hrs" },
        { label: "Budget breach prevention rate", before: "< 20%", after: "> 80%" },
        { label: "Cost anomaly root-cause time", before: "Hours manual research", after: "< 5 min automated" },
      ],
    },
    toolIntegrations: [
      { name: "Azure Cost Management", role: "Real-time cost stream and budget API" },
      { name: "Power BI", role: "Cost trend reporting and visualization" },
      { name: "Claude Opus 4", role: "Anomaly explanation and remediation recommendations" },
    ],
    agentCapabilities: [
      "Monitor Azure cost streams with 4-hour granularity",
      "Detect statistical anomalies in spend per resource group",
      "Correlate cost spikes with deployment events",
      "Forecast end-of-month spend vs budget",
      "Send proactive Teams/email alerts with actionable remediation",
    ],
    preferredUIElements: [
      "Real-time cost trend chart with anomaly markers",
      "Budget forecast gauge (current vs projected vs budget)",
      "Anomaly detail card with root-cause attribution",
      "Remediation recommendation panel",
    ],
    inputOutput: {
      input: ["Azure subscription ID", "Budget thresholds per tag/resource group", "Historical cost baseline"],
      output: ["Anomaly alerts with attribution", "Budget forecast", "Remediation recommendations", "Power BI report"],
    },
    integrationRequirements: [
      "Azure Cost Management reader role",
      "Power BI API with dataset:write",
      "Anthropic API key (Claude Opus 4)",
      "MS Teams webhook for proactive alerts",
    ],
    triggerCondition: "Azure cost stream polled every 4 hours; alert triggered when anomaly score exceeds threshold or projected spend > 90% of budget.",
  },

  36: {
    problemStatement: "CVE remediation in Kubernetes clusters averages 47 days — from vulnerability detection to patched container image deployed. The multi-agent workflow requires coordinating across security scanning, ServiceNow ITSM, GitHub source control, and Azure AKS deployment — all currently manual.",
    aiSolution: "The CVIT Multi-Agent Orchestrator is a 10-step LangGraph workflow: Scan Agent detects the vulnerability in the container runtime → Collect/Enrich agents build context → Human approves → WorkPackage Agent creates the ServiceNow incident and GitHub PR → Monitor Agent validates the fix → Close and KB agents wrap up the cycle.",
    effortImpact: {
      beforeHrs: 480, afterHrs: 96,
      metrics: [
        { label: "CVE remediation cycle", before: "47 days", after: "< 4 hrs (with human approval)" },
        { label: "Manual coordination steps", before: "10+ handoffs", after: "1 approval gate" },
        { label: "Post-patch validation", before: "Manual re-scan", after: "Automated in workflow" },
      ],
    },
    toolIntegrations: [
      { name: "LangGraph", role: "Multi-agent workflow orchestration" },
      { name: "Claude Opus 4", role: "Tool calling across all 10 agent steps" },
      { name: "ServiceNow", role: "P1 incident and change request creation" },
      { name: "GitHub", role: "Fix PR creation, branch management, merge" },
      { name: "Azure AKS", role: "Runtime vulnerability detection and remediation" },
    ],
    agentCapabilities: [
      "Detect EOL container runtime (Dockerfile FROM line)",
      "Enrich finding with CVE context and compliance impact",
      "Create structured ServiceNow P1 incident",
      "Generate GitHub PR with Dockerfile fix (FROM upgrade)",
      "Validate fix deployment and update KB article",
    ],
    preferredUIElements: [
      "10-step pipeline tracker with agent names",
      "Real-time SSE streaming log per agent step",
      "Container runtime before/after comparison",
      "Artifacts panel (incident, PR, KB article)",
      "Human approval gate with 30-second countdown",
    ],
    inputOutput: {
      input: ["GitHub repository", "Vulnerability scenario (EOL runtime)", "ServiceNow instance"],
      output: ["ServiceNow P1 incident", "GitHub fix PR (merged)", "AKS patch confirmation", "KB article"],
    },
    integrationRequirements: [
      "GitHub token with repo:write and PR:create",
      "ServiceNow service account with incident:write",
      "Azure AKS kubeconfig with deployment:read",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "Manual trigger for demo; in production: Prisma Cloud or AKS security scan detecting EOL runtime or critical CVE.",
  },

  // ── ESC / ITSM ──────────────────────────────────────────────────────────────

  37: {
    problemStatement: "Compass user access provisioning requires 4 manual handoffs — helpdesk intake, manager approval, Compass admin action, and Azure AD group assignment — averaging 3 days. The backlog grows steadily as the business onboards new contractors and employees.",
    aiSolution: "An Access Automation Agent monitors ServiceNow for Compass access requests, validates manager approval, provisions the Compass role and Azure AD group automatically for standard entitlements, and escalates non-standard requests for human review.",
    effortImpact: {
      beforeHrs: 280, afterHrs: 42,
      metrics: [
        { label: "Access provisioning time", before: "3 days avg", after: "< 2 hrs" },
        { label: "Manual handoffs per request", before: "4 handoffs", after: "1 (manager approval)" },
        { label: "Backlog size", before: "Growing", after: "Near-zero" },
      ],
    },
    toolIntegrations: [
      { name: "Compass", role: "Application role provisioning" },
      { name: "ServiceNow", role: "Access request intake and approval tracking" },
      { name: "Azure AD", role: "Group assignment and SSO entitlement" },
    ],
    agentCapabilities: [
      "Monitor ServiceNow for new Compass access requests",
      "Validate manager approval before provisioning",
      "Auto-provision standard entitlements in Compass",
      "Assign Azure AD group for SSO access",
      "Escalate non-standard role requests",
    ],
    preferredUIElements: [
      "Access request queue with auto-approve vs escalate indicator",
      "Provisioning status tracker",
      "Manager approval gate with one-click approve",
      "SLA compliance dashboard",
    ],
    inputOutput: {
      input: ["ServiceNow access request", "Manager approval status", "User identity"],
      output: ["Compass role provisioned", "Azure AD group assigned", "ServiceNow ticket resolved", "Notification to requester"],
    },
    integrationRequirements: [
      "Compass admin API with role:create",
      "ServiceNow API with request:write",
      "Azure AD app with GroupMember.ReadWrite.All",
    ],
    triggerCondition: "New Compass access request created in ServiceNow catalog.",
  },

  38: {
    problemStatement: "Azure DevOps access requests have a 3-day SLA but actual average is 7 days — requests queue in ServiceNow, wait for a senior DevOps engineer to action them manually in ADO, then require Azure AD group updates separately. Each step is manual and prone to delay.",
    aiSolution: "An ADO Access Automation Agent processes ServiceNow requests, validates entitlement policy, provisions the ADO project role and Azure AD security group via API, and closes the ServiceNow ticket with full audit trail — completing in minutes instead of days.",
    effortImpact: {
      beforeHrs: 200, afterHrs: 30,
      metrics: [
        { label: "ADO access provisioning time", before: "7 days avg", after: "< 30 min" },
        { label: "SLA compliance rate", before: "~40%", after: "> 99%" },
        { label: "Engineer manual actions", before: "Every request", after: "Exception cases only" },
      ],
    },
    toolIntegrations: [
      { name: "Azure DevOps", role: "Project and organization access provisioning" },
      { name: "ServiceNow", role: "Request intake and ticket lifecycle" },
      { name: "Azure AD", role: "Security group assignment for ADO access" },
    ],
    agentCapabilities: [
      "Parse ADO access request from ServiceNow",
      "Validate entitlement policy (project + permission level)",
      "Provision ADO project role via API",
      "Assign Azure AD security group",
      "Close ServiceNow ticket with audit log",
    ],
    preferredUIElements: [
      "Access request form with policy validation feedback",
      "Provisioning confirmation with ADO link",
      "SLA timer per request",
      "Audit log viewer",
    ],
    inputOutput: {
      input: ["ServiceNow request", "ADO organization and project name", "Requested permission level"],
      output: ["ADO role provisioned", "Azure AD group assigned", "ServiceNow ticket resolved"],
    },
    integrationRequirements: [
      "Azure DevOps PAT with MemberEntitlementManagement:write",
      "ServiceNow API with request:write",
      "Azure AD app with GroupMember.ReadWrite.All",
    ],
    triggerCondition: "New Azure DevOps access request submitted via ServiceNow catalog.",
  },

  39: {
    problemStatement: "GitHub organization access requests sit in the queue for an average of 5 days — a GitHub org admin must manually invite the user, set repository access permissions, and ensure the correct team assignment. This bottleneck slows contractor onboarding and project kick-offs.",
    aiSolution: "A GitHub Access Automation Agent ingests ServiceNow requests, validates the requestor's entitlement, sends a GitHub org invitation via API, adds the user to the correct team, and assigns repo access — all within minutes of manager approval.",
    effortImpact: {
      beforeHrs: 160, afterHrs: 24,
      metrics: [
        { label: "GitHub access provisioning time", before: "5 days", after: "< 15 min" },
        { label: "Org admin manual actions", before: "Every request", after: "Exception cases only" },
        { label: "Audit trail completeness", before: "Inconsistent", after: "Full audit in ServiceNow" },
      ],
    },
    toolIntegrations: [
      { name: "GitHub", role: "Org membership, team, and repo access management" },
      { name: "ServiceNow", role: "Request intake and approval workflow" },
      { name: "Azure AD", role: "Identity verification before provisioning" },
    ],
    agentCapabilities: [
      "Validate requester identity against Azure AD",
      "Send GitHub org invitation via API",
      "Add user to appropriate GitHub team",
      "Assign repository access at correct permission level",
      "Log all actions to ServiceNow ticket",
    ],
    preferredUIElements: [
      "Request queue with invite status indicator",
      "Team and repo access matrix selector",
      "One-click approve with provisioning log",
      "GitHub invitation acceptance tracker",
    ],
    inputOutput: {
      input: ["ServiceNow request", "GitHub username", "Requested team and repo access"],
      output: ["GitHub org invitation sent", "Team membership assigned", "Repo access configured", "ServiceNow ticket resolved"],
    },
    integrationRequirements: [
      "GitHub token with admin:org and repo:admin",
      "ServiceNow API with request:write",
      "Azure AD reader for identity validation",
    ],
    triggerCondition: "New GitHub access request submitted via ServiceNow catalog, with manager approval received.",
  },

  40: {
    problemStatement: "Docker Desktop license provisioning requires a multi-step approval chain: ServiceNow request, finance budget approval, IT procurement, license assignment, and Azure AD update. The process takes 2–4 weeks and creates friction for developers who need Docker for immediate project work.",
    aiSolution: "A License Management Agent automates the end-to-end Docker Desktop provisioning: validates finance budget availability, checks license pool, assigns from pool or triggers procurement if exhausted, updates Azure AD for entitlement, and confirms deployment to the developer — all in hours.",
    effortImpact: {
      beforeHrs: 120, afterHrs: 12,
      metrics: [
        { label: "License provisioning time", before: "2–4 weeks", after: "< 4 hrs" },
        { label: "Manual approval steps", before: "5 steps", after: "1 (finance budget gate)" },
        { label: "License pool utilization visibility", before: "Unknown until request", after: "Real-time dashboard" },
      ],
    },
    toolIntegrations: [
      { name: "ServiceNow", role: "License request intake and approval workflow" },
      { name: "Docker", role: "License pool management and assignment" },
      { name: "Azure AD", role: "Entitlement group assignment for Docker Desktop" },
    ],
    agentCapabilities: [
      "Validate finance budget availability for license",
      "Check Docker license pool utilization",
      "Assign license from pool or trigger procurement",
      "Update Azure AD entitlement group",
      "Notify developer with license key and setup instructions",
    ],
    preferredUIElements: [
      "License pool utilization dashboard",
      "Request queue with budget validation status",
      "License assignment confirmation with setup link",
      "Procurement trigger if pool exhausted",
    ],
    inputOutput: {
      input: ["ServiceNow license request", "Business justification", "Cost center"],
      output: ["Docker Desktop license assigned", "Azure AD group updated", "Developer notification with setup guide"],
    },
    integrationRequirements: [
      "Docker license portal API",
      "ServiceNow API with request:write and finance:read",
      "Azure AD app with GroupMember.ReadWrite.All",
    ],
    triggerCondition: "New Docker Desktop license request submitted via ServiceNow catalog.",
  },

  41: {
    problemStatement: "CMDB health is at 67% — 33% of configuration items have missing or incorrect attributes that cause incorrect incident routing, failed change approvals, and inaccurate capacity planning. Manual CMDB data quality is an ongoing, never-completed initiative.",
    aiSolution: "An AI RCA and CMDB Enrichment Agent performs multi-source correlation of problem tickets (ServiceNow) with live topology data (Dynatrace) to perform root cause analysis, and simultaneously enriches CMDB CIs with accurate attributes discovered during the investigation — closing the feedback loop between incidents and data quality.",
    effortImpact: {
      beforeHrs: 640, afterHrs: 128,
      metrics: [
        { label: "CMDB data completeness", before: "67%", after: "> 90%" },
        { label: "RCA time per P2/P3 incident", before: "4+ hrs", after: "< 45 min" },
        { label: "Incorrect incident routing rate", before: "~25%", after: "< 5%" },
      ],
    },
    toolIntegrations: [
      { name: "ServiceNow CMDB", role: "CI data enrichment and incident correlation" },
      { name: "Dynatrace", role: "Live topology and service dependency mapping" },
      { name: "Claude Opus 4", role: "Multi-source reasoning for RCA and data enrichment" },
    ],
    agentCapabilities: [
      "Perform multi-source RCA correlation (ServiceNow + Dynatrace)",
      "Identify and enrich missing CMDB CI attributes",
      "Generate 5-Why root cause analysis for problem tickets",
      "Update CMDB with discovered relationships",
      "Score CMDB health improvement per session",
    ],
    preferredUIElements: [
      "CMDB health score dashboard with CI completeness breakdown",
      "RCA evidence panel with multi-source correlation",
      "CI enrichment queue with before/after attribute diff",
      "Problem ticket RCA timeline",
    ],
    inputOutput: {
      input: ["ServiceNow problem ticket ID", "Dynatrace service name", "CMDB scope (app/service)"],
      output: ["5-Why RCA report", "CMDB CI updates", "Enriched CI attribute report", "CMDB health score delta"],
    },
    integrationRequirements: [
      "ServiceNow CMDB read/write API access",
      "Dynatrace API token with topology:read",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "New ServiceNow problem ticket created, or weekly scheduled CMDB health enrichment sweep.",
  },

  42: {
    problemStatement: "KB articles are outdated an average of 6 months, forcing engineers to spend 45 minutes per incident searching for documentation that doesn't reflect current system behavior. Knowledge capture is an afterthought — only done when someone has spare time.",
    aiSolution: "A Knowledge Fabric AI Agent automatically generates KB articles from resolved incident context, updates existing articles when system changes are detected, and provides a semantic search interface that surfaces the most relevant article — not just keyword-matched results.",
    effortImpact: {
      beforeHrs: 480, afterHrs: 72,
      metrics: [
        { label: "KB search time per incident", before: "45 min avg", after: "< 3 min" },
        { label: "KB article freshness", before: "6 months avg stale", after: "< 2 weeks" },
        { label: "First-call resolution rate", before: "~30%", after: "> 65%" },
      ],
    },
    toolIntegrations: [
      { name: "ServiceNow KB", role: "Article storage and ITSM integration" },
      { name: "Confluence", role: "Engineering documentation source" },
      { name: "Claude Opus 4", role: "Article generation and semantic search" },
    ],
    agentCapabilities: [
      "Auto-generate KB article from resolved incident resolution notes",
      "Update articles when related system changes are detected",
      "Provide semantic search across KB and Confluence",
      "Surface contextually relevant articles during incident triage",
      "Score KB coverage and highlight gaps",
    ],
    preferredUIElements: [
      "Semantic search with relevance-ranked results",
      "KB article auto-draft panel after incident closure",
      "Article freshness indicator per result",
      "Coverage gap heatmap by service area",
    ],
    inputOutput: {
      input: ["ServiceNow resolved incident", "Confluence space list", "Search query"],
      output: ["KB article draft", "Semantic search results with relevance scores", "KB coverage report"],
    },
    integrationRequirements: [
      "ServiceNow KB write API",
      "Confluence API with space:read and page:write",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "ServiceNow incident resolved, or engineer manual KB search query.",
  },

  43: {
    problemStatement: "PCT (Post-Change Testing) validation task management takes 8 days manually with a 22% rework rate — test tasks are created manually in ServiceNow, distributed to engineers via email, and tracked through spreadsheets, with no automated traceability to the originating change.",
    aiSolution: "A PCT Automation Agent automatically creates and assigns validation tasks in ServiceNow when a change is completed, links tasks to the change record and deployment artifact in GitHub, tracks completion status, and escalates overdue tasks with automated reminders.",
    effortImpact: {
      beforeHrs: 320, afterHrs: 64,
      metrics: [
        { label: "PCT task setup time", before: "2 days manual", after: "< 30 min automated" },
        { label: "Task rework rate", before: "22%", after: "< 5% (pre-validated tasks)" },
        { label: "Traceability (change→test→result)", before: "Manual, incomplete", after: "Automated full chain" },
      ],
    },
    toolIntegrations: [
      { name: "ServiceNow", role: "PCT task creation and tracking" },
      { name: "GitHub", role: "Change artifact and deployment link" },
      { name: "Azure DevOps", role: "Test pipeline trigger and result capture" },
    ],
    agentCapabilities: [
      "Auto-create PCT validation tasks from change record",
      "Assign tasks to appropriate team based on change scope",
      "Link tasks to GitHub deployment artifact",
      "Track task completion and escalate overdue items",
      "Generate PCT completion report for CAB",
    ],
    preferredUIElements: [
      "PCT task board with status per validation track",
      "Change-to-test traceability matrix",
      "Overdue task alert dashboard",
      "Completion report generator",
    ],
    inputOutput: {
      input: ["ServiceNow change record", "GitHub deployment tag", "Responsible team roster"],
      output: ["PCT task list in ServiceNow", "Task assignment notifications", "Overdue alerts", "Completion report"],
    },
    integrationRequirements: [
      "ServiceNow API with task:create and change:read",
      "GitHub API with deployment:read",
      "Azure DevOps API with testrun:read",
    ],
    triggerCondition: "ServiceNow change record moves to 'Implementation Complete' status.",
  },

  44: {
    problemStatement: "Post-change health checks require a 4-hour manual window where engineers monitor Dynatrace dashboards, correlate alerts, and manually confirm system stability before closing the change record — keeping engineers tied up and slowing change velocity.",
    aiSolution: "A PCT RCA and Health Check Agent automatically monitors the post-change period using Dynatrace and ServiceNow event feeds, performs AI correlation of any anomalies with the change scope, provides a real-time health verdict, and escalates only genuine issues — reducing the monitoring window from 4 hours to 30 minutes.",
    effortImpact: {
      beforeHrs: 240, afterHrs: 36,
      metrics: [
        { label: "Post-change monitoring window", before: "4 hrs manual", after: "30 min automated" },
        { label: "Engineer tie-up per change", before: "4 hrs dedicated", after: "Alert-driven" },
        { label: "Health verdict accuracy", before: "Engineer judgement", after: "AI correlated data" },
      ],
    },
    toolIntegrations: [
      { name: "Dynatrace", role: "Post-change APM and infrastructure health monitoring" },
      { name: "ServiceNow", role: "Change record update and health verdict" },
      { name: "Claude Opus 4", role: "Anomaly-to-change correlation reasoning" },
    ],
    agentCapabilities: [
      "Monitor Dynatrace for post-change anomalies for defined window",
      "Correlate anomalies with change scope using topology",
      "Provide real-time health verdict (green/yellow/red)",
      "Escalate genuine issues with correlated evidence",
      "Auto-close change record on clean health verdict",
    ],
    preferredUIElements: [
      "Post-change health timeline with anomaly markers",
      "Health verdict gauge (green/yellow/red)",
      "Anomaly-to-change correlation evidence panel",
      "Auto-close countdown with override option",
    ],
    inputOutput: {
      input: ["ServiceNow change record ID", "Dynatrace service scope", "Post-change window duration"],
      output: ["Health verdict report", "Anomaly correlation findings", "Change record auto-close or escalation"],
    },
    integrationRequirements: [
      "Dynatrace API token with problems:read and metrics:read",
      "ServiceNow API with change:update",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "ServiceNow change moves to 'Post-Implementation Review' status, starting the automated monitoring window.",
  },

  45: {
    problemStatement: "PCT RCA (Root Cause Analysis) takes 6+ hours when post-change anomalies appear, requiring manual correlation of signals from Splunk, Dynatrace, and ServiceNow across a complex service topology to determine whether the anomaly is change-related or coincidental.",
    aiSolution: "A PCT RCA Agent automatically correlates Splunk log anomalies, Dynatrace APM signals, and ServiceNow change records using graph-based correlation, performs AI-assisted root cause reasoning, and produces a structured RCA report within 30 minutes — distinguishing change-induced from coincidental anomalies.",
    effortImpact: {
      beforeHrs: 360, afterHrs: 54,
      metrics: [
        { label: "PCT RCA completion time", before: "6+ hrs", after: "< 30 min" },
        { label: "Change-induced vs coincidental classification accuracy", before: "Subjective", after: "> 90% with AI correlation" },
        { label: "Post-incident report effort", before: "2 hrs manual write-up", after: "Auto-generated" },
      ],
    },
    toolIntegrations: [
      { name: "Splunk", role: "Log anomaly detection and search during post-change window" },
      { name: "Dynatrace", role: "APM trace and topology correlation" },
      { name: "ServiceNow", role: "Change record and incident correlation" },
      { name: "Claude Opus 4", role: "Multi-source RCA reasoning and report generation" },
    ],
    agentCapabilities: [
      "Correlate Splunk log anomalies with change timeline",
      "Map Dynatrace service impact to change scope",
      "Classify anomaly as change-induced or coincidental",
      "Generate structured 5-Why RCA report",
      "Create post-incident review document",
    ],
    preferredUIElements: [
      "Multi-source correlation timeline (Splunk + Dynatrace + Change)",
      "Change-induced vs coincidental classification indicator",
      "5-Why RCA breakdown",
      "Auto-generated PIR draft",
    ],
    inputOutput: {
      input: ["ServiceNow change record ID", "Splunk index and time window", "Dynatrace service list"],
      output: ["RCA classification (change-induced/coincidental)", "5-Why report", "Evidence correlation map", "Post-incident review draft"],
    },
    integrationRequirements: [
      "Splunk API token with search:read",
      "Dynatrace API token with traces:read and topology:read",
      "ServiceNow API with change:read and incident:read",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "Post-change anomaly detected during monitoring window, or engineer manual trigger on suspicious system behavior after a change.",
  },

  // ── CAPE — Capacity & Performance Engineering ────────────────────────────────

  46: {
    problemStatement: "Rightsizing and capacity optimization reviews take 2–6 weeks per cycle — engineers manually collect utilization metrics from disparate monitoring tools, analyze sizing across hundreds of servers, databases, and cloud resources, and compile recommendations in spreadsheets with no automated approval routing or execution path. Opportunities pile up unactioned while waste accumulates silently on the monthly bill.",
    aiSolution: "A CAPE Rightsizing Agent ingests utilization metrics from Azure Monitor, Dynatrace, and on-prem monitoring tools, runs AI-driven analysis to identify oversized, undersized, and idle resources, drafts a prioritized recommendations report with projected savings, sequences approval workflows through ServiceNow with stakeholder routing, auto-generates stakeholder communications, and triggers execution steps (Terraform PRs, Azure VM resize) with human sign-off for production changes — compressing a 2–6 week manual cycle to 2–3 days.",
    effortImpact: {
      beforeHrs: 160, afterHrs: 20,
      metrics: [
        { label: "Rightsizing review cycle", before: "2–6 weeks", after: "2–3 days" },
        { label: "Manual metric collection steps", before: "50+ per environment", after: "Automated ingestion" },
        { label: "Recommendation approval time", before: "2+ weeks (manual routing)", after: "< 24 hrs (sequenced)" },
      ],
    },
    toolIntegrations: [
      { name: "Azure Monitor", role: "CPU, memory, network utilization metrics for cloud resources" },
      { name: "Dynatrace", role: "Application and infrastructure performance baselines" },
      { name: "ServiceNow", role: "Approval workflow sequencing and change request management" },
      { name: "Terraform", role: "Infrastructure resize execution via IaC pull request" },
      { name: "Power BI", role: "Rightsizing recommendation report and stakeholder dashboard" },
      { name: "Claude Opus 4", role: "Utilization analysis, recommendation drafting, and communication generation" },
    ],
    agentCapabilities: [
      "Ingest utilization metrics from Azure Monitor, Dynatrace, and on-prem monitoring tools",
      "Identify oversized, undersized, and idle resources using AI-driven threshold analysis",
      "Draft prioritized rightsizing recommendations with projected cost savings per resource",
      "Sequence approval workflows in ServiceNow with stakeholder routing rules",
      "Auto-generate stakeholder communication with business-impact summary",
      "Trigger Terraform PR or Azure resize API call with human sign-off gate for production",
      "Track CAPE KPIs: review coverage (40%) + implementation coverage (60%) = 100% success score",
    ],
    preferredUIElements: [
      "Resource utilization heatmap (CPU/memory/storage) across on-prem and cloud environments",
      "Rightsizing recommendation queue with savings forecast and priority ranking",
      "CAPE coverage scorecard (0.4 × reviews% + 0.6 × implementations% = success%)",
      "Approval workflow tracker with per-stakeholder status per recommendation",
      "Before/after resource specification comparison panel",
      "Terraform diff preview with cost impact before execution",
    ],
    inputOutput: {
      input: ["Azure subscription ID or on-prem environment scope", "Monitoring tool API credentials", "CAPE review schedule configuration", "Approval routing rules per stakeholder tier"],
      output: ["Prioritized rightsizing recommendation report", "ServiceNow approval workflows per recommendation", "Stakeholder communication drafts", "Terraform PRs for approved resize changes", "CAPE coverage KPI scorecard"],
    },
    integrationRequirements: [
      "Azure Monitor reader role on target subscriptions",
      "Dynatrace API token with metrics:read and host:read",
      "ServiceNow service account with change:write and approval:route",
      "Terraform Cloud workspace with plan and apply access",
      "Power BI API with dataset:write for KPI reporting",
      "Anthropic API key (Claude Opus 4)",
    ],
    triggerCondition: "Scheduled periodic CAPE review cycle (monthly or quarterly), or on-demand when Azure Monitor or Dynatrace detects resource utilization below 20% for 7+ consecutive days, signaling a rightsizing opportunity.",
  },
}
