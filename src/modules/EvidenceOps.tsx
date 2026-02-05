import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const LINKS = [
  { label: "Ingest Center", href: "/ingest", note: "Upload evidence for hashing and extraction." },
  { label: "Evidence Vault", href: "/evidence", note: "Tag, filter, and manage exhibits." },
  { label: "Exhibit Detail", href: "/exhibit-detail", note: "View forensics artifacts and verification." },
  { label: "Video Admissibility", href: "/video-admissibility", note: "Checklist for video authentication." }
];

export default function EvidenceOps() {
  return (
    <Page title="Evidence Ops" subtitle="Evidence intake, review, and verification.">
      <div className="grid gap-6 lg:grid-cols-2">
        {LINKS.map((link) => (
          <Card key={link.href}>
            <CardHeader>
              <CardSubtitle>Shortcut</CardSubtitle>
              <CardTitle>{link.label}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">{link.note}</div>
              <a
                href={link.href}
                className="mt-3 inline-flex rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                Open
              </a>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
