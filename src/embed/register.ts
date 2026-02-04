/**
 * LexiPro Forensic OS — Embeddable Entry
 *
 * Role in the Forensic Logic Chain:
 * - Registers <lexipro-app> custom element.
 * - This file is used as the entrypoint for the embeddable build output.
 */

import { LexiProAppElement } from "./LexiProElement";

declare global {
  interface HTMLElementTagNameMap {
    "lexipro-app": LexiProAppElement;
  }
}

// Idempotent registration (safe if included multiple times).
if (!customElements.get("lexipro-app")) {
  customElements.define("lexipro-app", LexiProAppElement);
}
