import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  Send, Bot, User, Loader2, ExternalLink, Info,
  ShieldAlert, ShieldCheck, HelpCircle, TrendingUp,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Pipeline run data ────────────────────────────────────────────────────────
// Risk/penalty score — LOWER score = BETTER grade.  A (0–5)  B (6–10)  C (11–20)  D (21–30)  E (>30)

const PIPELINE_RUNS = [
  {
    id: '25758381652/1/75652806679',
    shortId: '25758381652',
    status: 'success', grade: 'A',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'demo-PassingAppSvc',
    workspace: 'AZURE-SEIA-LOADBALANCER-CLOUD3-NPE',
    moduleVersions: { 'se-loadbalancer-cloud-3-0': ['1.0.8'] },
    scores: { createScore: 3, deleteScore: 0, updateScore: 0, finalScore: 3, policyScore: 0, totalScore: 3 },
    budget: { status: 'warning', currentSpend: 189443.55, budget: 486137.10, remaining: 296693.55, forecastYearEnd: 511341.40 },
    error: null, duration: '2m 16s', ago: '2 weeks ago',
    runLink: 'https://app.terraform.io/app/humanaprd/AZURE-SEIA-LOADBALANCER-CLOUD3-NPE/runs/run-4nmWWBjcNzL7dbA4',
    riskLevel: 'low', riskReason: 'Create-only deployment — no resource terminations or mutations',
  },
  {
    id: '25377392009/1/74416084158',
    shortId: '25377392009',
    status: 'failure', grade: 'NA',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'demo-PassingAppSvc',
    workspace: 'AZURE-SEIA-LOADBALANCER-CLOUD3-NPE',
    moduleVersions: { 'se-loadbalancer-cloud-3-0': ['1.0.8'] },
    scores: { createScore: 0, deleteScore: 0, updateScore: 0, finalScore: 0, policyScore: 0, totalScore: 0 },
    budget: null,
    error: 'Error in speculative plan: unauthorized',
    duration: '32s', ago: '3 weeks ago', runLink: '',
    riskLevel: 'review', riskReason: 'Speculative plan rejected — service principal or token likely expired',
  },
  {
    id: '24654891023/1/73219854671',
    shortId: '24654891023',
    status: 'success', grade: 'D',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'hotfix/vm-scale-down-nonprod',
    workspace: 'AZURE-SEIA-COMPUTE-CLOUD3-NPE',
    moduleVersions: { 'se-compute-cloud-3-0': ['1.5.1'] },
    scores: { createScore: 2, deleteScore: 16, updateScore: 5, finalScore: 23, policyScore: 3, totalScore: 26 },
    budget: { status: 'pass', currentSpend: 423900, budget: 620000, remaining: 196100, forecastYearEnd: 589000 },
    error: null, duration: '3m 42s', ago: '5 weeks ago', runLink: '',
    riskLevel: 'high', riskReason: 'High delete penalty (16) — 14 VM instances will be terminated; policy warnings add +3',
  },
  {
    id: '24234567890/1/71234567890',
    shortId: '24234567890',
    status: 'success', grade: 'C',
    repo: 'Cloud-3-0-EMU/apg-validator',
    branch: 'refactor/network-security-groups',
    workspace: 'AZURE-SEIA-NETWORK-CLOUD3-NPE',
    moduleVersions: { 'se-network-cloud-3-0': ['2.1.0'] },
    scores: { createScore: 4, deleteScore: 4, updateScore: 7, finalScore: 15, policyScore: 1, totalScore: 16 },
    budget: { status: 'pass', currentSpend: 312400, budget: 500000, remaining: 187600, forecastYearEnd: 445000 },
    error: null, duration: '2m 51s', ago: '6 weeks ago', runLink: '',
    riskLevel: 'medium', riskReason: 'Mixed operations — updates to 8 NSG rules and deletion of 3 legacy security groups',
  },
]

const QUICK_ASKS = [
  { label: 'Why did #25377 fail?',      q: 'Why did run #25377392009 fail? Classify the error type and tell me exactly how to fix it.' },
  { label: 'RCA for Grade D run',        q: 'Give me a full root cause analysis for run #24654891023 — why is it Grade D and what is driving the risk?' },
  { label: 'How to improve to Grade A?', q: 'What specific steps can the engineer take to improve run #24654891023 from Grade D to Grade A?' },
  { label: 'Explain grade calculation',  q: 'How does APG calculate the risk/penalty score and assign grades A through E? Note: lower score = better grade. Walk me through the threshold ranges (A: 0–5, B: 6–10, C: 11–20, D: 21–30, E: >30) and how create/update/delete operations contribute to the penalty.' },
  { label: 'Budget warning on #25758',   q: 'Explain the budget warning on run #25758381652 — should I be concerned and what action is needed?' },
]

// ─── Visual helpers ───────────────────────────────────────────────────────────

const GRADE_STYLE = {
  A:  { bg: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-700',  label: 'No risk — safe to approve'         },
  B:  { bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-700',   label: 'Low risk — review updates'         },
  C:  { bg: 'bg-amber-100',  border: 'border-amber-300',  text: 'text-amber-700',  label: 'Medium risk — scrutinise changes'  },
  D:  { bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-700',    label: 'High risk — senior review required'},
  E:  { bg: 'bg-red-200',    border: 'border-red-500',    text: 'text-red-900',    label: 'Critical risk — do not approve'   },
  NA: { bg: 'bg-gray-100',   border: 'border-gray-300',   text: 'text-gray-600',   label: 'Plan failed — fix error first'    },
}

const RISK_STYLE = {
  low    : { icon: ShieldCheck,   bg: 'bg-green-50',  text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500',  label: 'LOW RISK'      },
  medium : { icon: ShieldAlert,   bg: 'bg-amber-50',  text: 'text-amber-700',border: 'border-amber-200',dot: 'bg-amber-500', label: 'MEDIUM RISK'   },
  high   : { icon: ShieldAlert,   bg: 'bg-red-50',    text: 'text-red-700',  border: 'border-red-200',  dot: 'bg-red-500',   label: 'HIGH RISK'     },
  critical:{ icon: AlertTriangle, bg: 'bg-red-100',   text: 'text-red-800',  border: 'border-red-300',  dot: 'bg-red-600',   label: 'CRITICAL'      },
  review : { icon: HelpCircle,    bg: 'bg-gray-50',   text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400',  label: 'NEEDS REVIEW'  },
}

// Grade legend for the sidebar
const GRADE_LEGEND = [
  { grade: 'A', range: '0–5',   desc: 'No risk',     cls: 'bg-green-100 text-green-700 border-green-300' },
  { grade: 'B', range: '6–10',  desc: 'Low risk',    cls: 'bg-blue-100  text-blue-700  border-blue-300'  },
  { grade: 'C', range: '11–20', desc: 'Medium risk', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  { grade: 'D', range: '21–30', desc: 'High risk',   cls: 'bg-red-100   text-red-700   border-red-300'   },
  { grade: 'E', range: '>30',   desc: 'Critical',    cls: 'bg-red-200   text-red-900   border-red-500'   },
]

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, max = 20, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-6 text-right">{value}</span>
    </div>
  )
}

// ─── Pipeline run card ────────────────────────────────────────────────────────

function PipelineCard({ run, selected, onClick }) {
  const g = GRADE_STYLE[run.grade] || GRADE_STYLE.NA
  const r = RISK_STYLE[run.riskLevel] || RISK_STYLE.review
  const RiskIcon = r.icon

  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3.5 transition-all duration-200 ${
        selected ? 'border-humana-green bg-white shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}>
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {run.status === 'success'
            ? <CheckCircle2 size={14} className="text-humana-green shrink-0" />
            : <XCircle size={14} className="text-red-500 shrink-0" />}
          <span className="text-xs font-mono text-gray-500 truncate">#{run.shortId}</span>
        </div>
        <div className={`shrink-0 text-xs font-black px-2 py-0.5 rounded border ${g.bg} ${g.border} ${g.text}`}>
          {run.grade}
        </div>
      </div>

      {/* Branch */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <GitBranch size={11} className="text-gray-400 shrink-0" />
        <span className="text-xs text-humana-navy font-medium truncate">{run.branch}</span>
      </div>

      {/* Workspace */}
      <div className="text-xs text-gray-400 truncate mb-2">{run.workspace}</div>

      {/* Score chips */}
      {run.status === 'success' && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-mono">C:{run.scores.createScore}</span>
          <span className={`text-xs border px-1.5 py-0.5 rounded font-mono ${
            run.scores.deleteScore > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}>D:{run.scores.deleteScore}</span>
          <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded font-mono">U:{run.scores.updateScore}</span>
          <span className={`text-xs border px-1.5 py-0.5 rounded font-bold ml-auto ${g.bg} ${g.border} ${g.text}`}>
            {run.scores.totalScore} risk
          </span>
        </div>
      )}

      {/* Error */}
      {run.error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2 font-mono leading-tight">
          {run.error}
        </div>
      )}

      {/* Risk + meta */}
      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded border ${r.bg} ${r.text} ${r.border}`}>
          <RiskIcon size={10} />{r.label}
        </span>
        <span className="text-xs text-gray-400">{run.duration} · {run.ago}</span>
      </div>
    </button>
  )
}

// ─── Score detail panel ───────────────────────────────────────────────────────

function ScoreDetail({ run }) {
  const g = GRADE_STYLE[run.grade] || GRADE_STYLE.NA
  const r = RISK_STYLE[run.riskLevel] || RISK_STYLE.review

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border-b border-gray-200">
      {/* Grade block */}
      <div className="flex items-center gap-3">
        <div className={`text-4xl font-black w-16 h-16 flex items-center justify-center rounded-xl border-2 ${g.bg} ${g.border} ${g.text}`}>
          {run.grade}
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{g.label}</div>
          <div className="text-sm font-bold text-humana-navy mt-0.5">
            Risk Score: <span className={
              run.scores.totalScore <= 5  ? 'text-humana-green' :
              run.scores.totalScore <= 10 ? 'text-blue-600' :
              run.scores.totalScore <= 20 ? 'text-amber-600' : 'text-red-600'
            }>{run.scores.totalScore}</span>
            <span className="text-gray-400 font-normal text-xs ml-1.5">lower = safer</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Ops score: {run.scores.finalScore} · Policy penalty: +{run.scores.policyScore}
          </div>
        </div>
      </div>

      {/* Score bars */}
      {run.status === 'success' && (
        <div className="flex-1 min-w-48 space-y-1.5">
          <ScoreBar label="Create"  value={run.scores.createScore} color="bg-green-400" />
          <ScoreBar label="Delete"  value={run.scores.deleteScore} color="bg-red-400" />
          <ScoreBar label="Update"  value={run.scores.updateScore} color="bg-amber-400" />
          <ScoreBar label="Final"   value={run.scores.finalScore}  color="bg-humana-teal" />
        </div>
      )}

      {/* Budget */}
      {run.budget && (
        <div className={`text-xs rounded-lg border px-3 py-2 self-start ${
          run.budget.status === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className={`font-bold uppercase tracking-wide mb-1 flex items-center gap-1 ${
            run.budget.status === 'warning' ? 'text-amber-700' : 'text-green-700'
          }`}>
            {run.budget.status === 'warning' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
            Budget {run.budget.status}
          </div>
          <div className="text-gray-600 space-y-0.5">
            <div>Spent: ${run.budget.currentSpend.toLocaleString()}</div>
            <div>Remaining: ${run.budget.remaining.toLocaleString()}</div>
            <div className={run.budget.forecastYearEnd > run.budget.budget ? 'text-amber-700 font-semibold' : 'text-gray-500'}>
              Forecast: ${run.budget.forecastYearEnd.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Risk reason */}
      <div className={`text-xs rounded-lg border px-3 py-2 self-start max-w-52 ${
        RISK_STYLE[run.riskLevel]?.bg || 'bg-gray-50'
      } ${RISK_STYLE[run.riskLevel]?.border || 'border-gray-200'}`}>
        <div className={`font-bold uppercase tracking-wide mb-1 ${RISK_STYLE[run.riskLevel]?.text || 'text-gray-600'}`}>
          Risk Assessment
        </div>
        <div className="text-gray-600 leading-relaxed">{run.riskReason}</div>
      </div>

      {/* Module + run link */}
      <div className="text-xs self-start space-y-1">
        <div className="font-semibold text-gray-500 uppercase tracking-wide">Module</div>
        {Object.entries(run.moduleVersions).map(([mod, vers]) => (
          <div key={mod} className="text-humana-navy font-mono bg-gray-100 px-2 py-0.5 rounded">
            {mod}@{vers[0]}
          </div>
        ))}
        {run.runLink && (
          <a href={run.runLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-humana-green font-semibold hover:underline mt-2">
            TFC run <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Chat message ─────────────────────────────────────────────────────────────

function ChatMessage({ msg }) {
  const isAgent = msg.role === 'assistant'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
        isAgent ? 'bg-humana-navy' : 'bg-humana-green'
      }`}>
        {isAgent ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
      </div>
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isAgent
          ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
          : 'bg-humana-green text-white rounded-tr-sm'
      }`}>
        {msg.content}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-4 bg-humana-teal animate-pulse ml-1 align-text-bottom rounded-sm" />
        )}
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INTRO_MSG = {
  role: 'assistant',
  content: "Hi — I'm the Agentic Pipeline Governor (APG) Agent. I have full visibility into 4 pipeline runs for the Cloud-3-0-EMU repository. Each run is assigned a risk/penalty score — lower score means a safer plan and a higher grade. Grade A (score 0–5) means minimal or no changes and no policy failures. Grade E (score >30) means critical risk requiring senior review before approval. Select any run on the left to see its full breakdown, or ask me about error classification, root cause analysis, grade calculations, or how to improve a score.",
}

export default function APGAgent() {
  const [selectedRun, setSelectedRun] = useState(PIPELINE_RUNS[0])
  const [messages, setMessages]       = useState([INTRO_MSG])
  const [input, setInput]             = useState('')
  const [streaming, setStreaming]     = useState(false)
  const chatEndRef = useRef(null)
  const inputRef   = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || streaming) return

    setInput('')
    const userMsg  = { role: 'user', content: userText }
    const agentMsg = { role: 'assistant', content: '', streaming: true }
    setMessages(prev => [...prev, userMsg, agentMsg])
    setStreaming(true)

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(`${API_URL}/api/apg/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) {
              setMessages(prev => {
                const copy = [...prev]
                const last = { ...copy[copy.length - 1] }
                last.content += data.token
                copy[copy.length - 1] = last
                return copy
              })
            }
            if (data.done) {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { ...copy[copy.length - 1], streaming: false }
                return copy
              })
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: "Sorry, I couldn't reach the APG service. Please try again.",
          streaming: false,
        }
        return copy
      })
    }

    setStreaming(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleSelectRun = (run) => {
    setSelectedRun(run)
    const gradeText = run.grade === 'NA' ? 'failed (Grade NA)' : `Grade ${run.grade} (risk score ${run.scores.totalScore} — lower is better)`
    sendMessage(
      `I've selected run #${run.shortId} — ${run.branch}, ${gradeText}, risk: ${run.riskLevel}. ` +
      `Give me a concise summary of this run: what happened, what the score means, and what a reviewer should know.`
    )
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-humana-light overflow-hidden">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
              <GitBranch size={11} className="text-humana-navy" />
              UC #9 · Automation Engineering · Cloud-3-0-EMU/apg-validator
            </div>
            <h1 className="text-lg font-bold text-humana-navy">Agentic Pipeline Governor (APG) Agent</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Risk/penalty scoring — lower score = higher grade · A (0–5) → E (&gt;30) · Error classification · RCA
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 bg-humana-green/10 text-humana-green border border-humana-green/25 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-humana-green animate-pulse" />
              APG Engine Live
            </span>
            <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full font-medium">
              {PIPELINE_RUNS.length} runs · cloud3.humana.com
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Pipeline runs + grade legend ── */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-bold text-humana-navy uppercase tracking-wider">Pipeline Runs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select a run to query the APG agent about it</p>
          </div>

          {/* Score component legend */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="font-bold text-green-600">C</span> Create</span>
            <span className="flex items-center gap-1"><span className="font-bold text-red-600">D</span> Delete</span>
            <span className="flex items-center gap-1"><span className="font-bold text-amber-600">U</span> Update</span>
            <Info size={11} className="text-gray-400 ml-auto" title="Risk/penalty score — lower total = better grade. Delete ops carry highest penalty." />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {PIPELINE_RUNS.map(run => (
              <PipelineCard key={run.id} run={run} selected={selectedRun?.id === run.id} onClick={() => handleSelectRun(run)} />
            ))}
          </div>

          {/* Grade legend */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp size={10} /> Grade Scale — lower score = safer
            </div>
            <div className="space-y-1">
              {GRADE_LEGEND.map(l => (
                <div key={l.grade} className="flex items-center gap-2">
                  <span className={`w-5 h-5 flex items-center justify-center rounded border text-[10px] font-black ${l.cls}`}>{l.grade}</span>
                  <span className="text-xs text-gray-500 w-12">{l.range}</span>
                  <span className="text-xs text-gray-400">{l.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Score detail + chat ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Score detail */}
          <AnimatePresence mode="wait">
            {selectedRun && (
              <motion.div key={selectedRun.id}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                className="shrink-0">
                <ScoreDetail run={selectedRun} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
            <div ref={chatEndRef} />
          </div>

          {/* Quick asks */}
          <div className="shrink-0 px-5 py-2 border-t border-gray-100 bg-white flex gap-2 overflow-x-auto">
            {QUICK_ASKS.map(qa => (
              <button key={qa.label} onClick={() => sendMessage(qa.q)} disabled={streaming}
                className="shrink-0 text-xs bg-gray-50 text-humana-navy border border-gray-200 px-3 py-1.5 rounded-full hover:bg-humana-green/10 hover:border-humana-green/30 hover:text-humana-green transition-colors whitespace-nowrap disabled:opacity-50">
                {qa.label}
              </button>
            ))}
          </div>

          {/* Input bar */}
          <div className="shrink-0 px-5 py-3 border-t border-gray-200 bg-white flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any run — error classification, RCA, grade calculation, how to improve…"
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-humana-green/30 focus:bg-white transition-colors leading-snug max-h-28 overflow-y-auto"
                style={{ fieldSizing: 'content' }}
              />
            </div>
            <button onClick={() => sendMessage()} disabled={!input.trim() || streaming}
              className="shrink-0 w-9 h-9 rounded-xl bg-humana-green text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
