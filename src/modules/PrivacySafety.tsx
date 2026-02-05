import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { PRIVACY_CHECKLIST, SAFETY_OPTIONS, VICTIM_RIGHTS } from "../data/privacySafety";

export default function PrivacySafety() {
  return (
    <Page title="Privacy + Safety" subtitle="PII protection and victim safety reminders.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardSubtitle>PII</CardSubtitle>
            <CardTitle>Privacy Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {PRIVACY_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Safety</CardSubtitle>
            <CardTitle>Safety Options</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {SAFETY_OPTIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Rights</CardSubtitle>
            <CardTitle>Victim Rights</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {VICTIM_RIGHTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
