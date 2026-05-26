import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, AlertTriangle, CheckCircle2, Loader2, Play, GitPullRequest, Zap, Shield } from 'lucide-react'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const SEV_CFG = {
  critical: { bg: 'bg-red-100 text-red-700 border-red-200', badge: 'bg-red-600 text-white', dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-100 text-orange-700 border-orange-200', badge: 'bg-orange-500 text-white', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-amber-100 text-amber-700 border-amber-200', badge: 'bg-amber-500 text-white', dot: 'bg-amber-400' },
  low:      { bg: 'bg-blue-100 text-blue-700 border-blue-200', badge: 'bg-blue-500 text-white', dot: 'bg-blue-400' },
}

export default function DependencyRiskAgent() {
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState('aks-nodeapp-demo')
  const [phase, setPhase] = useState('idle')
  const [scanSteps, setScanSteps] = useState([])
  const [fileResults, setFileResults] = useState([])
  const [allFindings, setAllFindings] = useState([])
  const [summary, setSummary] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [prCreated, setPrCreated] = useState(null)
  const [isCreatingPr, setIsCreatingPr] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/deps/repos`).then(r => r.json()).then(d => setRepos(d.repos || [])).catch(() => {})
  }, [])

  const runScan = async () => {
    setPhase('scanning')
    setScanSteps([])
    setFileResults([])
    setAllFindings([])
    setSummary(null)
    setAnalysis('')
    setPrCreated(null)

    try {
      const r = await fetch(`${API_URL}/api/deps/scan`, {
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
            if (d.type === 'step') setScanSteps(p => [...p, d.message])
            if (d.type === 'file') {
              setFileResults(p => [...p, d])
              setAllFindings(p => [...p, ...d.findings])
            }
            if (d.type === 'done') {
              setSummary({ total: d.total, critical: d.critical, high: d.high, medium: d.medium })
              setPhase('done')
            }
          } catch { /* ignore */ }
        }
      }
    } catch { setPhase('idle') }
  }

  const runAnalysis = async () => {
    setAnalysis('')
    setIsAnalyzing(true)
    try {
      const r = await fetch(`${API_URL}/api/deps/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findings: allFindings, repo: selectedRepo }),
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
            if (d.token) setAnalysis(p => p + d.token)
          } catch { /* ignore */ }
        }
      }
    } finally { setIsAnalyzing(false) }
  }

  const createPR = async () => {
    setIsCreatingPr(true)
    try {
      const r = await fetch(`${API_URL}/api/deps/create-pr`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: selectedRepo, findings: allFindings }),
      })
      const d = await r.json()
      setPrCreated(d.pr)
    } finally { setIsCreatingPr(false) }
  }

  return (
    <div className="min-h-screen bg-humana-light">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Package size={12} className="text-indigo-600" />
              UC #13 · Automation Engineering
            </div>
            <h1 className="text-xl font-bold text-humana-navy">AI-Driven Dependency Risk Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Scans real GitHub repos for vulnerable dependencies → AI risk analysis → creates remediation PR</p>
          </div>
          {phase === 'scanning' && <LiveIndicator label="SCANNING" color="teal" />}
        </div>
      </div>


      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* LEFT — Repo selector */}
        <div className="flex flex-col gap-4">
          <div className="card-humana p-4">
            <h3 className="text-sm font-semibold text-humana-navy mb-3 flex items-center gap-2">
              <Shield size={14} className="text-indigo-600" />Select Repository to Scan
            </h3>
            <div className="space-y-1.5 mb-4">
              {(repos.length > 0 ? repos : [{ name: 'aks-nodeapp-demo', language: 'JavaScript' }, { name: 'nextgen-infra-ai-experience-center', language: 'JavaScript' }]).map(repo => (
                <button key={repo.name} onClick={() => setSelectedRepo(repo.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${selectedRepo === repo.name ? 'border-humana-green bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="font-semibold text-humana-navy">{repo.name}</div>
                  <div className="text-gray-400">{repo.language}</div>
                </button>
              ))}
            </div>
            <button onClick={runScan} disabled={phase === 'scanning'} className="w-full btn-primary text-sm justify-center">
              {phase === 'scanning' ? <><Loader2 size={14} className="animate-spin" />Scanning...</> : <><Play size={14} fill="currentColor" />Scan Dependencies</>}
            </button>
          </div>

          {/* Scan steps */}
          {scanSteps.length > 0 && (
            <div className="card-humana p-4">
              <div className="text-xs font-bold text-humana-navy mb-2 uppercase">Scan Progress</div>
              <div className="space-y-1">
                {scanSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <CheckCircle2 size={11} className="text-humana-green mt-0.5 shrink-0" />{s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total', value: summary.total, color: 'text-humana-navy' },
                { label: 'Critical', value: summary.critical, color: 'text-red-600' },
                { label: 'High', value: summary.high, color: 'text-orange-600' },
                { label: 'Medium', value: summary.medium, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="card-humana p-3 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER — Findings table */}
        <div className="card-humana overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-humana-navy flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-500" />Vulnerable Packages
            </span>
            {allFindings.length > 0 && <span className="text-xs text-gray-400">{allFindings.length} findings</span>}
          </div>

          {allFindings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold text-left">
                    <th className="px-4 py-2">Package</th>
                    <th className="px-4 py-2">Current</th>
                    <th className="px-4 py-2">Safe</th>
                    <th className="px-4 py-2">CVE</th>
                    <th className="px-4 py-2">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allFindings.map((f, i) => (
                    <motion.tr key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-humana-navy">{f.package}</td>
                      <td className="px-4 py-2.5 font-mono text-red-600">{f.current}</td>
                      <td className="px-4 py-2.5 font-mono text-humana-green font-semibold">{f.safe}</td>
                      <td className="px-4 py-2.5 font-mono text-humana-teal text-xs">{f.cve}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${SEV_CFG[f.severity]?.badge}`}>{f.severity}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Package size={36} className="text-gray-200" />
              <span className="text-sm">Select a repo and click "Scan Dependencies"</span>
            </div>
          )}

          {allFindings.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <button onClick={runAnalysis} disabled={isAnalyzing} className="btn-primary text-xs py-1.5 flex-1 justify-center">
                {isAnalyzing ? <><Loader2 size={12} className="animate-spin" />Analyzing...</> : <><Zap size={12} />AI Risk Analysis</>}
              </button>
              <button onClick={createPR} disabled={isCreatingPr || !!prCreated} className="btn-secondary text-xs py-1.5 flex-1 justify-center">
                {isCreatingPr ? <><Loader2 size={12} className="animate-spin" />Creating PR...</> : prCreated ? <><CheckCircle2 size={12} />PR Created</> : <><GitPullRequest size={12} />Create Fix PR</>}
              </button>
            </div>
          )}
          {prCreated && (
            <div className="px-4 pb-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2 text-xs">
                <CheckCircle2 size={13} className="text-humana-green" />
                <span className="font-semibold text-humana-green">PR #{prCreated.number}</span>
                <span className="text-gray-500 truncate">{prCreated.title}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — AI Analysis */}
        <div className="card-humana p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-humana-navy flex items-center gap-2">
              <Zap size={14} className="text-humana-green" />AI Risk Analysis
            </span>
            {isAnalyzing && <LiveIndicator label="ANALYZING" color="teal" />}
          </div>
          {(analysis || isAnalyzing) ? (
            <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1">
              {analysis}
              {isAnalyzing && <span className="inline-block w-1.5 h-4 bg-humana-green ml-0.5 animate-pulse align-text-bottom" />}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-sm py-8">
              Run a scan then click "AI Risk Analysis" to get upgrade recommendations
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
