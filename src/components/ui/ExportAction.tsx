import React, { useState } from "react";
import Button from "./Button";

export default function ExportAction({
  label = "Export",
  onExport
}: {
  label?: string;
  onExport?: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      if (onExport) {
        await onExport();
      } else {
        window.dispatchEvent(
          new CustomEvent("lexipro-toast", {
            detail: { message: "Export queued. Wire export pipeline to enable.", tone: "info" }
          })
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="primary" onClick={handleExport} disabled={busy}>
      {busy ? "Exporting..." : label}
    </Button>
  );
}
