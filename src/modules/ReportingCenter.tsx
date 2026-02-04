import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";

export default function ReportingCenter() {
  return (
    <Page title="Reporting Center" subtitle="AR aging, productivity, WIP, and firm analytics">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: "AR Aging", desc: "Outstanding balances by age" },
          { title: "Productivity", desc: "Billable hours recap" },
          { title: "WIP", desc: "Work in progress" }
        ].map((r) => (
          <Card key={r.title}>
            <CardHeader><CardTitle>{r.title}</CardTitle></CardHeader>
            <CardBody className="text-sm text-slate-300">{r.desc}</CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
