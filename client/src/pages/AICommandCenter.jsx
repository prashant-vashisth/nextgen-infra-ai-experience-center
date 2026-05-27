import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, Zap, Shield, RefreshCw, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Clock } from 'lucide-react'

// ── Humana palette ────────────────────────────────────────────────────────────
const C = { blue:'#0099A8', purple:'#7c3aed', green:'#00A651', teal:'#2dd4bf', yellow:'#f59e0b', red:'#ef4444', navy:'#002855' }

// ── Live event feed data ──────────────────────────────────────────────────────
const EVENT_POOL = [
  { icon:'✓', color:'#00A651', text:'INC4782553 auto-resolved — OOMKill in claims-processing namespace', agent:'ClosureAgent', sev:'P2' },
  { icon:'⚡', color:'#0099A8', text:'JWT signing key rotated via Azure Key Vault — auth-gateway restarted', agent:'RemediationAgent', sev:'P1' },
  { icon:'↑', color:'#7c3aed', text:'AKS node pool scaled 4 → 6 nodes — disk pressure cleared', agent:'ScalerAgent', sev:'P2' },
  { icon:'✓', color:'#00A651', text:'CHG0030017 approved & deployed — runc 1.1.10 → 1.1.12 zero downtime', agent:'CVITAgent', sev:'P1' },
  { icon:'⚡', color:'#f59e0b', text:'Slow query alert — avg 4.2s, connection pool expanded 94% → 72%', agent:'DBAgent', sev:'P3' },
  { icon:'↑', color:'#0099A8', text:'Pharmacy-sync restart loop resolved — pod disruption budget applied', agent:'InfraAgent', sev:'P3' },
  { icon:'✓', color:'#00A651', text:'INC4782561 closed — member-portal session cache cleared automatically', agent:'ClosureAgent', sev:'P2' },
  { icon:'⚡', color:'#7c3aed', text:'Certificate expiry warning actioned — 30d → renewed via cert-manager', agent:'SecAgent', sev:'P3' },
  { icon:'↑', color:'#0099A8', text:'Batch job memory limit patched 4Gi → 8Gi — claims-adjud stable', agent:'BatchAgent', sev:'P2' },
  { icon:'✓', color:'#00A651', text:'KB0012341 auto-generated from INC4782553 — RCA documented', agent:'KBAgent', sev:'—' },
  { icon:'⚡', color:'#f59e0b', text:'Network egress spike detected — data-ingestion throttle applied', agent:'NetAgent', sev:'P3' },
  { icon:'↑', color:'#7c3aed', text:'Synthetic monitor degradation — member login SLA breached, escalated', agent:'ObsAgent', sev:'P2' },
  { icon:'✓', color:'#00A651', text:'EOL node:16-alpine → node:20-alpine deployed to claims-processing', agent:'CVITAgent', sev:'P1' },
  { icon:'⚡', color:'#0099A8', text:'Load balancer backend health restored — 3 unhealthy targets replaced', agent:'InfraAgent', sev:'P3' },
  { icon:'↑', color:'#00A651', text:'INC4782570 auto-resolved — GC pause reduced after heap config tuning', agent:'JVMAgent', sev:'P3' },
  { icon:'⚡', color:'#7c3aed', text:'RBAC misconfiguration detected in auth-gateway — access revoked', agent:'SecAgent', sev:'P1' },
  { icon:'✓', color:'#00A651', text:'Change success: Kubernetes 1.28 → 1.30 rollout complete across 3 pools', agent:'K8sAgent', sev:'—' },
  { icon:'↑', color:'#f59e0b', text:'Capacity forecast: claims-processing needs +2 nodes by Thursday', agent:'CapAgent', sev:'—' },
]

const MARQUEE_EVENTS = [
  'AI resolved P2 incident in 4m 12s — avg human: 2.1h',
  'CVIT agent patched CVE-2024-21626 — 3 pods updated zero-downtime',
  'JWT key rotation completed — auth-gateway healthy',
  'AKS node pool scaled up — disk pressure cleared proactively',
  'KB article auto-generated — MTTD reduced 38% this week',
  'Batch job memory increased — OOMKill rate down 94%',
  'Certificate auto-renewed — 847 JWTs unaffected',
  'RCA closed — root cause traced to upstream duplicate records',
  'Change success rate: 94.2% (+3.1% WoW) — AI guardrails active',
  'Deflection rate hit 41% — 1,723 tickets resolved without human touch',
]

// ── Mini helpers ──────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round = (v, d=1) => Math.round(v * 10**d) / 10**d
const jitter = (v, pct=0.015) => v + v * (Math.random() - 0.5) * pct * 2

// ── SVG builders ──────────────────────────────────────────────────────────────
function donutSVG(pct, color, label) {
  const v = clamp(pct || 0, 0, 100), d1 = v * 4.52
  const txt = (label != null && !String(label).includes('undefined')) ? label : `${Math.round(v)}%`
  return `<svg viewBox="0 0 140 140" style="width:100%;max-width:130px;height:auto">
    <circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" stroke-width="14"/>
    <circle cx="70" cy="70" r="52" fill="none" stroke="${color}" stroke-width="14"
      stroke-linecap="round" stroke-dasharray="${d1} 327" transform="rotate(-90 70 70)"
      style="transition:stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)"/>
    <text x="70" y="75" text-anchor="middle" font-size="22" font-weight="800" fill="#002855" font-family="Inter,sans-serif">${txt}</text>
  </svg>`
}

function sparkSVG(values, color, animated=false) {
  if (!values?.length) return ''
  const W=180, H=48
  const lo=Math.min(...values)*0.9, hi=Math.max(...values)*1.1
  const x = i => i * W / Math.max(1, values.length-1)
  const y = v => H - (v-lo)/(hi-lo||1)*(H-8) - 4
  const pts = values.map((v,i) => `${x(i)},${y(v)}`).join(' ')
  const fillPts = `${pts} ${W},${H} 0,${H}`
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" preserveAspectRatio="none">
    <defs><linearGradient id="sg${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon fill="url(#sg${color.replace('#','')})" points="${fillPts}"/>
    <polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/>
    ${values.map((v,i)=> i===values.length-1 ? `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${color}"/>` : '').join('')}
  </svg>`
}

function miniBarSVG(values, labels, colors, W=320, H=180) {
  const pl=32, pr=8, pt=12, pb=30
  const cW=W-pl-pr, cH=H-pt-pb
  const mx=Math.max(1,...values)*1.15
  const bnd=cW/Math.max(values.length,1), bw=bnd*.58
  const grid=[0,.5,1].map(t=>{
    const gy=pt+cH*t, gv=Math.round(mx-mx*t)
    return `<line x1="${pl}" y1="${gy}" x2="${W-pr}" y2="${gy}" stroke="rgba(0,40,85,.08)"/>
      <text x="${pl-4}" y="${gy+4}" text-anchor="end" font-size="9" fill="#94a3b8">${gv}</text>`
  }).join('')
  const bars=values.map((v,i)=>{
    const bh=(v/mx)*cH, bx=pl+i*bnd+(bnd-bw)/2, by=pt+cH-bh
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4" fill="${colors[i%colors.length]}" opacity=".85"/>
      <text x="${bx+bw/2}" y="${H-8}" text-anchor="middle" font-size="9" fill="#475569">${labels[i]}</text>`
  }).join('')
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}${bars}</svg>`
}

function lineSVG(series, labels, colors, W=640, H=200) {
  const pl=36, pr=12, pt=16, pb=28
  const cW=W-pl-pr, cH=H-pt-pb
  const all=series.flatMap(s=>s)
  const lo=Math.max(0,Math.min(...all)-8), hi=Math.min(100,Math.max(...all)+8)
  const x=i=>pl+i*cW/Math.max(1,labels.length-1)
  const y=v=>pt+cH-(v-lo)/(hi-lo||1)*cH
  const grid=[0,.25,.5,.75,1].map(t=>{
    const gy=pt+cH*t, gv=Math.round(hi-(hi-lo)*t)
    return `<line x1="${pl}" y1="${gy}" x2="${W-pr}" y2="${gy}" stroke="rgba(0,40,85,.08)"/>
      <text x="${pl-6}" y="${gy+4}" text-anchor="end" font-size="10" fill="#94a3b8">${gv}</text>`
  }).join('')
  const xl=labels.map((l,i)=>`<text x="${x(i)}" y="${H-4}" text-anchor="middle" font-size="10" fill="#94a3b8">${l}</text>`).join('')
  const lines=series.map((vals,idx)=>{
    const pts=vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ')
    const dots=vals.map((v,i)=> i===vals.length-1
      ? `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${colors[idx]}" stroke="#fff" stroke-width="2"/>`
      : `<circle cx="${x(i)}" cy="${y(v)}" r="2.5" fill="${colors[idx]}" stroke="#fff" stroke-width="1.5"/>`).join('')
    return `<polyline fill="none" stroke="${colors[idx]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>${dots}`
  }).join('')
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}${xl}${lines}</svg>`
}

// ── Animated number display ───────────────────────────────────────────────────
function LiveNum({ value, suffix='', decimals=0, color, size='text-3xl', flash=false }) {
  const [disp, setDisp] = useState(value)
  const [highlight, setHighlight] = useState(false)
  const prev = useRef(value)
  const raf = useRef(null)

  useEffect(() => {
    const start = prev.current, diff = value - start
    if (Math.abs(diff) < 0.001) return
    setHighlight(true)
    setTimeout(() => setHighlight(false), 600)
    const t0 = performance.now(), dur = 900
    const step = now => {
      const p = Math.min((now - t0) / dur, 1)
      const e = 1 - Math.pow(1-p, 3)
      const v = start + diff * e
      setDisp(decimals > 0 ? round(v, decimals) : Math.round(v))
      if (p < 1) { raf.current = requestAnimationFrame(step) }
      else { prev.current = value }
    }
    raf.current = requestAnimationFrame(step)
    return () => raf.current && cancelAnimationFrame(raf.current)
  }, [value])

  return (
    <span className={`${size} font-black tabular-nums transition-colors duration-300 ${highlight ? 'brightness-125' : ''}`}
      style={{ color: highlight ? '#f59e0b' : (color || '#002855') }}>
      {decimals > 0 ? disp.toFixed(decimals) : disp}{suffix}
    </span>
  )
}

// ── Event feed item ───────────────────────────────────────────────────────────
function FeedItem({ event, age }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-gray-100 last:border-0 animate-fadeSlideIn">
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
        style={{ background: event.color + '20', color: event.color }}>{event.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-700 leading-snug line-clamp-2">{event.text}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-500">{event.agent}</span>
          {event.sev !== '—' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: event.sev==='P1'?'#fef2f2':event.sev==='P2'?'#fff7ed':'#f0fdf4',
                       color:      event.sev==='P1'?'#dc2626':event.sev==='P2'?'#d97706':'#15803d' }}>
              {event.sev}
            </span>
          )}
          <span className="text-[10px] text-gray-300 ml-auto">{age}s ago</span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AICommandCenter() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [scaReady, setScaReady] = useState(false)
  const [now, setNow] = useState(new Date())
  const [metrics, setMetrics] = useState({
    sla: 98.2, autonomy: 64, deflection: 41, aiSuccess: 82,
    ticketsResolved: 243, ticketsOpen: 6189, activeAgents: 7,
    avgMTTR: 8.4, avgMTTD: 0.85, costPerTicket: 52.4,
    changeSuccess: 94, rollbackRate: 3, agentCoverage: 78,
    toilAvoided: 312.5, aiWorkShare: 32, cycleP90: 6.2,
    reopenRate: 4.2, repeatRate: 3.1,
  })
  const [feed, setFeed] = useState(() =>
    [...EVENT_POOL].sort(() => Math.random()-0.5).slice(0, 6).map((e,i) => ({ ...e, id: i, age: (i+1)*47 }))
  )
  const [sparkHistory, setSparkHistory] = useState({
    sla:       Array.from({length:12}, (_,i) => 97.5 + i*0.05 + Math.random()*0.3),
    autonomy:  Array.from({length:12}, (_,i) => 60 + i*0.3 + Math.random()*2),
    deflection:Array.from({length:12}, (_,i) => 38 + i*0.2 + Math.random()*2),
    aiSuccess: Array.from({length:12}, (_,i) => 79 + i*0.2 + Math.random()*2),
  })
  const [trendData, setTrendData] = useState({
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    autonomy:   [58,61,63,60,65,62,64],
    coverage:   [72,74,75,73,77,75,78],
    aiSuccess:  [79,81,80,83,82,84,82],
    deflection: [37,38,40,39,41,40,41],
  })
  const [barData] = useState({
    ageBuckets: { '0–2d':892,'3–7d':1243,'8–30d':2418,'31–60d':987,'60+d':649 },
    typeCounts: { Incident:1820,Request:756,Problem:441,Change:686,Access:486 },
  })
  const nextEventIdx = useRef(0)
  const feedTimestamps = useRef(feed.map((_,i) => Date.now() - i*47000))

  // ── SCA: trigger a session the first time the tab opens
  useEffect(() => {
    if (activeTab !== 'sca' || scaReady) return
    fetch('https://humana-sca-demo-791329052527.us-central1.run.app/trigger', { method: 'POST' })
      .finally(() => setScaReady(true))
  }, [activeTab, scaReady])

  // ── 1s: clock + age tickers
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
      setFeed(f => f.map((e,i) => ({ ...e, age: Math.round((Date.now() - feedTimestamps.current[i]) / 1000) })))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // ── 3s: micro-jitter on SLA, aiSuccess
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(m => ({
        ...m,
        sla:       round(clamp(jitter(m.sla, 0.002), 97.0, 99.5), 1),
        aiSuccess: Math.round(clamp(jitter(m.aiSuccess, 0.008), 78, 88)),
        avgMTTD:   round(clamp(jitter(m.avgMTTD, 0.03), 0.5, 1.4), 2),
      }))
      setSparkHistory(h => ({
        ...h,
        sla:      [...h.sla.slice(1), round(clamp(jitter(h.sla[h.sla.length-1], 0.004), 97.0, 99.5), 1)],
        aiSuccess:[...h.aiSuccess.slice(1), Math.round(clamp(jitter(h.aiSuccess[h.aiSuccess.length-1], 0.01), 78, 88))],
      }))
    }, 3000)
    return () => clearInterval(id)
  }, [])

  // ── 5s: autonomy, deflection, toil, workShare
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(m => ({
        ...m,
        autonomy:    Math.round(clamp(jitter(m.autonomy, 0.012), 58, 72)),
        deflection:  Math.round(clamp(jitter(m.deflection, 0.015), 37, 46)),
        aiWorkShare: Math.round(clamp(jitter(m.aiWorkShare, 0.01), 28, 38)),
        toilAvoided: round(clamp(jitter(m.toilAvoided, 0.008), 295, 340), 1),
      }))
      setSparkHistory(h => ({
        ...h,
        autonomy:  [...h.autonomy.slice(1),  Math.round(clamp(jitter(h.autonomy[h.autonomy.length-1], 0.015), 58, 72))],
        deflection:[...h.deflection.slice(1), Math.round(clamp(jitter(h.deflection[h.deflection.length-1], 0.02), 37, 46))],
      }))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // ── 7s: costs, MTTR, coverage, changeSuccess
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(m => ({
        ...m,
        costPerTicket: round(clamp(jitter(m.costPerTicket, 0.02), 44, 62), 1),
        avgMTTR:       round(clamp(jitter(m.avgMTTR, 0.025), 6.5, 11.2), 1),
        agentCoverage: Math.round(clamp(jitter(m.agentCoverage, 0.012), 72, 85)),
        changeSuccess: Math.round(clamp(jitter(m.changeSuccess, 0.008), 90, 97)),
        rollbackRate:  round(clamp(jitter(m.rollbackRate, 0.04), 2, 5), 1),
      }))
    }, 7000)
    return () => clearInterval(id)
  }, [])

  // ── 8s: tickets resolved ticks up (occasionally)
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() > 0.35) {
        setMetrics(m => ({ ...m, ticketsResolved: m.ticketsResolved + 1, ticketsOpen: m.ticketsOpen - 1 }))
      }
    }, 8000)
    return () => clearInterval(id)
  }, [])

  // ── 12s: new event in feed
  useEffect(() => {
    const id = setInterval(() => {
      const idx = nextEventIdx.current % EVENT_POOL.length
      nextEventIdx.current++
      const newEvent = { ...EVENT_POOL[idx], id: Date.now(), age: 0 }
      feedTimestamps.current = [Date.now(), ...feedTimestamps.current.slice(0, 5)]
      setFeed(f => [newEvent, ...f.slice(0, 5)])
    }, 12000)
    return () => clearInterval(id)
  }, [])

  // ── 20s: trend data gets a new streaming point
  useEffect(() => {
    const id = setInterval(() => {
      setTrendData(d => {
        const shift = arr => [...arr.slice(1), Math.round(clamp(jitter(arr[arr.length-1], 0.025), 30, 95))]
        return {
          ...d,
          autonomy:   shift(d.autonomy),
          coverage:   shift(d.coverage),
          aiSuccess:  shift(d.aiSuccess),
          deflection: shift(d.deflection),
        }
      })
    }, 20000)
    return () => clearInterval(id)
  }, [])

  // ── active agents pulses
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(m => ({ ...m, activeAgents: Math.round(clamp(jitter(m.activeAgents, 0.12), 4, 12)) }))
    }, 6000)
    return () => clearInterval(id)
  }, [])

  const m = metrics
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false })

  return (
    <div className="min-h-screen bg-humana-light" style={{ fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div className="bg-humana-navy border-b border-white/10 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-humana-green/20 border border-humana-green/40 flex items-center justify-center">
              <Activity size={16} className="text-humana-green" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white tracking-tight">AI Command Center</span>
                <span className="flex items-center gap-1 bg-humana-green/20 border border-humana-green/40 text-humana-green text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-humana-green animate-pulse" />LIVE
                </span>
              </div>
              <p className="text-white/40 text-[11px]">Humana AI Operations · Real-time intelligence feed</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* ── Nav tabs ── */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
              {[
                { id: 'dashboard', label: 'Command Center' },
                { id: 'sca',       label: 'SCA Agent' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all duration-200"
                  style={{
                    background: activeTab === tab.id ? '#0099A8' : 'transparent',
                    color:      activeTab === tab.id ? '#fff'    : 'rgba(255,255,255,0.5)',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-right">
              <div className="text-white font-mono font-bold text-lg">{timeStr}</div>
              <div className="text-white/40 text-[10px]">{now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Marquee ticker ── */}
      <div className="bg-humana-navy/80 border-b border-white/5 py-2 overflow-hidden">
        <div className="flex items-center gap-2 px-4">
          <span className="text-humana-green font-bold text-[10px] uppercase tracking-widest shrink-0 border border-humana-green/30 px-2 py-0.5 rounded">LIVE FEED</span>
          <div className="flex-1 overflow-hidden relative">
            <div className="flex gap-8 whitespace-nowrap" style={{ animation:'marquee 40s linear infinite' }}>
              {[...MARQUEE_EVENTS,...MARQUEE_EVENTS].map((e,i) => (
                <span key={i} className="text-white/60 text-xs">
                  <span className="text-humana-green mr-1">▸</span>{e}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCA Agent iframe ── */}
      {activeTab === 'sca' && (
        scaReady ? (
          <iframe
            src="https://humana-sca-demo-791329052527.us-central1.run.app"
            title="SCA Agent"
            style={{ width: '100%', height: 'calc(100vh - 100px)', border: 'none', display: 'block' }}
            allow="clipboard-write"
          />
        ) : (
          <div style={{ height: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center', color: '#002855' }}>
              <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #0099A8', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 14, fontWeight: 700 }}>Starting SCA Agent…</div>
            </div>
          </div>
        )
      )}

      {activeTab === 'dashboard' && <div className="p-4 space-y-4">

        {/* ── Top stats row ── */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label:'Tickets Resolved', value:m.ticketsResolved, color:C.green, icon:<CheckCircle2 size={14}/>, suffix:'' },
            { label:'Open Backlog',     value:m.ticketsOpen,     color:C.yellow, icon:<AlertTriangle size={14}/>, suffix:'' },
            { label:'Active AI Agents', value:m.activeAgents,   color:C.blue,   icon:<Zap size={14}/>, suffix:'' },
            { label:'Agent Coverage',   value:m.agentCoverage,  color:C.teal,   icon:<Shield size={14}/>, suffix:'%' },
            { label:'Avg MTTR',         value:m.avgMTTR,        color:C.purple, icon:<Clock size={14}/>, suffix:'h', dec:1 },
            { label:'Change Success',   value:m.changeSuccess,  color:C.green,  icon:<TrendingUp size={14}/>, suffix:'%' },
            { label:'AI Work Share',    value:m.aiWorkShare,    color:C.blue,   icon:<Activity size={14}/>, suffix:'%' },
            { label:'Rollback Rate',    value:m.rollbackRate,   color:C.red,    icon:<TrendingDown size={14}/>, suffix:'%', dec:1 },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 shadow-sm rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5" style={{ color: s.color }}>
                {s.icon}
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-tight">{s.label}</span>
              </div>
              <LiveNum value={s.value} suffix={s.suffix} decimals={s.dec||0} color={s.color} size="text-2xl" />
            </div>
          ))}
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'SLA / SLO Attainment', value:m.sla,        color:C.blue,   suffix:'%', dec:1, spark:sparkHistory.sla },
            { label:'Autonomy Rate',         value:m.autonomy,   color:C.purple, suffix:'%', dec:0, spark:sparkHistory.autonomy },
            { label:'AI Deflection Rate',    value:m.deflection, color:C.teal,   suffix:'%', dec:0, spark:sparkHistory.deflection },
            { label:'AI Success Rate',       value:m.aiSuccess,  color:C.green,  suffix:'%', dec:0, spark:sparkHistory.aiSuccess },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{k.label}</span>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: k.color }} />
              </div>
              <div className="flex items-end gap-3 mb-2">
                <div dangerouslySetInnerHTML={{ __html: donutSVG(k.value, k.color, `${k.dec>0?k.value.toFixed(k.dec):k.value}${k.suffix}`) }} className="w-24 shrink-0" />
                <div className="flex-1 pb-1">
                  <div dangerouslySetInnerHTML={{ __html: sparkSVG(k.spark, k.color) }} />
                  <div className="text-[10px] text-gray-500 mt-1 text-right">12-period trend</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Middle row: Trend + Feed + Bars ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Trend line */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-humana-navy">Agent Scorecards</div>
                <div className="text-[11px] text-gray-400">Autonomy · Coverage · AI Success · Deflection</div>
              </div>
              <div className="flex gap-2">
                {[[C.blue,'Aut'],[C.purple,'Cov'],[C.green,'Suc'],[C.teal,'Defl']].map(([c,l])=>(
                  <span key={l} className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="w-2 h-2 rounded-sm" style={{background:c}}/>  {l}
                  </span>
                ))}
              </div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: lineSVG(
              [trendData.autonomy, trendData.coverage, trendData.aiSuccess, trendData.deflection],
              trendData.labels, [C.blue, C.purple, C.green, C.teal]
            )}} />
          </div>

          {/* Live event feed */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div>
                <div className="text-sm font-bold text-humana-navy">AI Activity Feed</div>
                <div className="text-[11px] text-gray-400">Real-time agent actions &amp; resolutions</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-humana-green text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-humana-green animate-pulse" />Live
              </div>
            </div>
            <div className="flex-1 overflow-hidden space-y-0">
              {feed.map(e => <FeedItem key={e.id} event={e} age={e.age} />)}
            </div>
          </div>

          {/* Demand bars */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
            <div className="mb-3">
              <div className="text-sm font-bold text-humana-navy">Demand by Type</div>
              <div className="text-[11px] text-gray-400">Incident · Request · Problem · Change · Access</div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: miniBarSVG(
              Object.values(barData.typeCounts), Object.keys(barData.typeCounts),
              [C.blue, C.teal, C.purple, C.green, C.yellow]
            )}} />
            <div className="mt-3 grid grid-cols-5 gap-1">
              {Object.entries(barData.typeCounts).map(([k,v],i) => (
                <div key={k} className="text-center">
                  <div className="text-xs font-black" style={{ color:[C.blue,C.teal,C.purple,C.green,C.yellow][i] }}>{v}</div>
                  <div className="text-[9px] text-gray-400">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom row: Resolution + Incident + Cost + Safety ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Resolution speed */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
            <div className="text-sm font-bold text-humana-navy mb-1">Resolution Speed</div>
            <div className="text-[11px] text-gray-500 mb-3">P90 cycle time · AI work share</div>
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col items-center">
                <div dangerouslySetInnerHTML={{ __html: donutSVG(Math.min(100, m.cycleP90*10), C.blue, `${m.cycleP90}h`) }} className="w-full" />
                <div className="text-[10px] text-gray-500 mt-1 text-center">P90 Cycle</div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div dangerouslySetInnerHTML={{ __html: donutSVG(m.aiWorkShare, C.purple, `${m.aiWorkShare}%`) }} className="w-full" />
                <div className="text-[10px] text-gray-500 mt-1 text-center">AI Work Share</div>
              </div>
            </div>
          </div>

          {/* Incident metrics */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
            <div className="text-sm font-bold text-humana-navy mb-1">Incident &amp; Reliability</div>
            <div className="text-[11px] text-gray-500 mb-3">MTTD · MTTR · repeat · reopen</div>
            <div className="space-y-2.5">
              {[
                ['MTTD', `${m.avgMTTD.toFixed(2)}h`, Math.min(100, m.avgMTTD*20), C.teal],
                ['MTTR', `${m.avgMTTR.toFixed(1)}h`, Math.min(100, m.avgMTTR*8),  C.blue],
                ['Repeat', `${m.repeatRate.toFixed(1)}%`, Math.min(100,m.repeatRate*8), C.yellow],
                ['Reopen', `${m.reopenRate.toFixed(1)}%`, Math.min(100,m.reopenRate*8), C.purple],
              ].map(([l,v,p,c]) => (
                <div key={l} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-gray-600">{l}</span>
                    <span style={{ color:c }}>{v}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width:`${p}%`, background:c }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
            <div className="text-sm font-bold text-humana-navy mb-1">Cost &amp; Productivity</div>
            <div className="text-[11px] text-gray-500 mb-3">Operational efficiency metrics</div>
            <div className="space-y-3">
              {[
                ['Cost / Ticket',    `$${m.costPerTicket.toFixed(1)}`,  C.blue,   sparkHistory.sla],
                ['Toil Avoided',     `${m.toilAvoided.toFixed(1)}h`,    C.green,  sparkHistory.autonomy],
                ['Agent Coverage',   `${m.agentCoverage}%`,             C.teal,   sparkHistory.deflection],
                ['AI Work Share',    `${m.aiWorkShare}%`,               C.purple, sparkHistory.aiSuccess],
              ].map(([l,v,c,s]) => (
                <div key={l} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-500">{l}</div>
                    <div className="text-sm font-black" style={{ color:c }}>{v}</div>
                  </div>
                  <div className="w-20" dangerouslySetInnerHTML={{ __html: sparkSVG(s, c) }} />
                </div>
              ))}
            </div>
          </div>

          {/* Safety */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
            <div className="text-sm font-bold text-humana-navy mb-1">Safety &amp; Guardrails</div>
            <div className="text-[11px] text-gray-500 mb-3">Rollback · change success · regression</div>
            <div className="space-y-3">
              {[
                ['Change Success', `${m.changeSuccess}%`,           C.green,  sparkHistory.aiSuccess, false],
                ['Rollback Rate',  `${m.rollbackRate.toFixed(1)}%`, C.red,    sparkHistory.deflection, true],
                ['AI Success',     `${m.aiSuccess}%`,               C.blue,   sparkHistory.sla, false],
                ['Autonomy',       `${m.autonomy}%`,                C.purple, sparkHistory.autonomy, false],
              ].map(([l,v,c,s,lower]) => (
                <div key={l} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-500">{l}</div>
                    <div className="text-sm font-black" style={{ color:c }}>{v}</div>
                  </div>
                  <div className="w-20" dangerouslySetInnerHTML={{ __html: sparkSVG(s, c) }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>}

      {/* ── Marquee CSS ── */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .animate-fadeSlideIn { animation: fadeSlideIn 0.4s ease-out }
      `}</style>
    </div>
  )
}
