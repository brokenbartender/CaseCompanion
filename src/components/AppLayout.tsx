import React from "react";
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
import { APP_NAME } from "../config/branding";

const navItems = [
  { to: "/", label: "Guided Start", icon: LayoutDashboard },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/war-room", label: "War Room", icon: LayoutDashboard },
  { to: "/assault-hub", label: "Assault Hub", icon: Shield },
  { to: "/trial-mode", label: "Trial Mode", icon: Monitor },
  { to: "/self-defense", label: "Self-Defense", icon: Target },
  { to: "/self-defense-planner", label: "Self-Defense Planner", icon: Target },
  { to: "/roadmap", label: "Procedural Roadmap", icon: Map },
  { to: "/guided-start", label: "Guided Start", icon: Map },
  { to: "/filing-flow", label: "Filing Flow", icon: ClipboardList },
  { to: "/case-type-library", label: "Case-Type Library", icon: ClipboardList },
  { to: "/doc-pack", label: "Document Pack", icon: FileText },
  { to: "/print-pack", label: "Print Pack", icon: FileText },
  { to: "/mifile-reconnect", label: "MiFILE Reconnect", icon: FileText },
  { to: "/fee-waiver", label: "Fee Waiver", icon: FileText },
  { to: "/proof-review", label: "Proof Review", icon: FileText },
  { to: "/filing-rejections", label: "Filing Rejections", icon: FileText },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/evidence", label: "Evidence Vault", icon: Archive },
  { to: "/evidence-elements", label: "Evidence Elements", icon: Archive },
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
  { to: "/deadlines", label: "Deadlines", icon: Timer },
  { to: "/filing", label: "Filing Checklist", icon: ClipboardList },
  { to: "/service", label: "Service of Process", icon: FileText },
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
  { to: "/design-system", label: "UI + Accessibility", icon: LayoutDashboard },
  { to: "/audit", label: "Audit Log", icon: ClipboardCheck },
  { to: "/privacy-safety", label: "Privacy + Safety", icon: Shield },
  { to: "/resources", label: "Resources Hub", icon: BookOpen },
  { to: "/settings", label: "Case Settings", icon: Settings }
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100">
      <div className="flex">
        <aside className="w-72 border-r border-white/5 bg-[#0A0E17] px-5 py-6">
          <div className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</div>
          <div className="mt-1 text-xs text-slate-400">Self-representation civil companion</div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => (
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
          </nav>

          <div className="mt-8 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            This app provides information and organization help, not legal advice.
          </div>
        </aside>

        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
