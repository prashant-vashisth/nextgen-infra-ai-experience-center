import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, CheckCircle2, ArrowRight, Zap, Settings, LayoutDashboard, TrendingDown, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { UC_DETAILS } from '../data/useCaseDetails'

const DOMAIN_COLOR = {
  'Automation Engineering': 'bg-indigo-600',
  'Infra Ops / ESC':        'bg-emerald-600',
  'Network Operations':     'bg-blue-600',
  'Security Engineering':   'bg-red-600',
}

function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} className="text-humana-teal shrink-0" />
      <span className="text-xs font-bold text-humana-navy uppercase tracking-wider">{label}</span>
    </div>
  )
}

function MetricRow({ label, before, after }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 col-span-1">{label}</span>
      <span className="text-red-600 font-mono font-semibold">{before}</span>
      <span className="text-humana-green font-mono font-semibold flex items-center gap-1">
        <ArrowRight size={10} className="shrink-0" />{after}
      </span>
    </div>
  )
}

function Pill({ text, color = 'bg-gray-100 text-gray-600' }) {
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${color}`}>{text}</span>
}

export default function UseCaseDrawer({ uc, onClose }) {
  const details = uc ? UC_DETAILS[uc.id] : null

  useEffect(() => {
    if (!uc) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [uc, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (uc) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [uc])

  const domainBadge = uc ? (DOMAIN_COLOR[uc.domain] || 'bg-gray-600') : ''
  const reduction = uc
    ? Math.round(((uc.beforeHrs - uc.afterHrs) / uc.beforeHrs) * 100)
    : 0

  return (
    <AnimatePresence>
      {uc && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{ width: '60%' }}
          >
            {/* ── Header ── */}
            <div className="bg-humana-navy px-6 py-5 flex items-start justify-between gap-4 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span className="text-xs font-bold text-white/50">UC #{uc.id}</span>
                  <span className="text-xs bg-white/15 text-white/80 px-2.5 py-0.5 rounded-full font-semibold">{uc.category}</span>
                  <span className={`text-xs text-white px-2.5 py-0.5 rounded-full font-semibold ${domainBadge}`}>{uc.domain}</span>
                  {uc.live && (
                    <span className="badge-live"><span className="live-dot" />LIVE</span>
                  )}
                </div>
                <h2 className="text-base font-bold text-white leading-snug">{uc.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/15 text-white/60 hover:text-white transition-colors shrink-0 mt-0.5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-red-600">{uc.beforeHrs}h</div>
                    <div className="text-xs text-gray-500 mt-0.5">Before (hrs/mo)</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-humana-green">{uc.afterHrs}h</div>
                    <div className="text-xs text-gray-500 mt-0.5">After (hrs/mo)</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-blue-700">{reduction}%</div>
                    <div className="text-xs text-gray-500 mt-0.5">Effort Reduction</div>
                  </div>
                </div>

                {!details ? (
                  <div className="text-sm text-gray-400 text-center py-8">Detail data coming soon.</div>
                ) : (
                  <>
                    {/* ── 1. Problem Statement ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={TrendingDown} label="Problem Statement" />
                      <p className="text-sm text-gray-700 leading-relaxed">{details.problemStatement}</p>
                    </div>

                    {/* ── 2. AI Solution ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={Zap} label="AI Solution" />
                      <p className="text-sm text-gray-700 leading-relaxed">{details.aiSolution}</p>
                    </div>

                    {/* ── 3. Effort Impact Metrics ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={Clock} label="Effort Impact Metrics" />
                      <div className="grid grid-cols-3 gap-2 text-xs font-bold text-gray-400 uppercase mb-1 pb-1 border-b border-gray-200">
                        <span>Metric</span>
                        <span className="text-red-400">Before</span>
                        <span className="text-humana-green">After</span>
                      </div>
                      {details.effortImpact.metrics.map((m, i) => (
                        <MetricRow key={i} label={m.label} before={m.before} after={m.after} />
                      ))}
                    </div>

                    {/* ── 4. Tool Integrations ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={Settings} label="Tool Integrations" />
                      <div className="space-y-2">
                        {details.toolIntegrations.map((t, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="font-semibold text-humana-navy shrink-0 w-32 pt-0.5">{t.name}</span>
                            <span className="text-gray-500 leading-relaxed">{t.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── 5. Agent Capabilities ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={Zap} label="Agent Capabilities" />
                      <ul className="space-y-1.5">
                        {details.agentCapabilities.map((cap, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                            <CheckCircle2 size={12} className="text-humana-green mt-0.5 shrink-0" />
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* ── 6. Preferred UI Elements ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={LayoutDashboard} label="Preferred UI Elements" />
                      <div className="flex flex-wrap gap-2">
                        {details.preferredUIElements.map((el, i) => (
                          <Pill key={i} text={el} color="bg-indigo-50 text-indigo-700" />
                        ))}
                      </div>
                    </div>

                    {/* ── 7. Input / Output ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={ArrowRight} label="Input / Output" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Inputs</div>
                          <ul className="space-y-1">
                            {details.inputOutput.input.map((inp, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <span className="text-humana-teal mt-0.5 shrink-0">›</span>{inp}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Outputs</div>
                          <ul className="space-y-1">
                            {details.inputOutput.output.map((out, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <span className="text-humana-green mt-0.5 shrink-0">›</span>{out}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* ── 8. Integration Requirements ── */}
                    <div className="card-humana p-4">
                      <SectionLabel icon={Settings} label="Integration Requirements" />
                      <ul className="space-y-1.5">
                        {details.integrationRequirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-amber-500 mt-0.5 shrink-0">●</span>{req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* ── 9. Trigger Condition ── */}
                    <div className="card-humana p-4 border-l-4 border-humana-teal">
                      <SectionLabel icon={Zap} label="Trigger Condition" />
                      <p className="text-sm text-gray-700 leading-relaxed">{details.triggerCondition}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            {uc.live && uc.path && (
              <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <Link
                  to={uc.path}
                  onClick={onClose}
                  className="btn-primary text-sm justify-center w-full"
                >
                  Open Live Demo <ExternalLink size={14} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
