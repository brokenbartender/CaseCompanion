import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const seedContacts = [
  { id: "P-100", name: "Alex Morgan", role: "Client", phone: "(555) 222-9011" },
  { id: "P-101", name: "Dana Wright", role: "Opposing Counsel", phone: "(555) 222-9012" }
];

export default function ContactManagement() {
  const [contacts] = useState(seedContacts);

  return (
    <Page title="Contact Management" subtitle="People, roles, tags, and quick actions">
      <Card>
        <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div>
                <div className="text-slate-100 font-semibold">{contact.name}</div>
                <div className="text-xs text-slate-500">Role: {contact.role} • {contact.phone}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary">Email</Button>
                <Button variant="secondary">Copy</Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="secondary">Import CSV</Button>
            <Button variant="secondary">Export CSV</Button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Enhancements</div>
            <div className="mt-2">Role color tags • Business card scan • Custom fields</div>
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
