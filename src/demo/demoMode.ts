export function isDemoModeEnabled() {
  if (import.meta.env.VITE_DEMO_MODE === "1") return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "lexipro.online" || host === "www.lexipro.online") return true;
  return sessionStorage.getItem("lexipro_demo_env") === "1";
}
