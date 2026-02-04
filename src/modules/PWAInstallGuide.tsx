import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function PWAInstallGuide() {
  return (
    <Page title="PWA Install Guide" subtitle="Add LexiPro to iOS/Android home screens">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Android (Chrome)</CardTitle></CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <div>1. Open LexiPro in Chrome.</div>
            <div>2. Tap the three-dot menu.</div>
            <div>3. Choose "Add to Home screen".</div>
            <div>4. Confirm name and install.</div>
            <Button variant="secondary" className="w-full">Mark Installed</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>iOS (Safari)</CardTitle></CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <div>1. Open LexiPro in Safari.</div>
            <div>2. Tap Share.</div>
            <div>3. Tap "Add to Home Screen".</div>
            <div>4. Name it and tap Add.</div>
            <Button variant="secondary" className="w-full">Mark Installed</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
