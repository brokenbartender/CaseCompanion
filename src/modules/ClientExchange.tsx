import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { UploadCloud, Lock } from "lucide-react";

export default function ClientExchange() {
  return (
    <Page title="Client Exchange" subtitle="Secure uploads and client communications">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Client Uploads</CardTitle></CardHeader>
          <CardBody>
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
              <UploadCloud size={42} className="text-slate-500 mb-3" />
              <div className="text-sm text-slate-300">Drag files or browse to upload</div>
              <Button className="mt-4">Select Files</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Security</CardTitle></CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <div className="flex items-center gap-2"><Lock size={14}/> End-to-end encrypted</div>
            <div>Client-visible status updates</div>
            <div>Auto-notify assigned attorney</div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
