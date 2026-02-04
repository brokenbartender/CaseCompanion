const DEFAULT_BASE = "https://lexipro-backend.onrender.com/api";

export function getApiBase(): string {
  const env = (import.meta as any)?.env;
  const explicit = (env?.VITE_API_BASE_URL as string) || "";
  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    if (explicit) {
      const normalized = explicit.replace(/\/$/, "");
      if (normalized !== "/api" || isLocalHost) {
        return normalized;
      }
      // Ignore a build-time "/api" on non-local hosts; it breaks GitHub Pages.
    }
    if (isLocalHost && (port === "4173" || port === "5173")) {
      // Prefer Vite proxy for same-origin cookies during local demos.
      return "/api";
    }
    const hostLower = hostname.toLowerCase();
    if (hostLower === "lexipro.online" || hostLower === "www.lexipro.online") {
      return "https://lexipro-backend.onrender.com/api";
    }
    if (hostLower.endsWith(".github.io")) {
      return "https://lexipro-backend.onrender.com/api";
    }
    if (port === "3001") {
      // Docker frontend -> backend on host:8787 (supports localhost + LAN access).
      return `http://${hostname}:8787/api`;
    }
  }
  if (explicit) return explicit.replace(/\/$/, "");
  return DEFAULT_BASE;
}

export function withApiBase(path: string): string {
  if (!path) return getApiBase();
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase().replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
