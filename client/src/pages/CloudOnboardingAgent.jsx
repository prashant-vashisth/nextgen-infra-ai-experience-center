import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, CheckCircle2, XCircle, Loader2, Play, GitBranch, Shield, RefreshCw, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const CAT_COLORS = {
  Governance:   'text-purple-700 bg-purple-50 border-purple-200',
  Compliance:   'text-red-700 bg-red-50 border-red-200',
  Security:     'text-orange-700 bg-orange-50 border-orange-200',
  Reliability:  'text-blue-700 bg-blue-50 border-blue-200',
  Efficiency:   'text-humana-teal bg-teal-50 border-teal-200',
  Observability:'text-indigo-700 bg-indigo-50 border-indigo-200',
}

const GRADE_STYLE = { A: 'text-humana-green bg-green-50 border-green-300', B: 'text-blue-700 bg-blue-50 border-blue-300', C: 'text-amber-700 bg-amber-50 border-amber-300', D: 'text-red-700 bg-red-50 border-red-300', E: 'text-red-900 bg-red-100 border-red-400' }

export default function CloudOnboardingAgent() {
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState('humana-aks-demo')
  const [phase, setPhase] = useState('idle')   // idle | validating | done
  const [steps, setSteps] = useState([])
  const [results, setResults] = useState([])
  const [grade, setGrade] = useState(null)
  const [remediation, setRemediation] = useState('')
  const [tfSnippet, setTfSnippet] = useState('')
  const [showTf, setShowTf] = useState(false)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/cloudops/repos`).then(r => r.json()).then(d => setRepos(d.repos || [])).catch(() => {})
  }, [])

  const runValidation = async () => {
    setPhase('validating')
    setSteps([])
    setResults([])
    setGrade(null)
    setRemediation('')
    setTfSnippet('')
    setSummary(null)

    try {
      const r = await fetch(`${API_URL}/api/cloudops/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: selectedRepo }),
      })
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type === 'step') setSteps(p => [...p, d.message])
            if (d.type === 'results') {
              setResults(d.results)
              setGrade(d.grade)
              setSummary({ passed: d.passed, failed: d.failed, criticalFails: d.criticalFails })
              if (d.tfContent) setTfSnippet(d.tfContent)
            }
            if (d.type === 'remediation') setRemediation(d.content)
            if (d.type === 'done') setPhase('done')
          } catch { /* ignore */ }
        }
      }
    } catch { setPhase('idle') }
  }

  const categories = [...new Set(results.map(r => r.category))]

  return (
    <div className="min-h-screen bg-humana-light">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Cloud size={12} className="text-humana-teal" />
              UC #6 · Cloud Engineering
            </div>
            <h1 className="text-xl font-bold text-humana-navy">Cloud Onboarding AI Validation Agent</h1>
            <p className="text-sm text-gray-500 mt-0.5">Reads real Terraform from GitHub → runs 12 IDA compliance checks → AI remediates failures</p>
          </div>
          {phase === 'validating' && <LiveIndicator label="SCANNING" color="teal" />}
        </div>
      </div>

      <div className="bg-humana-navy text-white px-6 py-3 flex flex-wrap items-center gap-8 text-sm">
        <span className="text-white/50 line-through">Manual onboarding checklist: 3 days · 47 manual steps</span>
        <span className="text-humana-green font-black text-lg">→</span>
        <span>AI validation: <span className="text-humana-green font-black">under 60 seconds</span> · <span className="text-humana-green font-black">12 automated checks</span> · real GitHub repo</span>
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* LEFT — Repo selector + scan log */}
        <div className="flex flex-col gap-4">
          <div className="card-humana p-4">
            <h3 className="text-sm font-semibold text-humana-navy mb-3 flex items-center gap-2">
              <GitBranch size={14} />Select Repository
            </h3>
            <div className="space-y-1.5 mb-4">
              {repos.length > 0 ? repos.map(repo => (
                <button key={repo.name} onClick={() => setSelectedRepo(repo.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${selectedRepo === repo.name ? 'border-humana-green bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="font-semibold text-humana-navy">{repo.name}</div>
                  <div className="text-gray-400 mt-0.5">{repo.language} · {new Date(repo.updatedAt).toLocaleDateString()}</div>
                </button>
              )) : (
                <button onClick={() => setSelectedRepo('humana-aks-demo')}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs border-humana-green bg-green-50`}>
                  <div className="font-semibold text-humana-navy">humana-aks-demo</div>
                  <div className="text-gray-400">HCL · Terraform AKS config</div>
                </button>
              )}
            </div>
            <button onClick={runValidation} disabled={phase === 'validating'} className="w-full btn-primary text-sm justify-center">
              {phase === 'validating' ? <><Loader2 size={14} className="animate-spin" />Validating...</> : <><Play size={14} fill="currentColor" />Run IDA Validation</>}
            </button>
          </div>

          {/* Scan log */}
          {steps.length > 0 && (
            <div className="card-humana p-4">
              <div className="text-xs font-bold text-humana-navy mb-2 uppercase tracking-wide">Scan Log</div>
              <div className="space-y-1">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <CheckCircle2 size={11} className="text-humana-green mt-0.5 shrink-0" />
                    {s}
                  </div>
                ))}
                {phase === 'validating' && <div className="flex items-center gap-1.5 text-xs text-humana-teal"><Loader2 size={11} className="animate-spin" />Processing...</div>}
              </div>
            </div>
          )}
        </div>

        {/* CENTER — Check results */}
        <div className="flex flex-col gap-4">
          {grade && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-humana p-4 flex items-center gap-4">
              <div className={`text-5xl font-black px-5 py-3 rounded-xl border-2 ${GRADE_STYLE[grade]}`}>{grade}</div>
              <div>
                <div className="font-bold text-humana-navy text-lg">IDA Grade {grade}</div>
                {summary && (
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className="text-humana-green font-semibold">{summary.passed} passed</span>
                    <span className="text-red-600 font-semibold">{summary.failed} failed</span>
                    {summary.criticalFails > 0 && <span className="text-red-700 font-bold">{summary.criticalFails} critical</span>}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">Repo: <span className="font-mono">{selectedRepo}</span></div>
              </div>
            </motion.div>
          )}

          {results.length > 0 && (
            <div className="card-humana overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-humana-navy">12 IDA Compliance Checks</span>
              </div>
              <div className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-2.5">
                    {r.passed ? <CheckCircle2 size={16} className="text-humana-green shrink-0" /> : <XCircle size={16} className={`shrink-0 ${r.critical ? 'text-red-500' : 'text-amber-500'}`} />}
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold ${r.passed ? 'text-gray-700' : r.critical ? 'text-red-700' : 'text-amber-700'}`}>{r.label}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CAT_COLORS[r.category] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>{r.category}</span>
                    {r.critical && !r.passed && <span className="text-xs font-bold text-red-600">CRITICAL</span>}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Terraform snippet toggle */}
          {tfSnippet && (
            <div className="card-humana overflow-hidden">
              <button onClick={() => setShowTf(p => !p)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-humana-navy hover:bg-gray-50">
                <span className="flex items-center gap-2"><GitBranch size={13} />Terraform Source</span>
                {showTf ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showTf && (
                <pre className="px-4 pb-4 text-xs font-mono text-gray-700 bg-gray-50 overflow-x-auto whitespace-pre-wrap">{tfSnippet}</pre>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — AI Remediation */}
        <div className="card-humana p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-humana-navy flex items-center gap-2">
            <Zap size={14} className="text-humana-green" />AI Remediation Plan
          </h3>
          {remediation ? (
            <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1">
              {remediation}
            </div>
          ) : phase === 'validating' ? (
            <div className="flex items-center gap-2 text-xs text-humana-teal py-8">
              <Loader2 size={12} className="animate-spin" />Generating remediation for failed checks...
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center py-8 flex-1">Run validation to generate AI remediation plan</div>
          )}
          {grade === 'A' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-humana-green font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} />All checks passed — ready for Terraform Apply
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
