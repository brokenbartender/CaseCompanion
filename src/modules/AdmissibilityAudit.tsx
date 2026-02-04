import React from "react";
import Button from "../components/ui/Button";
import Page from "../components/ui/Page";
import { Card, CardBody } from "../components/ui/Card";
import { ShieldAlert, CheckCircle } from "lucide-react";

export default function AdmissibilityAudit() {
  return (
    <Page title="Admissibility Audit" subtitle="Rule-based evidence screening (FRE/State Rules)">
      <div className="space-y-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardBody className="flex justify-between items-center">
            <div className="flex gap-4">
              <ShieldAlert className="text-amber-500" size={24} />
              <div>
                <h4 className="text-slate-200 font-medium">Potential Hearsay: Exhibit B (Email)</h4>
                <p className="text-sm text-slate-400">
                  Statement offered to prove truth of matter asserted. Check for exemptions (Rule 803).
                </p>
              </div>
            </div>
            <Button variant="ghost" data-feedback="Draft motion queued from admissibility alert.">
              Draft Motion
            </Button>
          </CardBody>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardBody className="flex justify-between items-center">
            <div className="flex gap-4">
              <CheckCircle className="text-emerald-500" size={24} />
              <div>
                <h4 className="text-slate-200 font-medium">Chain of Custody Verified: Exhibit A</h4>
                <p className="text-sm text-slate-400">
                  Digital signature matches intake hash. No gaps in custody log.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
