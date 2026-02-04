import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * LexiPro Forensic OS - Vite config
 * - Client never receives server secrets
 * - /api is proxied to backend in dev
 */
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          pdfjs: ["react-pdf", "pdfjs-dist"],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: true,
      interval: 250,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
