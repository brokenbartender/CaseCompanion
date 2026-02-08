import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  ListChecks,
  CalendarDays,
  Archive,
  BookOpen,
  Search,
  FileText,
  FileSearch,
  ClipboardList,
  ClipboardCheck,
  Shield,
  Settings,
  Timer,
  Video,
  MessageSquare,
  Gavel,
  FileSignature,
  Users,
  Scale,
  Target,
  Monitor
} from "lucide-react";
import { APP_NAME, APP_DISCLAIMER } from "../config/branding";
import { FEATURE_FLAGS } from "../config/featureFlags";
import { readJson, writeJson } from "../utils/localStore";

const MODE_KEY = "case_companion_mode_v1";

const coreNavSections = [
  {
    title: "Workflow",
    items: [
      { to: "/case-flow", label: "Case Flow", icon: LayoutDashboard },
      { to: "/case-status", label: "Case Status", icon: ListChecks },
      { to: "/deadlines", label: "Deadlines", icon: Timer }
    ]
  },
  {
    title: "Pleadings",
    items: [
      { to: "/filing-flow", label: "Pleadings", icon: ClipboardList },
      { to: "/service", label: "Service", icon: FileText },
      { to: "/answer-default", label: "Answer + Default", icon: ClipboardCheck }
    ]
  },
  {
    title: "Litigation",
    items: [
      { to: "/discovery", label: "Discovery", icon: FileText },
      { to: "/motion-builder", label: "Motions", icon: FileSignature },
      { to: "/trial-prep", label: "Trial Prep", icon: Gavel },
      { to: "/judgment", label: "Judgment", icon: Scale }
    ]
  },
  {
    title: "Evidence",
    items: [
      { to: "/evidence", label: "Evidence Vault", icon: Archive },
      { to: "/doc-pack", label: "Lawyer Packet", icon: FileText },
      { to: "/audit", label: "Audit Log", icon: ClipboardCheck }
    ]
  }
];

const advancedNavItems = [
  { to: "/guided-start", label: "Guided Start", icon: Map },
  { to: "/assault-hub", label: "Assault Hub", icon: Shield },
  { to: "/trial-mode", label: "Trial Mode", icon: Monitor },
  { to: "/self-defense", label: "Self-Defense", icon: Target },
  { to: "/self-defense-planner", label: "Self-Defense Planner", icon: Target },
  { to: "/roadmap", label: "Procedural Roadmap", icon: Map },
  { to: "/doc-pack", label: "Document Pack", icon: FileText },
  { to: "/mifile-reconnect", label: "MiFILE Reconnect", icon: FileText },
  { to: "/fee-waiver", label: "Fee Waiver", icon: FileText },
  { to: "/proof-review", label: "Proof Review", icon: FileText },
  { to: "/filing-rejections", label: "Filing Rejections", icon: FileText },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/evidence-elements", label: "Evidence Elements", icon: Archive },
  { to: "/claim-tree", label: "Claim Tree", icon: Archive },
  { to: "/ingest", label: "Ingest Center", icon: Archive },
  { to: "/video-analysis", label: "Video Analysis", icon: Video },
  { to: "/layout-parser", label: "Layout Parser", icon: FileSearch },
  { to: "/evidence-standards", label: "Evidence Standards", icon: ClipboardCheck },
  { to: "/exhibit-detail", label: "Exhibit Detail", icon: FileSearch },
  { to: "/exhibit-order", label: "Exhibit Order", icon: FileSearch },
  { to: "/video-admissibility", label: "Video Admissibility", icon: Video },
  { to: "/video-sync", label: "Video Sync", icon: Video },
  { to: "/witness", label: "Witness Matrix", icon: Users },
  { to: "/witness-prep", label: "Witness Prep Packets", icon: Users },
  { to: "/filing", label: "Filing Checklist", icon: ClipboardList },
  { to: "/service", label: "Service of Process", icon: FileText },
  { to: "/answer-default", label: "Answer + Default", icon: ClipboardCheck },
  { to: "/summary-disposition", label: "Summary Disposition", icon: FileText },
  { to: "/discovery", label: "Discovery Suite", icon: ClipboardList },
  { to: "/default-mediation", label: "Default + Mediation", icon: FileText },
  { to: "/motion-builder", label: "Motion Builder", icon: FileSignature },
  { to: "/trial-prep", label: "Trial Prep", icon: Gavel },
  { to: "/objections", label: "Objection Cards", icon: Gavel },
  { to: "/objection-drill", label: "Objection Drill", icon: Gavel },
  { to: "/deposition", label: "Deposition Simulator", icon: MessageSquare },
  { to: "/voir-dire", label: "Voir Dire Designer", icon: Users },
  { to: "/damages", label: "Damages Calculator", icon: Scale },
  { to: "/lost-income", label: "Lost Income", icon: Scale },
  { to: "/business-loss", label: "Business Loss", icon: Scale },
  { to: "/demand", label: "Demand Generator", icon: FileSignature },
  { to: "/leverage", label: "Consistency Check", icon: ClipboardCheck },
  { to: "/rules", label: "Rules Library", icon: BookOpen },
  { to: "/rules-quick", label: "Rules Quick Ref", icon: BookOpen },
  { to: "/rules-index", label: "Rules Index", icon: Search },
  { to: "/statutory-context", label: "Statutory Context", icon: BookOpen },
  { to: "/classifier", label: "Classifier Hub", icon: ClipboardCheck },
  { to: "/evidence-ops", label: "Evidence Ops", icon: Archive },
  { to: "/integrity-overview", label: "Integrity Overview", icon: ClipboardCheck },
  { to: "/integrity-audit", label: "Integrity Audit", icon: ClipboardCheck },
  { to: "/exhibit-manager", label: "Exhibit Manager", icon: Archive },
  { to: "/auto-chronology", label: "Auto Chronology", icon: CalendarDays },
  { to: "/case-assistant", label: "Case Assistant", icon: MessageSquare },
  { to: "/admissibility-audit", label: "Admissibility Audit", icon: FileText },
  { to: "/verification-hub", label: "Verification Hub", icon: FileSearch },
  { to: "/redaction-suite", label: "Redaction Suite", icon: FileText },
  { to: "/privacy-vault", label: "Privacy Vault", icon: Shield },
  { to: "/audit", label: "Audit Log", icon: ClipboardCheck },
  { to: "/privacy-safety", label: "Privacy + Safety", icon: Shield },
  { to: "/resources", label: "Resources Hub", icon: BookOpen },
  { to: "/settings", label: "Case Settings", icon: Settings }
];

const PRO_SE_ADVANCED_ROUTES = new Set([
  "/case-flow",
  "/guided-start",
  "/roadmap",
  "/checklist",
  "/timeline",
  "/doc-pack",
  "/mifile-reconnect",
  "/fee-waiver",
  "/filing-rejections",
  "/filing",
  "/service",
  "/answer-default",
  "/discovery",
  "/motion-builder",
  "/trial-prep",
  "/rules",
  "/rules-quick",
  "/rules-index",
  "/privacy-safety",
  "/resources",
  "/settings"
]);

export default function AppLayout() {
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => readJson(MODE_KEY, { advanced: false }).advanced);

  function toggleAdvanced(next: boolean) {
    setAdvancedOpen(next);
    writeJson(MODE_KEY, { advanced: next });
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100">
      <div className="flex">
        <aside className="w-72 border-r border-white/5 bg-[#0A0E17] px-5 py-6">
          <div className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</div>
          <div className="mt-1 text-xs text-slate-400">Michigan civil, pro se companion</div>

          <nav className="mt-6 space-y-4">
            {coreNavSections.map((section) => (
              <div key={section.title}>
                <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                          isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                        ].join(" ")
                      }
                      end={item.to === "/"}
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-slate-400 mb-2">Mode</div>
            <button
              type="button"
              onClick={() => toggleAdvanced(!advancedOpen)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
            >
              {advancedOpen ? "Hide Advanced/Admin" : "Show Advanced/Admin"}
            </button>
          </div>

          {advancedOpen ? (
            <nav className="mt-6 space-y-1">
              {(FEATURE_FLAGS.showLegacyModules
                ? advancedNavItems
                : advancedNavItems.filter((item) => PRO_SE_ADVANCED_ROUTES.has(item.to))
              ).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                    ].join(" ")
                  }
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          ) : null}

          <div className="mt-8 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {APP_DISCLAIMER}
          </div>
        </aside>

        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
