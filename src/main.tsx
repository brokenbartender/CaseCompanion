import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Standalone SPA entrypoint (non-embed).
// Embeddable builds mount via <lexipro-app> inside a ShadowRoot.
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("LexiPro: #root element not found");
}

// Keep root-scoped styling for standalone mode.
rootEl.classList.add("lexipro-root");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
