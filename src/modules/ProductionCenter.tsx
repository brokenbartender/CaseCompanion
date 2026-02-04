import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { PackageCheck } from "lucide-react";
import { logForensicEvent } from "../services/forensicLogger";

export default function ProductionCenter() {
  const [packaged, setPackaged] = useState(false);
  return (
    <Page title="Production Center" subtitle="Build production sets and export deliverables">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Production Spec</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div>Format: PDF + Text (load files, apply redactions)</div>
            <div>Stamp: DEF-0001 ? DEF-0500</div>
            <div>Privilege Log: Included</div>
            <Button onClick={() => { setPackaged(true); logForensicEvent("production.packaged", { resourceId: "package" }); }} className="mt-3">
              Build Production Package
            </Button>
            {packaged ? (
              <div className="mt-2 flex items-center gap-2 text-emerald-400"><PackageCheck size={16}/> Package ready for download.</div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
