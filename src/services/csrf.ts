const DEFAULT_CSRF_COOKIE = "forensic_csrf";

function getCookieValue(name: string): string {
  if (typeof document === "undefined") return "";
  const raw = document.cookie || "";
  const parts = raw.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return "";
}

export function getCsrfHeader(): Record<string, string> {
  const env = (import.meta as any)?.env;
  const cookieName = (env?.VITE_CSRF_COOKIE_NAME as string) || DEFAULT_CSRF_COOKIE;
  const token = getCookieValue(cookieName);
  if (!token) return {};
  return { "x-csrf-token": token };
}
