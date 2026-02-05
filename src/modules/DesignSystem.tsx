import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const COLORS = [
  { name: "Primary", value: "#F59E0B" },
  { name: "Surface", value: "#0B0F1A" },
  { name: "Panel", value: "#0A0E17" },
  { name: "Text", value: "#E2E8F0" }
];

const ACCESSIBILITY_CHECKS = [
  "High contrast for primary buttons and text.",
  "Keyboard focus styles for all inputs and buttons.",
  "Readable font sizes (14px+ for body, 16px+ for forms).",
  "Single-column layout on mobile.",
  "Clear navigation labels and icons."
];

export default function DesignSystem() {
  return (
    <Page title="UI + Accessibility System" subtitle="Design tokens and accessibility checklist.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Colors</CardSubtitle>
            <CardTitle>Palette</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3">
              {COLORS.map((color) => (
                <div key={color.name} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-sm text-slate-200">{color.name}</div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded" style={{ backgroundColor: color.value }} />
                    <div className="text-xs text-slate-400">{color.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Accessibility</CardSubtitle>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {ACCESSIBILITY_CHECKS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
