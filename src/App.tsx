import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";

const Dashboard = React.lazy(() => import("./modules/Dashboard"));
const ProceduralRoadmap = React.lazy(() => import("./modules/ProceduralRoadmap"));
const ProceduralChecklist = React.lazy(() => import("./modules/ProceduralChecklist"));
const CaseTimeline = React.lazy(() => import("./modules/CaseTimeline"));
const EvidenceVault = React.lazy(() => import("./modules/EvidenceVault"));
const RulesLibrary = React.lazy(() => import("./modules/RulesLibrary"));
const RulesIndex = React.lazy(() => import("./modules/RulesIndex"));
const ServiceOfProcessWizard = React.lazy(() => import("./modules/ServiceOfProcessWizard"));
const SummaryDispositionGuide = React.lazy(() => import("./modules/SummaryDispositionGuide"));
const FilingChecklist = React.lazy(() => import("./modules/FilingChecklist"));
const CaseSettingsView = React.lazy(() => import("./modules/CaseSettings"));
const DeadlinesView = React.lazy(() => import("./modules/Deadlines"));
const AuditLogView = React.lazy(() => import("./modules/AuditLog"));
const CivilAssaultHub = React.lazy(() => import("./modules/CivilAssaultHub"));
const VideoToTextSync = React.lazy(() => import("./modules/VideoToTextSync"));
const ObjectionBattleCards = React.lazy(() => import("./modules/ObjectionBattleCards"));
const DepositionSimulator = React.lazy(() => import("./modules/DepositionSimulator"));
const SettlementDemandGenerator = React.lazy(() => import("./modules/SettlementDemandGenerator"));
const JurorPredictor = React.lazy(() => import("./modules/JurorPredictor"));
const CivilLeverage = React.lazy(() => import("./modules/CivilLeverage"));
const WitnessIntelligence = React.lazy(() => import("./modules/WitnessIntelligence"));
const ForensicFinance = React.lazy(() => import("./modules/ForensicFinance"));
const TrialMode = React.lazy(() => import("./modules/TrialMode"));
const SelfDefenseDestroyer = React.lazy(() => import("./modules/SelfDefenseDestroyer"));
const ExhibitDetail = React.lazy(() => import("./modules/ExhibitDetail"));
const EvidenceStandards = React.lazy(() => import("./modules/EvidenceStandards"));
const VideoAdmissibility = React.lazy(() => import("./modules/VideoAdmissibility"));
const DiscoverySuite = React.lazy(() => import("./modules/DiscoverySuite"));
const DefaultMediation = React.lazy(() => import("./modules/DefaultMediation"));
const MotionBuilder = React.lazy(() => import("./modules/MotionBuilder"));
const TrialPrep = React.lazy(() => import("./modules/TrialPrep"));
const PrivacySafety = React.lazy(() => import("./modules/PrivacySafety"));
const ResourcesHub = React.lazy(() => import("./modules/ResourcesHub"));
const GuidedStartWizard = React.lazy(() => import("./modules/GuidedStartWizard"));
const IngestCenter = React.lazy(() => import("./modules/IngestCenter"));
const FilingFlowWizard = React.lazy(() => import("./modules/FilingFlowWizard"));
const DocumentPackBuilder = React.lazy(() => import("./modules/DocumentPackBuilder"));
const VideoAnalysis = React.lazy(() => import("./modules/VideoAnalysis"));
const LayoutParser = React.lazy(() => import("./modules/LayoutParser"));
const StatutoryContext = React.lazy(() => import("./modules/StatutoryContext"));
const DesignSystem = React.lazy(() => import("./modules/DesignSystem"));
const ClassifierHub = React.lazy(() => import("./modules/ClassifierHub"));
const MiFileReconnect = React.lazy(() => import("./modules/MiFileReconnect"));
const FeeWaiverGuide = React.lazy(() => import("./modules/FeeWaiverGuide"));
const ProofReview = React.lazy(() => import("./modules/ProofReview"));
const FilingRejectionLibrary = React.lazy(() => import("./modules/FilingRejectionLibrary"));
const EvidenceOps = React.lazy(() => import("./modules/EvidenceOps"));
const AutoChronology = React.lazy(() => import("./modules/AutoChronology"));
const AdmissibilityAudit = React.lazy(() => import("./modules/AdmissibilityAudit"));
const PrivacyVaultLite = React.lazy(() => import("./modules/PrivacyVaultLite"));
const IntegrityOverviewPage = React.lazy(() => import("./modules/IntegrityOverviewPage"));
const ExhibitManager = React.lazy(() => import("./modules/ExhibitManager"));
const IntegrityAudit = React.lazy(() => import("./modules/IntegrityAudit"));
const VerificationHub = React.lazy(() => import("./modules/VerificationHub"));
const BatesRedactionSuite = React.lazy(() => import("./modules/BatesRedactionSuite"));
const CaseAssistant = React.lazy(() => import("./modules/CaseAssistant"));
const CaseTypeLibrary = React.lazy(() => import("./modules/CaseTypeLibrary"));
const EvidenceElementMapper = React.lazy(() => import("./modules/EvidenceElementMapper"));
const WitnessPrepPackets = React.lazy(() => import("./modules/WitnessPrepPackets"));
const ObjectionDrill = React.lazy(() => import("./modules/ObjectionDrill"));
const SelfDefensePlanner = React.lazy(() => import("./modules/SelfDefensePlanner"));
const LostIncomeTracker = React.lazy(() => import("./modules/LostIncomeTracker"));
const BusinessLossWorksheet = React.lazy(() => import("./modules/BusinessLossWorksheet"));
const WarRoom = React.lazy(() => import("./modules/WarRoom"));
const TrialExhibitOrder = React.lazy(() => import("./modules/TrialExhibitOrder"));
const ClientPrintPack = React.lazy(() => import("./modules/ClientPrintPack"));
const RulesQuickReference = React.lazy(() => import("./modules/RulesQuickReference"));

function App() {
  return (
    <Router>
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex items-center justify-center">
            <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm">
              Loading Case Companion...
            </div>
          </div>
        }
      >
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
      </React.Suspense>
    </Router>
  );
}

export default App;
