import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";

import Dashboard from "./modules/Dashboard";
import ProceduralRoadmap from "./modules/ProceduralRoadmap";
import ProceduralChecklist from "./modules/ProceduralChecklist";
import CaseTimeline from "./modules/CaseTimeline";
import EvidenceVault from "./modules/EvidenceVault";
import RulesLibrary from "./modules/RulesLibrary";
import RulesIndex from "./modules/RulesIndex";
import ServiceOfProcessWizard from "./modules/ServiceOfProcessWizard";
import SummaryDispositionGuide from "./modules/SummaryDispositionGuide";
import FilingChecklist from "./modules/FilingChecklist";
import CaseSettingsView from "./modules/CaseSettings";
import DeadlinesView from "./modules/Deadlines";
import AuditLogView from "./modules/AuditLog";
import CivilAssaultHub from "./modules/CivilAssaultHub";
import VideoToTextSync from "./modules/VideoToTextSync";
import ObjectionBattleCards from "./modules/ObjectionBattleCards";
import DepositionSimulator from "./modules/DepositionSimulator";
import SettlementDemandGenerator from "./modules/SettlementDemandGenerator";
import JurorPredictor from "./modules/JurorPredictor";
import CivilLeverage from "./modules/CivilLeverage";
import WitnessIntelligence from "./modules/WitnessIntelligence";
import ForensicFinance from "./modules/ForensicFinance";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="roadmap" element={<ProceduralRoadmap />} />
          <Route path="checklist" element={<ProceduralChecklist />} />
          <Route path="timeline" element={<CaseTimeline />} />
          <Route path="evidence" element={<EvidenceVault />} />
          <Route path="rules" element={<RulesLibrary />} />
          <Route path="rules-index" element={<RulesIndex />} />
          <Route path="service" element={<ServiceOfProcessWizard />} />
          <Route path="summary-disposition" element={<SummaryDispositionGuide />} />
          <Route path="filing" element={<FilingChecklist />} />
          <Route path="settings" element={<CaseSettingsView />} />
          <Route path="deadlines" element={<DeadlinesView />} />
          <Route path="audit" element={<AuditLogView />} />
          <Route path="assault-hub" element={<CivilAssaultHub />} />
          <Route path="video-sync" element={<VideoToTextSync />} />
          <Route path="objections" element={<ObjectionBattleCards />} />
          <Route path="deposition" element={<DepositionSimulator />} />
          <Route path="demand" element={<SettlementDemandGenerator />} />
          <Route path="voir-dire" element={<JurorPredictor />} />
          <Route path="leverage" element={<CivilLeverage />} />
          <Route path="witness" element={<WitnessIntelligence />} />
          <Route path="damages" element={<ForensicFinance />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
