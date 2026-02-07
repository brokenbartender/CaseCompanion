import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { PRIVACY_CHECKLIST, SAFETY_OPTIONS, VICTIM_RIGHTS } from "../data/privacySafety";
import { fetchPiiScan, markRedactionApplied } from "../services/caseApi";

export default function PrivacySafety() {
  const [piiFindings, setPiiFindings] = React.useState<any[]>([]);
  const [piiStatus, setPiiStatus] = React.useState("");

  React.useEffect(() => {
    fetchPiiScan()
      .then((data: any) => setPiiFindings(Array.isArray(data?.findings) ? data.findings : []))
      .catch(() => setPiiStatus("PII scan unavailable."));
  }, []);

  async function markRedacted(exhibitId: string) {
    try {
      await markRedactionApplied(exhibitId);
      setPiiStatus("Marked as redacted.");
    } catch (err: any) {
      setPiiStatus(err?.message || "Failed to mark redaction.");
    }
  }

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

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>PII Scan</CardSubtitle>
            <CardTitle>Detected Items</CardTitle>
          </CardHeader>
          <CardBody>
            {piiFindings.length ? (
              <div className="space-y-3 text-sm text-slate-300">
                {piiFindings.slice(0, 10).map((finding, idx) => (
                  <div key={`${finding.exhibitId}-${idx}`} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div>Exhibit: {finding.exhibitId}</div>
                    <div>Pattern: {finding.pattern}</div>
                    <div>Match: {finding.match}</div>
                    <button
                      type="button"
                      onClick={() => markRedacted(finding.exhibitId)}
                      className="mt-2 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-900"
                    >
                      Mark Redacted
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No PII findings detected.</div>
            )}
            {piiStatus ? <div className="mt-2 text-xs text-amber-200">{piiStatus}</div> : null}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
