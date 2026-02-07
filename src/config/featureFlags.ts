export const FEATURE_FLAGS = {
  showLegacyModules: String(import.meta.env.VITE_SHOW_LEGACY_MODULES || "").toLowerCase() === "true",
  useServerCaseProfile: true
};
