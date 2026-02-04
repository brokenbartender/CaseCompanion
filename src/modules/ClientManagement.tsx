import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Mail, Phone, User } from "lucide-react";

type ClientStatus =
  | "Unconfirmed"
  | "In Progress"
  | "Ready to Download"
  | "Downloaded"
  | "Deleted"
  | "Inactive";

type ClientSection = {
  name: string;
  status: "Not Started" | "In Progress" | "Completed";
};

type ClientRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  progress: number;
  flags: number;
  expectedCompletion: string;
  sections: ClientSection[];
  notes: string[];
};

const DEFAULT_SECTIONS: ClientSection[] = [
  { name: "Income", status: "In Progress" },
  { name: "Property", status: "Not Started" },
  { name: "Debts", status: "Completed" },
  { name: "Expenses", status: "In Progress" },
  { name: "Documents", status: "Not Started" }
];

const seedClients: ClientRecord[] = [
  {
    id: "C-101",
    name: "Jordan Miles",
    email: "jmiles@email.com",
    phone: "(555) 103-2290",
    status: "In Progress",
    progress: 62,
    flags: 1,
    expectedCompletion: "2026-03-15",
    sections: DEFAULT_SECTIONS,
    notes: ["Verify prior employer list."]
  },
  {
    id: "C-102",
    name: "Rina Patel",
    email: "rpatel@email.com",
    phone: "(555) 438-9931",
    status: "Ready to Download",
    progress: 100,
    flags: 0,
    expectedCompletion: "2026-02-12",
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s, status: "Completed" })),
    notes: []
  },
  {
    id: "C-103",
    name: "Owen Hart",
    email: "ohart@email.com",
    phone: "(555) 671-5522",
    status: "Unconfirmed",
    progress: 0,
    flags: 0,
    expectedCompletion: "2026-02-20",
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s, status: "Not Started" })),
    notes: []
  }
];

const statusActions: Record<ClientStatus, string[]> = {
  "Unconfirmed": ["Resend Invite", "Remove"],
  "In Progress": ["Preview", "Client Login", "Resend Invite", "Purchase"],
  "Ready to Download": ["Preview", "Purchase", "Resubmit"],
  "Downloaded": ["View PDF", "Export", "Preview"],
  "Deleted": ["Preview"],
  "Inactive": ["Preview", "Resend Invite"]
};

export default function ClientManagement() {
  const [clients, setClients] = useState<ClientRecord[]>(seedClients);
  const [activeClientId, setActiveClientId] = useState<string>(seedClients[0].id);
  const [activeTab, setActiveTab] = useState<"progress" | "edit" | "flags" | "activity" | "email">("progress");
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    expectedCompletion: "",
    payCalculator: true,
    instructions: "",
    sendOption: "mci"
  });
  const [activityLog, setActivityLog] = useState<string[]>([
    "Invite sent • 2/3",
    "Questionnaire submitted • 2/4",
    "Resubmitted for review • 2/4",
    "SMS reminder sent • 2/4",
    "Email follow-up logged • 2/4"
  ]);
  const [emailDraft, setEmailDraft] = useState({ subject: "", body: "", bcc: false });
  const [questionHints, setQuestionHints] = useState<string[]>([
    "Income: Include spouse unemployment benefits.",
    "Property: Note any vehicles jointly owned."
  ]);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === activeClientId) || clients[0],
    [clients, activeClientId]
  );

  const updateClientStatus = (id: string, status: ClientStatus) => {
    setClients((prev) => prev.map((client) => (client.id === id ? { ...client, status } : client)));
    setActivityLog((prev) => [`Status changed to ${status} • ${new Date().toLocaleDateString()}`, ...prev]);
  };

  const handleAction = (action: string) => {
    if (!activeClient) return;
    if (action === "Purchase") updateClientStatus(activeClient.id, "Downloaded");
    if (action === "Resubmit") updateClientStatus(activeClient.id, "In Progress");
    if (action === "Remove") updateClientStatus(activeClient.id, "Deleted");
    if (action === "Resend Invite") {
      setActivityLog((prev) => [`Invitation resent to ${activeClient.email}`, ...prev]);
    }
    if (action === "Client Login") {
      setActivityLog((prev) => [`Logged in as client ${activeClient.name}`, ...prev]);
    }
    if (action === "Export") {
      setActivityLog((prev) => [`Exported client file (${activeClient.id}).bci`, ...prev]);
    }
    if (action === "View PDF") {
      setActivityLog((prev) => [`Generated PDF view for ${activeClient.name}`, ...prev]);
    }
  };

  const sendInvite = () => {
    if (!inviteForm.name || !inviteForm.email) return;
    const newClient: ClientRecord = {
      id: `C-${Math.floor(Math.random() * 900 + 100)}`,
      name: inviteForm.name,
      email: inviteForm.email,
      phone: inviteForm.phone,
      status: "Unconfirmed",
      progress: 0,
      flags: 0,
      expectedCompletion: inviteForm.expectedCompletion || "2026-03-01",
      sections: DEFAULT_SECTIONS.map((s) => ({ ...s, status: "Not Started" })),
      notes: []
    };
    setClients((prev) => [newClient, ...prev]);
    setActivityLog((prev) => [`Invite sent to ${inviteForm.email}`, ...prev]);
    setInviteForm({ name: "", email: "", phone: "", expectedCompletion: "", payCalculator: true, instructions: "", sendOption: "mci" });
  };

  return (
    <Page title="Client Management" subtitle="Invites, questionnaire progress, and status actions">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Clients</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setActiveClientId(client.id)}
                className={`w-full text-left rounded-lg border p-4 transition ${client.id === activeClientId ? "border-blue-500/70 bg-blue-500/10" : "border-slate-800 bg-slate-950/60"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-100 font-semibold">{client.name}</div>
                    <div className="text-xs text-slate-500">Status: {client.status}</div>
                  </div>
                  <div className="text-xs text-emerald-300">{client.progress}% complete</div>
                </div>
                {client.flags > 0 ? (
                  <div className="mt-2 text-xs text-amber-300">{client.flags} flagged questions need review.</div>
                ) : null}
              </button>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invite a Client</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-300">
            <input value={inviteForm.name} onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" />
            <input value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" />
            <input value={inviteForm.phone} onChange={(e) => setInviteForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" />
            <input value={inviteForm.expectedCompletion} onChange={(e) => setInviteForm((p) => ({ ...p, expectedCompletion: e.target.value }))} type="date" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={inviteForm.payCalculator} onChange={(e) => setInviteForm((p) => ({ ...p, payCalculator: e.target.checked }))} />
              Paycheck calculator enabled
            </label>
            <textarea value={inviteForm.instructions} onChange={(e) => setInviteForm((p) => ({ ...p, instructions: e.target.value }))} placeholder="Client-specific instructions" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" rows={3} />
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Send Options</div>
              <select value={inviteForm.sendOption} onChange={(e) => setInviteForm((p) => ({ ...p, sendOption: e.target.value }))} className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100">
                <option value="mci">Send via Portal</option>
                <option value="email">Send via Email Program</option>
              </select>
            </div>
            <Button onClick={sendInvite} className="w-full">Send Invite</Button>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Client Console</CardTitle></CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="flex flex-wrap gap-2 text-xs">
              {(["progress", "edit", "flags", "activity", "email"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full border px-3 py-1 ${activeTab === tab ? "border-blue-500/70 text-blue-200" : "border-slate-700 text-slate-400"}`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            {activeTab === "progress" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-100 font-semibold">{activeClient.name}</div>
                    <div className="text-xs text-slate-500">Expected completion: {activeClient.expectedCompletion}</div>
                  </div>
                  <div className="text-xs text-emerald-300">{activeClient.progress}% complete</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeClient.sections.map((section) => (
                    <div key={section.name} className="rounded-md border border-slate-800 bg-slate-950/60 p-2 text-xs">
                      <div className="text-slate-200">{section.name}</div>
                      <div className="text-slate-500">{section.status}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusActions[activeClient.status].map((action) => (
                    <Button key={action} variant="secondary" onClick={() => handleAction(action)}>
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "edit" && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-400"><User size={12}/> {activeClient.name}</div>
                <div className="flex items-center gap-2 text-slate-400"><Mail size={12}/> {activeClient.email}</div>
                <div className="flex items-center gap-2 text-slate-400"><Phone size={12}/> {activeClient.phone}</div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Status</div>
                  <select value={activeClient.status} onChange={(e) => updateClientStatus(activeClient.id, e.target.value as ClientStatus)} className="rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100">
                    {Object.keys(statusActions).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Questionnaire Sections</div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  {activeClient.sections.map((section) => (
                    <span key={section.name} className="rounded-full border border-slate-700 px-2 py-1">{section.name}</span>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "flags" && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-amber-300 font-semibold">Flagged Question</div>
                  <div className="mt-1">Employment gap in 2022 — needs confirmation.</div>
                  <Button variant="secondary" className="mt-2">Respond to Flag</Button>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-emerald-300 font-semibold">Needs Review Note</div>
                  <div className="mt-1">Please upload W-2 for 2021.</div>
                  <Button variant="secondary" className="mt-2">Resubmit Questionnaire</Button>
                </div>
              </div>
            )}
            {activeTab === "activity" && (
              <div className="space-y-2 text-xs text-slate-300">
                {activityLog.map((event, idx) => (
                  <div key={`${event}-${idx}`} className="rounded-md border border-slate-800 bg-slate-950/60 p-2">{event}</div>
                ))}
              </div>
            )}
            {activeTab === "email" && (
              <div className="space-y-3 text-xs text-slate-300">
                <input value={emailDraft.subject} onChange={(e) => setEmailDraft((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" />
                <textarea value={emailDraft.body} onChange={(e) => setEmailDraft((p) => ({ ...p, body: e.target.value }))} placeholder="Message" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" rows={4} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={emailDraft.bcc} onChange={(e) => setEmailDraft((p) => ({ ...p, bcc: e.target.checked }))} />
                  BCC me
                </label>
                <Button onClick={() => setActivityLog((prev) => [`Email sent to ${activeClient.email}`, ...prev])}>Send Email</Button>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Questionnaire Hints</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-xs text-slate-300">
            {questionHints.map((hint, idx) => (
              <div key={`${hint}-${idx}`} className="rounded-md border border-slate-800 bg-slate-950/60 p-2">{hint}</div>
            ))}
            <Button variant="secondary" onClick={() => setQuestionHints((prev) => [...prev, "Expenses: Provide last 3 months of statements."])}>Add Hint</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
