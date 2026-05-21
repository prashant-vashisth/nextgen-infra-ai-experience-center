# Humana AI Operations Hub

**Live interactive demo platform for Humana CTO Bobby Mukundan and infrastructure leadership.**

Built with React + Tailwind CSS (frontend), Node.js/Express (backend), Groq AI (LLM), Azure ARM API, ServiceNow REST API, and GitHub API.

---

## Quick Start

### 1. Configure API Keys

```bash
cp server/.env.example server/.env
# Edit server/.env with your keys
```

Required keys (app works in demo mode without them):
| Key | Source | Notes |
|-----|--------|-------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Free tier, get instantly |
| `GITHUB_TOKEN` | GitHub → Settings → Developer tokens | PAT with `repo` + `workflow` scope |
| `GITHUB_REPO_OWNER` | Your GitHub username | |
| `GITHUB_REPO_NAME` | `humana-aks-demo` | Create this repo on GitHub |
| `AZURE_CLIENT_ID` | Azure AD App Registration | Free tier ($300 credit) |
| `AZURE_CLIENT_SECRET` | Azure AD App Registration | |
| `AZURE_TENANT_ID` | Azure portal → Azure Active Directory | |
| `AZURE_SUBSCRIPTION_ID` | Azure portal → Subscriptions | |
| `SNOW_INSTANCE` | ServiceNow Developer Instance (free) | Format: `dev12345.service-now.com` |
| `SNOW_USERNAME` | ServiceNow admin | Default: `admin` |
| `SNOW_PASSWORD` | ServiceNow admin password | |

### 2. Install & Run

```bash
# Install dependencies
cd client && npm install && cd ../server && npm install

# Start both servers (in separate terminals)
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

App runs at **http://localhost:5173**

---

## Demo Flow (90 minutes)

| Time | Demo | Route |
|------|------|-------|
| 0:00 | Home Dashboard | `/` |
| 0:10 | IDA Workflow Assist Agent | `/demo/ida-workflow-agent` |
| 0:30 | Batch Health Analyzer | `/demo/batch-health-analyzer` |
| 0:50 | RCA + CMDB Agent | `/demo/rca-cmdb-agent` |
| 1:10 | AKS Vulnerability Agent | `/demo/aks-vulnerability-agent` |
| 1:25 | Q&A / Catalog | `/catalog` |

### Presenter Controls
Click **"Presenter Mode"** in the header to activate the bottom toolbar with:
- **Trigger IDA Failure** — injects a Terraform compliance error
- **Batch Job Failure** — marks a Control-M job as failed
- **Inject Critical CVE** — triggers AKS scan
- **Create Problem Ticket** — creates a ServiceNow problem ticket
- **Reset All Demos** — resets state

---

## Architecture

```
client/          React + Tailwind + Vite frontend
  src/
    components/  Shared: HumanaHeader, PipelineFlow, GroqStream, MetricCounter, LiveIndicator
    pages/       Home, Catalog, IDAWorkflowAgent, BatchHealthAnalyzer, RCAandCMDB, AKSVulnerability

server/          Node.js + Express backend
  routes/
    groq.js      Groq API streaming SSE + completion
    azure.js     Azure ARM API (AKS clusters, compliance)
    github.js    GitHub Actions workflow runs + PR creation
    servicenow.js ServiceNow incidents, problems, KB articles
    batch.js     Batch job data (Control-M, Mainframe, Toad, Informatica, Nabu)
    ida.js       IDA pipeline analysis SSE stream
    aks.js       AKS CVE scan + AI remediation SSE stream
```

### Graceful Fallbacks
All demo UIs work **without any API keys configured**. When keys are missing:
- Groq API → realistic pre-written AI responses streamed word-by-word
- Azure → mock cluster data (3 realistic Humana AKS clusters)
- ServiceNow → mock tickets with Humana-specific data
- GitHub → mock workflow runs and PR creation

---

## Deploy to Render.com

```bash
# Push to GitHub, then connect repo in Render dashboard
# render.yaml is pre-configured for both services

# Set environment variables in Render dashboard under:
# humana-ai-ops-backend → Environment
```

The `render.yaml` file configures:
- `humana-ai-ops-backend` — Node.js web service on port 3001
- `humana-ai-ops-frontend` — Static site from `client/dist`

---

## Use Case Catalog

All 45 use cases across 4 domains are included in the catalog:

| Domain | Count | Live Demos |
|--------|-------|-----------|
| Automation Engineering | 15 | IDA Workflow Assist Agent |
| Infra Ops / ESC | 19 | Batch Health Analyzer, RCA + CMDB |
| Security Engineering | 5 | AKS Vulnerability Agent |
| Network Operations | 4 | — |

Total estimated savings: **~1,451 FTE-equivalent hours/month** across all 45 use cases.
