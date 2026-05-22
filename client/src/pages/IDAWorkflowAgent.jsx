import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, CheckCircle2, XCircle, Loader2, Play, RefreshCw, Zap, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, RotateCcw, Award } from 'lucide-react'
import PipelineFlow from '../components/PipelineFlow'
import MetricCounter from '../components/MetricCounter'
import LiveIndicator from '../components/LiveIndicator'

const API_URL = import.meta.env.VITE_API_URL || ''

const WORKFLOW_STEPS_INIT = [
  { id: 'checkout', name: 'Checkout', status: 'pending' },
  { id: 'init', name: 'Terraform Init', status: 'pending' },
  { id: 'plan', name: 'Terraform Plan', status: 'pending' },
  { id: 'ida', name: 'IDA Validation', status: 'pending' },
  { id: 'apply', name: 'Terraform Apply', status: 'pending' },
]

const GRADE_COLORS = {
  'A': 'text-humana-green bg-green-100 border-green-300',
  'B': 'text-blue-700 bg-blue-100 border-blue-300',
  'C': 'text-yellow-700 bg-amber-100 border-amber-300',
  'D': 'text-red-700 bg-red-100 border-red-300',
  'E': 'text-red-900 bg-red-200 border-red-400',
}

const SOURCE_NODES = [
  { id: 'github', label: 'GitHub Logs', status: 'success' },
  { id: 'splunk', label: 'Splunk Telemetry', status: 'success' },
  { id: 'ida_db', label: 'IDA Error DB', status: 'success' },
  { id: 'kb', label: 'Customer KB', status: 'success' },
  { id: 'ai', label: 'AI Brain', status: 'active' },
  { id: 'rca', label: 'RCA Output', status: 'idle' },
]

function WorkflowStep({ step, index }) {
  const statusIcon = {
    pending: <div className="w-5 h-5 rounded-full border-2 border-gray-300" />,
    running: <Loader2 size={20} className="animate-spin text-blue-500" />,
    success: <CheckCircle2 size={20} className="text-humana-green" />,
    failure: <XCircle size={20} className="text-red-500" />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12 }}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        step.status === 'running' ? 'bg-blue-50 border-blue-200' :
        step.status === 'success' ? 'bg-green-50 border-green-200' :
        step.status === 'failure' ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="shrink-0">{statusIcon[step.status] || statusIcon.pending}</div>
      <div className="flex-1">
        <div className={`text-sm font-semibold ${step.status === 'failure' ? 'text-red-700' : step.status === 'success' ? 'text-humana-navy' : 'text-gray-600'}`}>
          {step.name}
        </div>
        {step.error && (
          <div className="text-xs text-red-600 mt-0.5 font-mono leading-tight">{step.error.slice(0, 120)}...</div>
        )}
        {step.grade && (
          <div className="text-xs text-humana-green font-bold mt-0.5">IDA Grade: {step.grade} ✓</div>
        )}
      </div>
      {step.status === 'running' && (
        <span className="text-xs text-blue-500 animate-pulse">Running...</span>
      )}
    </motion.div>
  )
}

function FiveWhyAccordion({ fiveWhy = [] }) {
  const [open, setOpen] = useState(null)
  if (!fiveWhy.length) return null

  return (
    <div className="space-y-1.5">
      {fiveWhy.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-xs font-semibold text-humana-navy">{item.question}</span>
            {open === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-3 py-2 text-xs text-gray-700 bg-white"
              >
                {item.answer}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

export default function IDAWorkflowAgent({ scenario }) {
  const [workflowState, setWorkflowState] = useState('idle') // idle, running, failed, retrying, passed
  const [steps, setSteps] = useState(WORKFLOW_STEPS_INIT)
  const [logLines, setLogLines] = useState([])
  const [analysisState, setAnalysisState] = useState('idle') // idle, analyzing, done
  const [analysis, setAnalysis] = useState(null)
  const [grade, setGrade] = useState(null)
  const [checkedSteps, setCheckedSteps] = useState({})
  const [teamsMessage, setTeamsMessage] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [aiDuration, setAiDuration] = useState(null)
  const [runId, setRunId] = useState(null)
  const logEndRef = useRef(null)

  useEffect(() => {
    if (scenario === 'trigger-ida-failure') triggerFailure()
  }, [scenario])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logLines])

  const triggerFailure = async () => {
    setWorkflowState('running')
    setSteps(WORKFLOW_STEPS_INIT.map(s => ({ ...s, status: 'pending' })))
    setLogLines([])
    setAnalysis(null)
    setGrade(null)
    setCheckedSteps({})

    // Simulate workflow steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 400))
      const shouldFail = i === 3 // IDA Validation fails

      setSteps(prev => prev.map((s, idx) => {
        if (idx < i) return { ...s, status: 'success' }
        if (idx === i) return {
          ...s, status: shouldFail ? 'failure' : 'running',
          error: shouldFail ? 'IDA Grade D — Missing required tags on azurerm_kubernetes_cluster. SSH port 22 open to 0.0.0.0/0. public_blob_access_enabled = true violates HIPAA.' : undefined,
        }
        return s
      }))

      if (shouldFail) {
        setWorkflowState('failed')
        break
      }
    }

    // Start AI analysis
    await analyzeFailure()
  }

  const analyzeFailure = async () => {
    setAnalysisState('analyzing')
    setLogLines([])

    try {
      const r = await fetch(`${API_URL}/api/ida/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'grade-d' }),
      })

      const reader = r.body.getReader()
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
            if (data.type === 'meta') {
              setGrade(data.grade)
              setRunId(data.runId)
            }
            if (data.type === 'log') {
              setLogLines(prev => [...prev, data.line])
            }
            if (data.type === 'analysis') {
              setAnalysis(data.content)
              setConfidence(data.confidence)
              setAiDuration(data.duration)
              setAnalysisState('done')
              setTeamsMessage({
                to: 'Platform Engineering',
                message: `🤖 IDA AI Agent — ${data.content?.rootCause?.slice(0, 120) || 'Analysis complete'}. Auto-remediation steps generated. Est. fix time: ${data.content?.estimatedFixTime || '35 min'}`,
              })
              SOURCE_NODES[4].status = 'success'
              SOURCE_NODES[5].status = 'success'
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setAnalysisState('done')
    }
  }

  const triggerRerun = async () => {
    setWorkflowState('retrying')
    setSteps(WORKFLOW_STEPS_INIT.map(s => ({ ...s, status: 'pending' })))
    setLogLines([])

    for (let i = 0; i < WORKFLOW_STEPS_INIT.length; i++) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 300))
      setSteps(prev => prev.map((s, idx) => {
        if (idx <= i) return { ...s, status: 'success', error: undefined, grade: idx === 4 ? 'A' : undefined }
        return s
      }))
    }
    setWorkflowState('passed')
    setGrade('A')
  }

  const toggleCheck = (stepIdx) => {
    setCheckedSteps(prev => ({ ...prev, [stepIdx]: !prev[stepIdx] }))
  }

  return (
    <div className="min-h-screen bg-humana-light">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <GitBranch size={12} className="text-humana-navy" />
              UC #9 · Automation Engineering
            </div>
            <h1 className="text-xl font-bold text-humana-navy">IDA Workflow Assist Agent</h1>
            <p className="text-sm text-gray-500 mt-0.5">AI-powered IDA pipeline failure RCA with automated remediation guidance</p>
          </div>
          <div className="flex items-center gap-3">
            {workflowState !== 'idle' && (
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                workflowState === 'passed' ? 'bg-green-50 text-humana-green border-green-200' :
                workflowState === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${workflowState === 'passed' ? 'bg-humana-green' : workflowState === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`} />
                {workflowState === 'passed' ? 'Pipeline Passed (Grade A)' :
                 workflowState === 'failed' ? 'Pipeline Failed (Grade D)' :
                 workflowState === 'retrying' ? 'Re-running Pipeline...' : 'Running...'}
              </div>
            )}
            <button onClick={triggerFailure} disabled={workflowState === 'running' || workflowState === 'retrying'} className="btn-primary text-sm">
              {workflowState === 'running' || workflowState === 'retrying' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
              Trigger IDA Failure
            </button>
          </div>
        </div>
      </div>

      {/* Status strip */}
      {(confidence || aiDuration) && (
        <div className="bg-humana-navy px-6 py-2.5 flex items-center gap-4 text-white text-xs">
          {confidence && <span className="text-white/60">AI Confidence: <span className="text-humana-green font-bold">{confidence}%</span></span>}
          {aiDuration && <span className="text-white/60">Groq responded in <span className="text-amber-400 font-bold">{(aiDuration / 1000).toFixed(2)}s</span></span>}
        </div>
      )}

      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Column 1: GitHub Workflow */}
        <div className="flex flex-col gap-4">
          <div className="card-humana p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-humana-navy text-sm flex items-center gap-2">
                <GitBranch size={14} />
                GitHub Actions Workflow
              </h3>
              {runId && <span className="font-mono text-xs text-gray-400">{runId}</span>}
            </div>
            <div className="bg-gray-900 rounded-lg p-3 mb-3 text-xs font-mono text-gray-400">
              <div className="text-green-400 mb-1">$ git push origin feature/aks-policy-update</div>
              <div className="text-gray-500">IDA Pipeline — humana-iac-modules #247</div>
              <div className="text-gray-500">Branch: feature/aks-policy-update</div>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => <WorkflowStep key={step.id} step={step} index={i} />)}
            </div>
          </div>

          {/* Grade Badge */}
          {grade && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-humana p-4 flex items-center gap-4">
              <div className={`text-5xl font-black px-5 py-3 rounded-xl border-2 ${GRADE_COLORS[grade] || GRADE_COLORS['D']}`}>
                {grade}
              </div>
              <div>
                <div className="font-bold text-humana-navy">IDA Grade {grade}</div>
                <div className="text-sm text-gray-500">{grade === 'A' ? 'All compliance checks passed' : 'Compliance violations detected'}</div>
                {workflowState === 'passed' && (
                  <div className="flex items-center gap-1 text-humana-green text-sm font-semibold mt-1">
                    <CheckCircle2 size={14} />Pipeline re-run: PASSED
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Column 2: AI Analysis Engine */}
        <div className="flex flex-col gap-4">
          <div className="card-humana p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-humana-navy text-sm flex items-center gap-2">
                <Zap size={14} className="text-humana-green" />
                AI Analysis Engine
              </h3>
              {analysisState === 'analyzing' && <LiveIndicator label="ANALYZING" color="teal" />}
            </div>

            {/* Source correlation animation */}
            <div className="mb-3">
              <PipelineFlow nodes={SOURCE_NODES} compact />
            </div>

            {/* Log stream */}
            {logLines.length > 0 && (
              <div className="terminal-text p-3 text-xs max-h-52 overflow-y-auto">
                {logLines.map((line, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono leading-relaxed">
                    <span className="text-green-600 mr-1">›</span>
                    <span className={line.includes('FAIL') ? 'text-red-400' : line.includes('WARN') ? 'text-amber-400' : 'text-green-400'}>
                      {line}
                    </span>
                  </motion.div>
                ))}
                {analysisState === 'analyzing' && (
                  <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1 align-text-bottom" />
                )}
                <div ref={logEndRef} />
              </div>
            )}

            {analysisState === 'analyzing' && (
              <div className="flex items-center gap-2 mt-3 text-xs text-humana-teal">
                <Loader2 size={12} className="animate-spin" />
                Groq AI correlating 4 data sources...
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Recommendations */}
        <div className="flex flex-col gap-4">
          {analysis ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-humana p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-humana-navy text-sm flex items-center gap-2">
                  <Award size={14} className="text-amber-500" />
                  AI Recommendations
                </h3>
                {confidence && (
                  <span className="text-xs bg-green-100 text-humana-green font-bold px-2 py-0.5 rounded-full">
                    {confidence}% confidence
                  </span>
                )}
              </div>

              {/* Root Cause */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs font-bold text-red-700 mb-1 uppercase tracking-wide">Root Cause</div>
                <p className="text-sm text-gray-800 leading-relaxed">{analysis.rootCause}</p>
              </div>

              {/* 5-Why */}
              <div>
                <div className="text-xs font-bold text-humana-navy mb-2 uppercase tracking-wide">5-Why Analysis</div>
                <FiveWhyAccordion fiveWhy={analysis.fiveWhy} />
              </div>

              {/* Remediation Checklist */}
              {analysis.remediation?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-humana-navy mb-2 uppercase tracking-wide">
                    Remediation Steps
                    <span className="ml-2 font-normal text-gray-400">
                      {Object.values(checkedSteps).filter(Boolean).length}/{analysis.remediation.length} completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {analysis.remediation.map((step, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${checkedSteps[i] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                        onClick={() => toggleCheck(i)}
                      >
                        <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${checkedSteps[i] ? 'border-humana-green bg-humana-green' : 'border-gray-300'}`}>
                          {checkedSteps[i] && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-semibold ${checkedSteps[i] ? 'line-through text-gray-400' : 'text-humana-navy'}`}>
                            {step.step}. {step.action}
                          </div>
                          {step.code && (
                            <pre className="text-xs text-gray-600 bg-gray-100 rounded p-1.5 mt-1 overflow-x-auto font-mono">{step.code}</pre>
                          )}
                          {step.effort && <span className="text-xs text-gray-400 mt-0.5">Est: {step.effort}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.kbArticle && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center gap-2">
                  <span className="text-xs font-mono text-blue-700 font-semibold">{analysis.kbArticle}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Est. fix time:</span>
                <span className="text-humana-green font-bold">{analysis.estimatedFixTime}</span>
              </div>

              {/* Teams notification preview */}
              {teamsMessage && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-indigo-700 mb-1 flex items-center gap-1.5">
                    <MessageSquare size={11} />
                    Teams Notification Preview
                  </div>
                  <p className="text-xs text-gray-700">{teamsMessage.message}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={triggerRerun}
                  disabled={workflowState === 'retrying' || workflowState === 'passed'}
                  className="btn-primary text-sm justify-center"
                >
                  {workflowState === 'retrying' ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  {workflowState === 'passed' ? 'Pipeline Passed ✓' : workflowState === 'retrying' ? 'Re-running...' : 'Trigger Workflow Re-run'}
                </button>
                <button className="btn-secondary text-sm justify-center">
                  <MessageSquare size={14} />
                  Notify Developer on Teams
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="card-humana p-8 flex flex-col items-center gap-4 text-center flex-1">
              <Zap size={40} className="text-gray-200" />
              <div>
                <div className="text-humana-navy font-semibold">AI Analysis Pending</div>
                <div className="text-gray-400 text-sm mt-1">Click "Trigger IDA Failure" to start the live analysis demo</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
