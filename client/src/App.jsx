import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import HumanaHeader from './components/HumanaHeader'
import DemoAgenda from './components/DemoAgenda'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import IDAWorkflowAgent from './pages/IDAWorkflowAgent'
import BatchHealthAnalyzer from './pages/BatchHealthAnalyzer'
import RCAandCMDB from './pages/RCAandCMDB'
import AKSVulnerability from './pages/AKSVulnerability'
import EventManagementAgent from './pages/EventManagementAgent'
import FinOpsCostAgent from './pages/FinOpsCostAgent'
import CloudOnboardingAgent from './pages/CloudOnboardingAgent'
import DependencyRiskAgent from './pages/DependencyRiskAgent'
import CVITWorkflowAgent from './pages/CVITWorkflowAgent'

function AppContent() {
  const location = useLocation()
  const isDemo = location.pathname.startsWith('/demo')

  return (
    <div className="min-h-screen bg-humana-light font-sans">
      <HumanaHeader />

      {isDemo && <DemoAgenda />}

      <main className={`pt-14 transition-all duration-300 ${isDemo ? 'pl-52' : ''}`}>
        <Routes>
          <Route path="/"                                element={<Home />} />
          <Route path="/catalog"                         element={<Catalog />} />
          <Route path="/demo/aks-vulnerability-agent"    element={<AKSVulnerability />} />
          <Route path="/demo/ida-workflow-agent"         element={<IDAWorkflowAgent />} />
          <Route path="/demo/batch-health-analyzer"      element={<BatchHealthAnalyzer />} />
          <Route path="/demo/rca-cmdb-agent"             element={<RCAandCMDB />} />
          <Route path="/demo/event-management-agent"     element={<EventManagementAgent />} />
          <Route path="/demo/finops-cost-agent"          element={<FinOpsCostAgent />} />
          <Route path="/demo/cloud-onboarding-agent"     element={<CloudOnboardingAgent />} />
          <Route path="/demo/dependency-risk-agent"      element={<DependencyRiskAgent />} />
          <Route path="/demo/cvit-workflow"              element={<CVITWorkflowAgent />} />
        </Routes>
      </main>
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
