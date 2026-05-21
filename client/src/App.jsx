import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HumanaHeader from './components/HumanaHeader'
import PresenterMode from './components/PresenterMode'
import DemoAgenda from './components/DemoAgenda'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import IDAWorkflowAgent from './pages/IDAWorkflowAgent'
import BatchHealthAnalyzer from './pages/BatchHealthAnalyzer'
import RCAandCMDB from './pages/RCAandCMDB'
import AKSVulnerability from './pages/AKSVulnerability'

function AppContent() {
  const [presenterMode, setPresenterMode] = useState(false)
  const [scenario, setScenario] = useState(null)
  const location = useLocation()

  const isDemo = location.pathname.startsWith('/demo')

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setPresenterMode(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const mainPaddingLeft = isDemo && !presenterMode ? '' : ''

  return (
    <div className="min-h-screen bg-humana-light font-sans">
      <HumanaHeader
        presenterMode={presenterMode}
        onTogglePresenter={() => setPresenterMode(p => !p)}
      />

      {isDemo && <DemoAgenda />}

      <main
        className={`pt-14 transition-all duration-300 ${isDemo ? 'pl-52' : ''} ${presenterMode ? 'pb-16' : ''}`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/demo/ida-workflow-agent" element={<IDAWorkflowAgent scenario={scenario} />} />
          <Route path="/demo/batch-health-analyzer" element={<BatchHealthAnalyzer scenario={scenario} />} />
          <Route path="/demo/rca-cmdb-agent" element={<RCAandCMDB scenario={scenario} />} />
          <Route path="/demo/aks-vulnerability-agent" element={<AKSVulnerability scenario={scenario} />} />
        </Routes>
      </main>

      {presenterMode && (
        <PresenterMode onScenario={(s) => { setScenario(s); setTimeout(() => setScenario(null), 100) }} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
