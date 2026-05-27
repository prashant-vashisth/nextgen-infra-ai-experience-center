import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react'

const SLIDE_MAP = {
  default: [
    '/slides/All Tower1.png',
    '/slides/All Tower2.png',
  ],
  'automation-engineering': [
    '/slides/Automation Engineering1.png',
    '/slides/Automation Engineering2.png',
    '/slides/Automation Engineering3.png',
  ],
  'security-engineering': [
    '/slides/CyberSecurity1.png',
    '/slides/CyberSecurity2.png',
    '/slides/CyberSecurity3.png',
  ],
  'enterprise-itsm': [
    '/slides/Enterprise Service Center1.png',
    '/slides/Enterprise Service Center2.png',
    '/slides/Enterprise Service Center3.png',
    '/slides/Enterprise Service Center4.png',
  ],
  'iss': [
    '/slides/Infra Ops1.png',
    '/slides/Infra Ops2.png',
    '/slides/Infra Ops3.png',
    '/slides/Infra Ops4.png',
  ],
  'incident-response': [
    '/slides/Enterprise Service Center1.png',
    '/slides/Enterprise Service Center2.png',
    '/slides/Enterprise Service Center3.png',
    '/slides/Enterprise Service Center4.png',
  ],
  'toc': [
    '/slides/Enterprise Service Center1.png',
    '/slides/Enterprise Service Center2.png',
    '/slides/Enterprise Service Center3.png',
    '/slides/Enterprise Service Center4.png',
  ],
  'aoc': [
    '/slides/Enterprise Service Center1.png',
    '/slides/Enterprise Service Center2.png',
    '/slides/Enterprise Service Center3.png',
    '/slides/Enterprise Service Center4.png',
  ],
  'cape': [
    '/slides/Infra Ops1.png',
    '/slides/Infra Ops2.png',
    '/slides/Infra Ops3.png',
    '/slides/Infra Ops4.png',
  ],
  'finops': [
    '/slides/Infra Ops1.png',
    '/slides/Infra Ops2.png',
    '/slides/Infra Ops3.png',
    '/slides/Infra Ops4.png',
  ],
  'compute-storage': [
    '/slides/Infra Ops1.png',
    '/slides/Infra Ops2.png',
    '/slides/Infra Ops3.png',
    '/slides/Infra Ops4.png',
  ],
}

const TOWER_LABELS = {
  default:                  'All Towers — Overview',
  'automation-engineering': 'Automation Engineering',
  'network-engineering':    'Network Engineering',
  'security-engineering':   'Security Engineering',
  'enterprise-itsm':        'Enterprise Service Center',
  'incident-response':      'Enterprise Service Center',
  'toc':                    'Enterprise Service Center',
  'aoc':                    'Enterprise Service Center',
  'iss':                    'Infra Ops',
  'cape':                   'Infra Ops',
  'finops':                 'Infra Ops',
  'compute-storage':        'Infra Ops',
  'dynatrace':              'Observability & EAI',
  'splunk':                 'Observability & EAI',
  'datapowr':               'Observability & EAI',
  'apigee':                 'Observability & EAI',
  'graphql':                'Observability & EAI',
  'cloud-engineering':      'Platform Engineering',
  'data-engineering':       'Platform Engineering',
}

function getSlidesForLeaf(leafId) {
  if (!leafId) return SLIDE_MAP.default
  return SLIDE_MAP[leafId] || SLIDE_MAP.default
}

function NavBar({ idx, total, onPrev, onNext, onDot }) {
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-gray-100">
      <button
        onClick={onPrev}
        disabled={total <= 1}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-humana-navy hover:text-white hover:border-humana-navy transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} /> Previous
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onDot(i)}
            className="rounded-full transition-all duration-200"
            style={{
              width: i === idx ? 20 : 8,
              height: 8,
              background: i === idx ? '#0099A8' : '#cbd5e1',
            }}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={total <= 1}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-humana-navy hover:text-white hover:border-humana-navy transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default function SlideViewer({ activeLeaf }) {
  const slides = getSlidesForLeaf(activeLeaf)
  const label  = TOWER_LABELS[activeLeaf || 'default'] || 'All Towers — Overview'

  const [idx,       setIdx]       = useState(0)
  const [fade,      setFade]      = useState(true)
  const [expanded,  setExpanded]  = useState(false)
  const [minimized, setMinimized] = useState(false)

  // Reset to slide 1 when deck changes
  useEffect(() => {
    setFade(false)
    const t = setTimeout(() => { setIdx(0); setFade(true) }, 180)
    return () => clearTimeout(t)
  }, [activeLeaf])

  // Close modal on Escape
  useEffect(() => {
    if (!expanded) return
    const handler = (e) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded])

  const transition = useCallback((newIdx) => {
    setFade(false)
    setTimeout(() => { setIdx(newIdx); setFade(true) }, 160)
  }, [])

  const prev = () => transition((idx - 1 + slides.length) % slides.length)
  const next = () => transition((idx + 1) % slides.length)
  const dot  = (i) => transition(i)

  return (
    <>
      {/* ── Inline viewer ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-bold text-humana-navy uppercase tracking-wide">{label}</span>
          <div className="flex items-center gap-2">
            {!minimized && <span className="text-xs text-gray-400 font-mono">{idx + 1} / {slides.length}</span>}
            <button
              onClick={() => setMinimized(m => !m)}
              title={minimized ? 'Restore' : 'Minimize'}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-humana-navy font-semibold border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-100 transition-all"
            >
              <Minimize2 size={13} /> {minimized ? 'Restore' : 'Minimize'}
            </button>
            {!minimized && (
              <button
                onClick={() => setExpanded(true)}
                title="Expand"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-humana-navy font-semibold border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-100 transition-all"
              >
                <Maximize2 size={13} /> Expand
              </button>
            )}
          </div>
        </div>

        {!minimized && (
          <>
            <div className="relative bg-gray-50">
              <img
                key={slides[idx]}
                src={slides[idx]}
                alt={`Slide ${idx + 1}`}
                style={{
                  width: '100%',
                  display: 'block',
                  objectFit: 'contain',
                  maxHeight: 480,
                  opacity: fade ? 1 : 0,
                  transition: 'opacity 0.18s ease',
                }}
              />
            </div>
            <NavBar idx={idx} total={slides.length} onPrev={prev} onNext={next} onDot={dot} />
          </>
        )}
      </div>

      {/* ── Fullscreen modal ── */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false) }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ background: 'rgba(0,40,85,0.95)' }}>
            <span className="text-sm font-bold text-white uppercase tracking-wide">{label}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/50 font-mono">{idx + 1} / {slides.length}</span>
              <button
                onClick={() => setExpanded(false)}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center px-4 py-4 min-h-0">
            <img
              key={`modal-${slides[idx]}`}
              src={slides[idx]}
              alt={`Slide ${idx + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                opacity: fade ? 1 : 0,
                transition: 'opacity 0.18s ease',
              }}
            />
          </div>

          {/* Modal nav */}
          <div className="shrink-0 pb-5" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {/* Arrow buttons on sides for large screens */}
            <div className="relative flex items-center justify-center gap-4 px-6 py-3">
              <button
                onClick={prev}
                disabled={slides.length <= 1}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} /> Previous
              </button>

              <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => dot(i)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === idx ? 24 : 10,
                      height: 10,
                      background: i === idx ? '#0099A8' : 'rgba(255,255,255,0.3)',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={next}
                disabled={slides.length <= 1}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
