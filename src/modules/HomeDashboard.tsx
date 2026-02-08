import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Page from "../components/ui/Page";
import { dashboardWidgetsStore, DashboardWidget } from "../services/dashboardWidgets";
import { readJson } from "../utils/localStore";
import {
  MessageSquare,
  BadgeCheck,
  Grid,
  Clock,
  CalendarDays,
  Users,
  Bell,
  Lock,
  FileText,
  Scale,
  FileSearch,
  ClipboardList,
  Stethoscope,
  Activity,
  DollarSign,
  Brain,
  Calculator,
  Stamp,
  Search,
  Briefcase,
  Gavel,
  TrendingUp,
  BookOpen,
  Shield,
  Book,
  Layout,
  Globe,
  BarChart,
  Mail,
  Database
} from "lucide-react";

const SECTION_STYLES: Record<string, { title: string; text: string; hover: string }> = {
  blue: { title: "text-blue-500", text: "group-hover:text-blue-400", hover: "hover:shadow-blue-500/10" },
  purple: { title: "text-purple-500", text: "group-hover:text-purple-400", hover: "hover:shadow-purple-500/10" },
  emerald: { title: "text-emerald-500", text: "group-hover:text-emerald-400", hover: "hover:shadow-emerald-500/10" }
};

const DAMAGES_KEY = "case_companion_damages_v1";
const WAGE_LOSS_KEY = "case_companion_wage_loss_v1";
const WAGE_THEFT_KEY = "case_companion_wage_theft_v1";
const WC_BENEFITS_KEY = "case_companion_wc_benefits_v1";
const PACKET_LAYOUT_KEY = "case_companion_packet_layout_v1";
const PACKET_OUTPUTS_KEY = "case_companion_packet_outputs_v1";
const PREFILE_AUDIT_KEY = "case_companion_prefile_audit_v1";
const TIMELINE_KEY = "case_companion_timeline_v1";

export default function HomeDashboard() {
  const navigate = useNavigate();
  const { matterId } = useParams();
  const [customizing, setCustomizing] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => dashboardWidgetsStore.getWidgets());

  const damages = readJson<any[]>(DAMAGES_KEY, []);
  const wageLoss = readJson<any>(WAGE_LOSS_KEY, {});
  const wageTheft = readJson<any>(WAGE_THEFT_KEY, {});
  const wcBenefits = readJson<any>(WC_BENEFITS_KEY, {});
  const packetLayout = readJson<Record<string, boolean>>(PACKET_LAYOUT_KEY, {});
  const packetOutputs = readJson<Record<string, boolean>>(PACKET_OUTPUTS_KEY, {});
  const preFileAudit = readJson<Record<string, boolean>>(PREFILE_AUDIT_KEY, {});
  const timeline = readJson<any[]>(TIMELINE_KEY, []);

  const damagesTotal = useMemo(
    () => damages.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    [damages]
  );
  const wageLossTotal = useMemo(() => (Number(wageLoss?.aww) || 0) * (Number(wageLoss?.weeks) || 0), [wageLoss]);
  const wageTheftTotal = useMemo(() => {
    const hourlyRate = Number(wageTheft?.hourlyRate) || 0;
    const unpaidHours = Number(wageTheft?.unpaidHours) || 0;
    const salaryPerPeriod = Number(wageTheft?.salaryPerPeriod) || 0;
    const missingPayPeriods = Number(wageTheft?.missingPayPeriods) || 0;
    const deductions = Number(wageTheft?.deductions) || 0;
    const base = hourlyRate * unpaidHours + salaryPerPeriod * missingPayPeriods + deductions;
    return wageTheft?.liquidated ? base * 2 : base;
  }, [wageTheft]);
  const wcBenefitsTotal = useMemo(
    () => (Number(wcBenefits?.rate) || 0) * (Number(wcBenefits?.weeks) || 0),
    [wcBenefits]
  );

  const packetLayoutDone = useMemo(() => {
    const keys = Object.keys(packetLayout);
    if (!keys.length) return 0;
    return keys.filter((key) => packetLayout[key]).length / keys.length;
  }, [packetLayout]);
  const packetOutputsDone = useMemo(() => {
    const keys = Object.keys(packetOutputs);
    if (!keys.length) return 0;
    return keys.filter((key) => packetOutputs[key]).length / keys.length;
  }, [packetOutputs]);
  const preFileDone = useMemo(() => {
    const keys = Object.keys(preFileAudit);
    if (!keys.length) return 0;
    return keys.filter((key) => preFileAudit[key]).length / keys.length;
  }, [preFileAudit]);

  const navigateTo = (path: string) => {
    navigate(`/matters/${matterId}/${path}`);
  };

  const toggleWidget = (id: string) => {
    const next = widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
    setWidgets(next);
    dashboardWidgetsStore.saveWidgets(next);
  };

  const cycleSize = (id: string) => {
    const order: DashboardWidget["size"][] = ["sm", "md", "lg"];
    const next = widgets.map((w) => {
      if (w.id !== id) return w;
      const idx = order.indexOf(w.size);
      return { ...w, size: order[(idx + 1) % order.length] };
    });
    setWidgets(next);
    dashboardWidgetsStore.saveWidgets(next);
  };

  const resetWidgets = () => {
    const next = dashboardWidgetsStore.resetWidgets();
    setWidgets(next);
  };

  const sections = [
    {
      title: "Command Home",
      color: "blue",
      items: [
        { icon: <Gavel />, label: "Cases List", path: "case-list" },
        { icon: <Briefcase />, label: "Case View", path: "case-view" },
        { icon: <ClipboardList />, label: "Matter Templates", path: "matter-fields" },
        { icon: <MessageSquare />, label: "Interrogate", path: "assistant" },
        { icon: <Grid />, label: "CaseMap Grid", path: "spreadsheet" },
        { icon: <Clock />, label: "Timeline", path: "timeline" },
        { icon: <Users />, label: "Witness Intel", path: "intelligence" },
        { icon: <FileText />, label: "Evidence Locker", path: "exhibits" },
        { icon: <Scale />, label: "Admissibility", path: "admissibility" },
        { icon: <FileSearch />, label: "Forensic Audit", path: "forensic-audit" }
      ]
    },
    {
      title: "Specialists",
      color: "purple",
      items: [
        { icon: <Stethoscope />, label: "Medical Analysis", path: "medical" },
        { icon: <Activity />, label: "Medical SmartMap", path: "medical-map" },
        { icon: <DollarSign />, label: "Forensic Finance", path: "finance" },
        { icon: <Brain />, label: "Juror Predictor", path: "juror" },
        { icon: <Calculator />, label: "Settlement Demand", path: "settlement" },
        { icon: <Stamp />, label: "Bates & Production", path: "production" },
        { icon: <Search />, label: "Auto Discovery", path: "discovery" },
        { icon: <Briefcase />, label: "Employment", path: "misconduct" }
      ]
    },
    {
      title: "Operations",
      color: "emerald",
      items: [
        { icon: <Gavel />, label: "Charge Analysis", path: "charges" },
        { icon: <TrendingUp />, label: "Civil Leverage", path: "leverage" },
        { icon: <BookOpen />, label: "Judicial Mirror", path: "judicial" },
        { icon: <Clock />, label: "Lifecycle Agent", path: "lifecycle" },
        { icon: <BarChart />, label: "Predictive", path: "predictive" },
        { icon: <Shield />, label: "Privacy Vault", path: "privacy" },
        { icon: <Book />, label: "Prosecutor Brief", path: "briefing" },
        { icon: <Globe />, label: "Client Portal", path: "portal" },
        { icon: <Layout />, label: "ROI Dashboard", path: "roi" }
      ]
    },
  {
      title: "Practice Ops",
      color: "emerald",
      items: [
        { icon: <Clock />, label: "Time & Billing", path: "time" },
        { icon: <CalendarDays />, label: "Docket & Deadlines", path: "docket" },
        { icon: <Shield />, label: "Conflict Check", path: "conflicts" },
        { icon: <FileText />, label: "Engagement", path: "engagement" },
        { icon: <FileSearch />, label: "Review Queue", path: "review-queue" },
        { icon: <Stamp />, label: "Production Center", path: "production-center" },
        { icon: <Mail />, label: "Email Capture", path: "email-capture" },
        { icon: <Database />, label: "DMS Connector", path: "dms" },
        { icon: <Layout />, label: "Task & Approvals", path: "tasks" },
        { icon: <Shield />, label: "Client Exchange", path: "client-exchange" },
        { icon: <Users />, label: "Client Management", path: "client-management" },
        { icon: <Users />, label: "Contacts", path: "contacts" },
        { icon: <ClipboardList />, label: "Questionnaire Review", path: "questionnaire-review" },
        { icon: <Mail />, label: "SMS Messaging", path: "sms" },
        { icon: <BookOpen />, label: "Document Library", path: "documents" },
        { icon: <DollarSign />, label: "Billing & Accounting", path: "billing-accounting" },
        { icon: <DollarSign />, label: "Invoice Center", path: "invoices" },
        { icon: <DollarSign />, label: "Trust Ledger", path: "trust-ledger" },
        { icon: <Lock />, label: "Account Management", path: "account" },
        { icon: <BarChart />, label: "Reporting Center", path: "reports" },
        { icon: <Clock />, label: "Time & Expense Advanced", path: "time-advanced" },
        { icon: <FileText />, label: "Document Automation", path: "doc-automation" },
        { icon: <FileText />, label: "Office Add-ins", path: "office-addins" },
        { icon: <ClipboardList />, label: "Task Templates", path: "task-templates" },
        { icon: <Users />, label: "CRM & Intake", path: "crm-intake" },
        { icon: <Layout />, label: "PWA Install", path: "pwa-install" },
        { icon: <FileSearch />, label: "Work Queues", path: "queues" },
        { icon: <Shield />, label: "Policy Editor", path: "policy" },
        { icon: <Lock />, label: "Legal Holds", path: "holds" },
        { icon: <Shield />, label: "SIEM Export", path: "siem" },
        { icon: <Users />, label: "RBAC Editor", path: "rbac" },
        { icon: <Bell />, label: "Notifications", path: "notifications" },
        { icon: <Stamp />, label: "Production QC", path: "production-qc" }
      ]
    },
    {
      title: "Strategy & Governance",
      color: "blue",
      items: [
        { icon: <Layout />, label: "Roadmap Hub", path: "roadmap" },
        { icon: <Users />, label: "Governance Center", path: "governance" },
        { icon: <TrendingUp />, label: "TCO Planner", path: "tco" },
        { icon: <Activity />, label: "Maturity Curve", path: "maturity" },
        { icon: <FileSearch />, label: "Company Intelligence", path: "ci" },
        { icon: <Gavel />, label: "Process Compliance", path: "process-model" }
      ]
    },
    {
      title: "R&D Systems",
      color: "purple",
      items: [
        { icon: <Layout />, label: "Small Expert Lab", path: "small-expert" },
        { icon: <Activity />, label: "System-2 Architect", path: "system2" },
        { icon: <FileSearch />, label: "GraphRAG Studio", path: "graphrag" },
        { icon: <Shield />, label: "AI Polygraph", path: "polygraph" },
        { icon: <Globe />, label: "Jurisdiction Compare", path: "jurisdiction" },
        { icon: <FileSearch />, label: "Conceptual Search", path: "argument-search" },
        { icon: <Layout />, label: "Norm Graph Builder", path: "norm-graph" },
        { icon: <Scale />, label: "Case-Based Reasoning", path: "case-reasoning" },
        { icon: <BadgeCheck />, label: "Reasoning Review", path: "reasoning-review" },
        { icon: <Search />, label: "Skill Launcher", path: "skills" },
        { icon: <MessageSquare />, label: "Agentic Workflow", path: "agentic" },
        { icon: <FileText />, label: "Drafting Integration", path: "drafting" },
        { icon: <Grid />, label: "50-State Survey", path: "state-survey" }
      ]
    }
  ];

  return (
    <Page title="LexiPro Dashboard" subtitle={`Active Matter: ${matterId}`}>
      <div className="space-y-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Damages Total</div>
            <div className="mt-2 text-2xl font-semibold text-white">${damagesTotal.toFixed(2)}</div>
            <div className="mt-1 text-xs text-slate-400">From damages ledger</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Wage + WC Loss</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              ${(wageLossTotal + wageTheftTotal + wcBenefitsTotal).toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-slate-400">Wage loss + theft + WC</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Packet Layout</div>
            <div className="mt-2 text-2xl font-semibold text-white">{Math.round(packetLayoutDone * 100)}%</div>
            <div className="mt-1 text-xs text-slate-400">Sections complete</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Pre‑File Audit</div>
            <div className="mt-2 text-2xl font-semibold text-white">{Math.round(preFileDone * 100)}%</div>
            <div className="mt-1 text-xs text-slate-400">Gate readiness</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Timeline Events</div>
            <div className="mt-2 text-2xl font-semibold text-white">{timeline.length}</div>
            <div className="mt-1 text-xs text-slate-400">Master + retaliation + termination</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Packet Outputs</div>
            <div className="mt-2 text-2xl font-semibold text-white">{Math.round(packetOutputsDone * 100)}%</div>
            <div className="mt-1 text-xs text-slate-400">Required documents</div>
          </div>
        </div>

        <div className={`rounded-xl border ${customizing ? "border-blue-500/50 bg-blue-500/10" : "border-slate-800 bg-slate-950/60"} p-4 text-xs text-slate-300`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Customization Mode</div>
              <div className="mt-1">{customizing ? "Drag widgets, add/remove tiles, and save layout." : "Dashboard layout locked."}</div>
            </div>
            <button
              className="rounded-md border border-slate-700 px-3 py-1 text-xs"
              onClick={() => setCustomizing((prev) => !prev)}
            >
              {customizing ? "Done Customizing" : "Customize"}
            </button>
          </div>
          {customizing ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span className="rounded-full border border-slate-700 px-3 py-1">Add/Remove Widgets</span>
                <button onClick={resetWidgets} className="rounded-full border border-slate-700 px-3 py-1">Reset Layout</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-300">
                {widgets.map((widget) => (
                  <div key={widget.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-100 font-semibold">{widget.title}</div>
                      <button onClick={() => toggleWidget(widget.id)} className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {widget.enabled ? "On" : "Off"}
                      </button>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">{widget.description}</div>
                    <button onClick={() => cycleSize(widget.id)} className="mt-2 rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase">
                      Size: {widget.size}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {sections.map((section) => {
          const styles = SECTION_STYLES[section.color];
          return (
            <div key={section.title}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${styles.title}`}>{section.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigateTo(item.path)}
                    className={`flex flex-col items-center justify-center p-6 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 hover:border-slate-600 hover:shadow-lg ${styles.hover} transition-all group`}
                  >
                    <div className={`text-slate-400 ${styles.text} group-hover:scale-110 transition-all mb-3`}>
                      {React.cloneElement(item.icon as React.ReactElement<{ size?: number }>, { size: 28 })}
                    </div>
                    <span className="text-xs font-medium text-slate-300 text-center">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
