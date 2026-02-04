import React from "react";
import Page from "../components/ui/Page";
import Badge from "../components/ui/Badge";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function Roadmap() {
  return (
    <Page
      title="Platform Evolution Roadmap"
      subtitle="Stability-first roadmap focused on risk reduction, defensibility, and enterprise integration."
      right={<Badge tone="slate">Strategic / Read-only</Badge>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Phase 1: Zero-Trust Foundation (Production-Ready)</CardTitle>
            <CardSubtitle>Defensible controls that are already enforced.</CardSubtitle>
          </CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <ul className="list-disc list-inside space-y-2">
              <li>Deterministic grounding (page + bounding box anchors) [Regulatory Defensibility]</li>
              <li>Cryptographic chain of custody (SHA-256, proven on read) [Risk Mitigation]</li>
              <li>Ungrounded Output Gate (No Anchor → No Output) [Risk Mitigation]</li>
              <li>Immutable audit logging [Auditability]</li>
              <li>Deterministic chronology (anchored timelines) [Regulatory Defensibility]</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase 2: Enterprise Defensibility & Scaling</CardTitle>
            <CardSubtitle>Integration-ready hardening for enterprise operations.</CardSubtitle>
          </CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <ol className="list-decimal list-inside space-y-2">
              <li>Provenance receipts (exportable evidence of AI decisions)</li>
              <li>Enterprise identity integration (OIDC / SAML readiness)</li>
              <li>Policy-as-code governance (configurable enforcement profiles)</li>
              <li>High-volume ingestion hardening (AV scanning, file validation)</li>
              <li>Deployment hardening (health/ready endpoints, CI gates)</li>
            </ol>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Strategic Integration Position</CardTitle>
            <CardSubtitle>Executive view of platform fit and defensibility.</CardSubtitle>
          </CardHeader>
          <CardBody className="text-sm text-slate-300 leading-relaxed space-y-3">
            <p>
              LexiPro operates as the Evidence and Enforcement Layer between content systems and AI models. It enforces trust
              before output reaches end users, with grounded claims, proven evidence, and withheld responses when proof is absent.
            </p>
            <p>
              The platform bolts onto existing AI workflows without replacing them, providing a defensible and auditable control plane
              for enterprises that require proven outputs.
            </p>
            <pre className="text-xs whitespace-pre-wrap bg-black border border-white/10 rounded-2xl p-3 text-[#E2E8F0]">
              {`[Data Sources] -> [LexiPro Enforcement Layer] -> [AI Systems]`}
            </pre>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
