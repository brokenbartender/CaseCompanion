export type DashboardWidgetSize = "sm" | "md" | "lg";

export interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  size: DashboardWidgetSize;
  enabled: boolean;
}

const STORAGE_KEY = "lexipro_dashboard_widgets_v1";

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: "today",
    title: "Today & Tomorrow",
    description: "Upcoming deadlines and key actions",
    size: "sm",
    enabled: true
  },
  {
    id: "status",
    title: "Status",
    description: "Active vs pending cases snapshot",
    size: "sm",
    enabled: true
  },
  {
    id: "cases",
    title: "Cases",
    description: "New and active matters count",
    size: "sm",
    enabled: true
  },
  {
    id: "archives",
    title: "Archives & Summary",
    description: "Archived matters and total counts",
    size: "sm",
    enabled: true
  },
  {
    id: "recent",
    title: "Recent Cases",
    description: "Jump directly to case detail pages",
    size: "lg",
    enabled: true
  },
  {
    id: "tasks",
    title: "Your Tasks",
    description: "Open tasks and deadlines",
    size: "md",
    enabled: true
  },
  {
    id: "activity",
    title: "Activity Pulse",
    description: "Recent updates and notifications",
    size: "md",
    enabled: false
  },
  {
    id: "billing",
    title: "Billing Snapshot",
    description: "Unbilled work and invoice status",
    size: "sm",
    enabled: false
  }
];

export const dashboardWidgetsStore = {
  getWidgets(): DashboardWidget[] {
    if (typeof window === "undefined") return DEFAULT_WIDGETS;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    try {
      const parsed = JSON.parse(raw) as DashboardWidget[];
      return Array.isArray(parsed) ? parsed : DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  },
  saveWidgets(widgets: DashboardWidget[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  },
  resetWidgets() {
    if (typeof window === "undefined") return DEFAULT_WIDGETS;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WIDGETS));
    return DEFAULT_WIDGETS;
  },
  getDefaults() {
    return DEFAULT_WIDGETS;
  }
};
