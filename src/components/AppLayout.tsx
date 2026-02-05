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
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assault-hub", label: "Assault Hub", icon: Shield },
  { to: "/trial-mode", label: "Trial Mode", icon: Monitor },
  { to: "/self-defense", label: "Self-Defense", icon: Target },
  { to: "/roadmap", label: "Procedural Roadmap", icon: Map },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/evidence", label: "Evidence Vault", icon: Archive },
  { to: "/evidence-standards", label: "Evidence Standards", icon: ClipboardCheck },
  { to: "/exhibit-detail", label: "Exhibit Detail", icon: FileSearch },
  { to: "/video-admissibility", label: "Video Admissibility", icon: Video },
  { to: "/video-sync", label: "Video Sync", icon: Video },
  { to: "/witness", label: "Witness Matrix", icon: Users },
  { to: "/deadlines", label: "Deadlines", icon: Timer },
  { to: "/filing", label: "Filing Checklist", icon: ClipboardList },
  { to: "/service", label: "Service of Process", icon: FileText },
  { to: "/summary-disposition", label: "Summary Disposition", icon: FileText },
  { to: "/discovery", label: "Discovery Suite", icon: ClipboardList },
  { to: "/default-mediation", label: "Default + Mediation", icon: FileText },
  { to: "/motion-builder", label: "Motion Builder", icon: FileSignature },
  { to: "/objections", label: "Objection Cards", icon: Gavel },
  { to: "/deposition", label: "Deposition Simulator", icon: MessageSquare },
  { to: "/voir-dire", label: "Voir Dire Designer", icon: Users },
  { to: "/damages", label: "Damages Calculator", icon: Scale },
  { to: "/demand", label: "Demand Generator", icon: FileSignature },
  { to: "/leverage", label: "Consistency Check", icon: ClipboardCheck },
  { to: "/rules", label: "Rules Library", icon: BookOpen },
  { to: "/rules-index", label: "Rules Index", icon: Search },
  { to: "/audit", label: "Audit Log", icon: ClipboardCheck },
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
