import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Globe, Lock, FileText } from "lucide-react";

type UploadItem = {
  id: string;
  name: string;
  size: string;
  status: "Pending Review" | "Approved" | "Rejected";
};

const seedUploads: UploadItem[] = [
  { id: "UP-101", name: "W2_2023.pdf", size: "1.2 MB", status: "Pending Review" },
  { id: "UP-102", name: "Bank_Statement_Jan.pdf", size: "2.8 MB", status: "Pending Review" }
];

export default function ClientPortal() {
  const [uploads, setUploads] = useState(seedUploads);

  const updateUpload = (id: string, status: UploadItem["status"]) => {
    setUploads((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  return (
    <ModuleLayout
      title="Client Portal Preview"
      subtitle="Secure doc + billing sharing with client approvals"
      kpis={[
        { label: "Updates", value: "3", tone: "neutral" },
        { label: "Uploads", value: "2 Pending", tone: "warn" },
        { label: "Access", value: "Read-only", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="max-w-2xl mx-auto border-4 border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-100 p-8 text-slate-900">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">McKenzie Legal</h1>
            <Globe className="text-slate-400" />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white rounded shadow-sm border border-slate-200">
              <div className="text-xs font-bold text-emerald-600 uppercase">Completion SLA</div>
              <p className="mt-1 text-sm">Expected completion: Mar 15. Reminders: email + SMS scheduled.</p>
              <div className="mt-2 text-xs text-slate-500">Progress: 72% (Income + Property pending)</div>
            </div>

            <div className="p-4 bg-white rounded shadow-sm border border-slate-200">
              <div className="text-xs font-bold text-indigo-600 uppercase">Secure Sharing</div>
              <p className="mt-1 text-sm">Documents, invoices, and messages are end-to-end encrypted.</p>
              <div className="mt-2 text-xs text-slate-500">Billing summaries shared with client.</div>
            </div>

            <div className="p-4 bg-white rounded shadow-sm border border-slate-200">
              <div className="text-xs font-bold text-amber-600 uppercase">Uploads</div>
              <div className="mt-2 space-y-2 text-xs">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between rounded border border-slate-200 p-2">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-slate-400" />
                      <div>
                        <div className="text-slate-700">{upload.name}</div>
                        <div className="text-[10px] text-slate-500">{upload.size}</div>
                      </div>
                    </div>
                    <div className="text-[10px] uppercase text-slate-500">{upload.status}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {uploads.map((upload) => (
                  <div key={`${upload.id}-actions`} className="flex gap-2">
                    <Button variant="secondary" onClick={() => updateUpload(upload.id, "Approved")}>Approve</Button>
                    <Button variant="secondary" onClick={() => updateUpload(upload.id, "Rejected")}>Reject</Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-slate-500">Uploads up to 4 GB supported.</div>
            </div>

            <div className="p-4 bg-white rounded shadow-sm border border-slate-200 flex justify-between items-center">
              <span className="font-medium">Upload Documents</span>
              <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Select Files</button>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Lock size={12} /> Secure Client-Attorney Communication
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
