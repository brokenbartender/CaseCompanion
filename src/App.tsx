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
import TrialMode from "./modules/TrialMode";
import SelfDefenseDestroyer from "./modules/SelfDefenseDestroyer";
import ExhibitDetail from "./modules/ExhibitDetail";
import EvidenceStandards from "./modules/EvidenceStandards";
import VideoAdmissibility from "./modules/VideoAdmissibility";
import DiscoverySuite from "./modules/DiscoverySuite";
import DefaultMediation from "./modules/DefaultMediation";
import MotionBuilder from "./modules/MotionBuilder";
import TrialPrep from "./modules/TrialPrep";
import PrivacySafety from "./modules/PrivacySafety";
import ResourcesHub from "./modules/ResourcesHub";
import GuidedStartWizard from "./modules/GuidedStartWizard";
import IngestCenter from "./modules/IngestCenter";
import FilingFlowWizard from "./modules/FilingFlowWizard";
import DocumentPackBuilder from "./modules/DocumentPackBuilder";
import VideoAnalysis from "./modules/VideoAnalysis";
import LayoutParser from "./modules/LayoutParser";
import StatutoryContext from "./modules/StatutoryContext";
import DesignSystem from "./modules/DesignSystem";
import ClassifierHub from "./modules/ClassifierHub";
import MiFileReconnect from "./modules/MiFileReconnect";
import FeeWaiverGuide from "./modules/FeeWaiverGuide";
import ProofReview from "./modules/ProofReview";
import FilingRejectionLibrary from "./modules/FilingRejectionLibrary";
import EvidenceOps from "./modules/EvidenceOps";
import AutoChronology from "./modules/AutoChronology";
import AdmissibilityAudit from "./modules/AdmissibilityAudit";
import PrivacyVaultLite from "./modules/PrivacyVaultLite";
import IntegrityOverviewPage from "./modules/IntegrityOverviewPage";
import ExhibitManager from "./modules/ExhibitManager";
import IntegrityAudit from "./modules/IntegrityAudit";
import VerificationHub from "./modules/VerificationHub";
import BatesRedactionSuite from "./modules/BatesRedactionSuite";
import CaseAssistant from "./modules/CaseAssistant";
import CaseTypeLibrary from "./modules/CaseTypeLibrary";
import EvidenceElementMapper from "./modules/EvidenceElementMapper";
import WitnessPrepPackets from "./modules/WitnessPrepPackets";
import ObjectionDrill from "./modules/ObjectionDrill";
import SelfDefensePlanner from "./modules/SelfDefensePlanner";
import LostIncomeTracker from "./modules/LostIncomeTracker";
import BusinessLossWorksheet from "./modules/BusinessLossWorksheet";
import WarRoom from "./modules/WarRoom";
import TrialExhibitOrder from "./modules/TrialExhibitOrder";
import ClientPrintPack from "./modules/ClientPrintPack";
import RulesQuickReference from "./modules/RulesQuickReference";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<GuidedStartWizard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="roadmap" element={<ProceduralRoadmap />} />
          <Route path="checklist" element={<ProceduralChecklist />} />
          <Route path="timeline" element={<CaseTimeline />} />
          <Route path="evidence" element={<EvidenceVault />} />
          <Route path="exhibit-detail" element={<ExhibitDetail />} />
          <Route path="evidence-standards" element={<EvidenceStandards />} />
          <Route path="video-admissibility" element={<VideoAdmissibility />} />
          <Route path="discovery" element={<DiscoverySuite />} />
          <Route path="default-mediation" element={<DefaultMediation />} />
          <Route path="motion-builder" element={<MotionBuilder />} />
          <Route path="trial-prep" element={<TrialPrep />} />
          <Route path="privacy-safety" element={<PrivacySafety />} />
          <Route path="resources" element={<ResourcesHub />} />
          <Route path="guided-start" element={<GuidedStartWizard />} />
          <Route path="ingest" element={<IngestCenter />} />
          <Route path="filing-flow" element={<FilingFlowWizard />} />
          <Route path="doc-pack" element={<DocumentPackBuilder />} />
          <Route path="video-analysis" element={<VideoAnalysis />} />
          <Route path="layout-parser" element={<LayoutParser />} />
          <Route path="statutory-context" element={<StatutoryContext />} />
          <Route path="design-system" element={<DesignSystem />} />
          <Route path="classifier" element={<ClassifierHub />} />
          <Route path="mifile-reconnect" element={<MiFileReconnect />} />
          <Route path="war-room" element={<WarRoom />} />
          <Route path="fee-waiver" element={<FeeWaiverGuide />} />
          <Route path="proof-review" element={<ProofReview />} />
          <Route path="filing-rejections" element={<FilingRejectionLibrary />} />
          <Route path="evidence-ops" element={<EvidenceOps />} />
          <Route path="auto-chronology" element={<AutoChronology />} />
          <Route path="case-assistant" element={<CaseAssistant />} />
          <Route path="admissibility-audit" element={<AdmissibilityAudit />} />
          <Route path="verification-hub" element={<VerificationHub />} />
          <Route path="redaction-suite" element={<BatesRedactionSuite />} />
          <Route path="privacy-vault" element={<PrivacyVaultLite />} />
          <Route path="integrity-overview" element={<IntegrityOverviewPage />} />
          <Route path="exhibit-manager" element={<ExhibitManager />} />
          <Route path="integrity-audit" element={<IntegrityAudit />} />
          <Route path="case-type-library" element={<CaseTypeLibrary />} />
          <Route path="evidence-elements" element={<EvidenceElementMapper />} />
          <Route path="witness-prep" element={<WitnessPrepPackets />} />
          <Route path="objection-drill" element={<ObjectionDrill />} />
          <Route path="self-defense-planner" element={<SelfDefensePlanner />} />
          <Route path="lost-income" element={<LostIncomeTracker />} />
          <Route path="business-loss" element={<BusinessLossWorksheet />} />
          <Route path="exhibit-order" element={<TrialExhibitOrder />} />
          <Route path="print-pack" element={<ClientPrintPack />} />
          <Route path="rules-quick" element={<RulesQuickReference />} />
          <Route path="rules" element={<RulesLibrary />} />
          <Route path="rules-index" element={<RulesIndex />} />
          <Route path="service" element={<ServiceOfProcessWizard />} />
          <Route path="summary-disposition" element={<SummaryDispositionGuide />} />
          <Route path="filing" element={<FilingChecklist />} />
          <Route path="settings" element={<CaseSettingsView />} />
          <Route path="deadlines" element={<DeadlinesView />} />
          <Route path="audit" element={<AuditLogView />} />
          <Route path="assault-hub" element={<CivilAssaultHub />} />
          <Route path="trial-mode" element={<TrialMode />} />
          <Route path="self-defense" element={<SelfDefenseDestroyer />} />
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
