import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HumanaHeader from './components/HumanaHeader'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import APGAgent from './pages/APGAgent'
import BatchHealthAnalyzer from './pages/BatchHealthAnalyzer'
import RCAandCMDB from './pages/RCAandCMDB'
import AKSVulnerability from './pages/AKSVulnerability'
import EventManagementAgent from './pages/EventManagementAgent'
import FinOpsCostAgent from './pages/FinOpsCostAgent'
import CloudOnboardingAgent from './pages/CloudOnboardingAgent'
import DependencyRiskAgent from './pages/DependencyRiskAgent'
import CVITWorkflowAgent from './pages/CVITWorkflowAgent'
import AKSHelmPropagationAgent from './pages/AKSHelmPropagationAgent'
import CAPERightsizingAgent from './pages/CAPERightsizingAgent'
import Dashboard2 from './pages/Dashboard2'
import AICommandCenter from './pages/AICommandCenter'

function AppContent() {
  return (
    <div className="min-h-screen bg-humana-light font-sans">
      <HumanaHeader />

      <main className="pt-14">
        <Routes>
          <Route path="/"                                element={<Home />} />
          <Route path="/catalog"                         element={<Catalog />} />
          <Route path="/demo/aks-vulnerability-agent"    element={<AKSVulnerability />} />
          <Route path="/demo/apg-agent"                   element={<APGAgent />} />
          <Route path="/demo/batch-health-analyzer"      element={<BatchHealthAnalyzer />} />
          <Route path="/demo/rca-cmdb-agent"             element={<RCAandCMDB />} />
          <Route path="/demo/event-management-agent"     element={<EventManagementAgent />} />
          <Route path="/demo/finops-cost-agent"          element={<FinOpsCostAgent />} />
          <Route path="/demo/cloud-onboarding-agent"     element={<CloudOnboardingAgent />} />
          <Route path="/demo/dependency-risk-agent"      element={<DependencyRiskAgent />} />
          <Route path="/demo/cvit-workflow"              element={<CVITWorkflowAgent />} />
          <Route path="/demo/aks-helm-propagation"       element={<AKSHelmPropagationAgent />} />
          <Route path="/demo/cape-rightsizing-agent"     element={<CAPERightsizingAgent />} />
          <Route path="/dashboard2"                      element={<Dashboard2 />} />
          <Route path="/command-center"                  element={<AICommandCenter />} />
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
