import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import {
  SILENT_WITNESS_CHECKLIST,
  VIDEO_FORMAT_GUIDANCE,
  DEMONSTRATIVE_EXHIBIT_CHECKLIST
} from "../data/videoAdmissibility";

export default function VideoAdmissibility() {
  return (
    <Page title="Video Admissibility" subtitle="Checklist for authenticating video evidence.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardSubtitle>Authentication</CardSubtitle>
            <CardTitle>Silent Witness Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {SILENT_WITNESS_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Format</CardSubtitle>
            <CardTitle>Video Format Guidance</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {VIDEO_FORMAT_GUIDANCE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Demonstratives</CardSubtitle>
            <CardTitle>Demonstrative Exhibit Checks</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {DEMONSTRATIVE_EXHIBIT_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
      <div className="mt-6 text-xs text-slate-500">
        This checklist organizes authentication steps and does not provide legal advice.
      </div>
    </Page>
  );
}
