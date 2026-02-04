import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function ProductionQC() {
  const [passed, setPassed] = useState(false);

  return (
    <Page title="Production QC" subtitle="Quality control for redactions and productions">
      <Card>
        <CardHeader><CardTitle>QC Checklist</CardTitle></CardHeader>
        <CardBody className="space-y-4 text-sm text-slate-300">
          <div>? Bates ranges match spec</div>
          <div>? Privilege log included</div>
          <div>? Redaction burn-in verified</div>
          <Button onClick={() => setPassed(true)}>Approve QC</Button>
          {passed ? <div className="text-emerald-400 text-xs">QC Approved</div> : null}
        </CardBody>
      </Card>
    </Page>
  );
}
