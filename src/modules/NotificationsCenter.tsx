import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";

export default function NotificationsCenter() {
  const items = [
    { id: 1, text: "Export packet generated for M-2024-001." },
    { id: 2, text: "Privilege tag added to EX-003." }
  ];

  return (
    <Page title="Notifications" subtitle="Alerts, system updates, and activity">
      <Card>
        <CardHeader><CardTitle>Recent Alerts</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
              {item.text}
            </div>
          ))}
        </CardBody>
      </Card>
    </Page>
  );
}
