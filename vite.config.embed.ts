import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * LexiPro Forensic OS — Embeddable build config
 *
 * Outputs:
 * - ESM bundle (modern): dist-embed/lexipro-embed.esm.js
 * - IIFE bundle ("legacy" option): dist-embed/lexipro-embed.legacy.js
 *
 * Notes:
 * - CSS is injected into the ShadowRoot via ?inline imports (no global CSS emission).
 * - This build is intended for drop-in embedding via <script type="module">...
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: "src/embed/register.ts",
      name: "LexiProEmbed",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "es" ? "lexipro-embed.esm.js" : "lexipro-embed.legacy.js",
    },
    rollupOptions: {
      // Keep everything self-contained for simple <script> embedding.
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
