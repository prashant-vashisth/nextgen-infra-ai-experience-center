import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Maps every leaf/tower id → its slide deck
const SLIDE_MAP = {
  // Default / All Towers
  default: [
    '/slides/All Tower1.png',
    '/slides/All Tower2.png',
  ],
  // Automation Engineering
  'automation-engineering': [
    '/slides/Automation Engineering1.png',
    '/slides/Automation Engineering2.png',
    '/slides/Automation Engineering3.png',
  ],
  // Security Engineering / KCLM
  'security-engineering': [
    '/slides/CyberSecurity1.png',
    '/slides/CyberSecurity2.png',
    '/slides/CyberSecurity3.png',
  ],
  'iss': [
    '/slides/CyberSecurity1.png',
    '/slides/CyberSecurity2.png',
    '/slides/CyberSecurity3.png',
  ],
  // Enterprise Service Center / IT Ops
  'enterprise-itsm': [
    '/slides/Enterprise Service Center1.png',
    '/slides/Enterprise Service Center2.png',
    '/slides/Enterprise Service Center3.png',
    '/slides/Enterprise Service Center4.png',
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
  // Infra Ops
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
  'security-engineering':   'Security Engineering',
  'iss':                    'Security Engineering',
  'enterprise-itsm':        'Enterprise Service Center',
  'incident-response':      'Enterprise Service Center',
  'toc':                    'Enterprise Service Center',
  'aoc':                    'Enterprise Service Center',
  'cape':                   'Infra Ops',
  'finops':                 'Infra Ops',
  'compute-storage':        'Infra Ops',
}

function getSlidesForLeaf(leafId) {
  if (!leafId) return SLIDE_MAP.default
  return SLIDE_MAP[leafId] || SLIDE_MAP.default
}

export default function SlideViewer({ activeLeaf }) {
  const slides = getSlidesForLeaf(activeLeaf)
  const label  = TOWER_LABELS[activeLeaf || 'default'] || 'All Towers — Overview'

  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  // Reset to first slide whenever the deck changes
  useEffect(() => {
    setFade(false)
    const t = setTimeout(() => { setIdx(0); setFade(true) }, 180)
    return () => clearTimeout(t)
  }, [activeLeaf])

  const go = (dir) => {
    setFade(false)
    setTimeout(() => {
      setIdx(i => (i + dir + slides.length) % slides.length)
      setFade(true)
    }, 160)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-bold text-humana-navy uppercase tracking-wide">{label}</span>
        <span className="text-xs text-gray-400 font-mono">{idx + 1} / {slides.length}</span>
      </div>

      {/* Slide image */}
      <div className="relative bg-gray-50" style={{ minHeight: 320 }}>
        <img
          key={slides[idx]}
          src={slides[idx]}
          alt={`Slide ${idx + 1}`}
          style={{
            width: '100%',
            display: 'block',
            objectFit: 'contain',
            maxHeight: 520,
            opacity: fade ? 1 : 0,
            transition: 'opacity 0.18s ease',
          }}
        />
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => go(-1)}
          disabled={slides.length <= 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-humana-navy hover:text-white hover:border-humana-navy transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true) }, 160) }}
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
          onClick={() => go(1)}
          disabled={slides.length <= 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-humana-navy hover:text-white hover:border-humana-navy transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
