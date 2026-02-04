/**
 * LexiPro Forensic OS — Embeddable Custom Element
 *
 * Role in the Forensic Logic Chain:
 * - Enables zero-collision embedding of the entire React UI into legacy portals.
 * - Mounts React inside a ShadowRoot and injects all CSS into that ShadowRoot.
 * - Prevents global CSS pollution (no html/body/#root styling, no Tailwind preflight leaks).
 */

import React from "react";
import { createRoot, Root } from "react-dom/client";
import App from "../App";

// Inject the compiled Tailwind/app CSS into ShadowRoot (scoped).
import appCss from "../index.css?inline";

// Scoped FontAwesome CSS (and assets) injected into ShadowRoot (not global).
// This keeps the existing <i className="fa-..."> usage working without @import in global CSS.
import faCss from "@fortawesome/fontawesome-free/css/all.min.css?inline";

// React-PDF layer styles (scoped into ShadowRoot for embed builds).
import pdfAnnotationCss from "react-pdf/dist/Page/AnnotationLayer.css?inline";
import pdfTextCss from "react-pdf/dist/Page/TextLayer.css?inline";

function makeStyleTag(cssText: string) {
  const style = document.createElement("style");
  style.setAttribute("data-lexipro", "shadow-style");
  style.textContent = cssText;
  return style;
}

export class LexiProAppElement extends HTMLElement {
  private _root: Root | null = null;
  private _mountEl: HTMLDivElement | null = null;

  connectedCallback() {
    if (this._root) return;

    // Shadow DOM encapsulation for CSS + DOM.
    const shadow = this.attachShadow({ mode: "open" });

    // Host sizing defaults (can be overridden by the embedding page).
    // NOTE: styles are inside shadow, so they will not affect the embedding portal.
    shadow.appendChild(
      makeStyleTag(`:host{display:block;contain:content;min-height:600px;}`)
    );

    // Inject FontAwesome (scoped) then app CSS.
    shadow.appendChild(makeStyleTag(faCss));
    shadow.appendChild(makeStyleTag(pdfAnnotationCss));
    shadow.appendChild(makeStyleTag(pdfTextCss));
    shadow.appendChild(makeStyleTag(appCss));

    // React mount point
    const mount = document.createElement("div");
    mount.className = "lexipro-root";
    mount.style.height = "100%";
    shadow.appendChild(mount);
    this._mountEl = mount;

    this._root = createRoot(mount);
    this._root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }

  disconnectedCallback() {
    try {
      this._root?.unmount();
    } finally {
      this._root = null;
      this._mountEl = null;
    }
  }
}
