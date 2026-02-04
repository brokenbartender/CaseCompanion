import React, { useEffect, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { api } from "../services/api";
import { getWorkspaceId } from "../services/authStorage";

export default function AccountManagement() {
  const [users, setUsers] = useState([
    { id: "U-101", name: "Alex Carter", email: "acarter@firm.com", status: "Active" },
    { id: "U-102", name: "Jamie Lee", email: "jlee@firm.com", status: "Active" }
  ]);
  const [hints, setHints] = useState([
    "Income: Include spouse unemployment benefits.",
    "Property: List jointly owned vehicles."
  ]);
  const [policy, setPolicy] = useState<{ mfaRequired: boolean; ipWhitelistEnabled: boolean }>({
    mfaRequired: false,
    ipWhitelistEnabled: false
  });
  const [ipEntries, setIpEntries] = useState<Array<{ id: string; cidr: string; label?: string }>>([]);
  const [cidr, setCidr] = useState("");
  const [cidrLabel, setCidrLabel] = useState("");
  const [samlMetadata, setSamlMetadata] = useState("");
  const [samlIssuer, setSamlIssuer] = useState("");
  const [saving, setSaving] = useState(false);
  const workspaceId = getWorkspaceId();

  const loadSecurity = async () => {
    if (!workspaceId) return;
    try {
      const policyRes = await api.get(`/workspaces/${workspaceId}/trust/policy`);
      if (policyRes) {
        setPolicy({
          mfaRequired: Boolean(policyRes.mfaRequired),
          ipWhitelistEnabled: Boolean(policyRes.ipWhitelistEnabled)
        });
      }
    } catch {
      // ignore
    }
    try {
      const res = await api.get(`/workspaces/${workspaceId}/ip-allowlist`);
      setIpEntries(Array.isArray(res?.entries) ? res.entries : []);
    } catch {
      // ignore
    }
    try {
      const res = await api.get(`/workspaces/${workspaceId}/sso/providers`);
      const saml = Array.isArray(res?.providers)
        ? res.providers.find((p: any) => String(p.provider).toUpperCase() === "SAML")
        : null;
      if (saml) {
        setSamlMetadata(String(saml.metadataXml || ""));
        setSamlIssuer(String(saml.issuer || ""));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSecurity();
  }, []);

  const updatePolicy = async (next: Partial<typeof policy>) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const updated = await api.put(`/workspaces/${workspaceId}/trust/policy`, {
        ...policy,
        ...next
      });
      setPolicy({
        mfaRequired: Boolean(updated?.mfaRequired),
        ipWhitelistEnabled: Boolean(updated?.ipWhitelistEnabled)
      });
    } finally {
      setSaving(false);
    }
  };

  const addIpRange = async () => {
    if (!workspaceId) return;
    if (!cidr.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/ip-allowlist`, {
        cidr: cidr.trim(),
        label: cidrLabel.trim() || undefined
      });
      if (res?.entry) {
        setIpEntries((prev) => [res.entry, ...prev.filter((item) => item.id !== res.entry.id)]);
      }
      setCidr("");
      setCidrLabel("");
    } finally {
      setSaving(false);
    }
  };

  const removeIpRange = async (id: string) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await api.del(`/workspaces/${workspaceId}/ip-allowlist/${id}`);
      setIpEntries((prev) => prev.filter((entry) => entry.id !== id));
    } finally {
      setSaving(false);
    }
  };

  const saveSamlMetadata = async () => {
    if (!workspaceId) return;
    if (!samlMetadata.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/sso/saml/metadata`, {
        metadataXml: samlMetadata.trim(),
        issuer: samlIssuer.trim() || undefined
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Account Management" subtitle="Firm settings, users, billing, and questionnaire instructions">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Firm Information</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Firm: McKenzie Legal</div>
            <div>Phone: (555) 234-4411</div>
            <Button variant="secondary">Edit Contact</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            {users.map((user) => (
              <div key={user.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
                <div className="text-slate-100">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email} • {user.status}</div>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setUsers((prev) => [...prev, { id: `U-${prev.length + 103}`, name: "New User", email: "new@firm.com", status: "Pending" }])}>
              Add User
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>User Preferences</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-xs text-slate-300">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Reminder emails to unconfirmed clients
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Mask account numbers
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Auto-inactivate after 120 days
            </label>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Questionnaire Hints</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-xs text-slate-300">
            {hints.map((hint, idx) => (
              <div key={`${hint}-${idx}`} className="rounded-md border border-slate-800 bg-slate-950/60 p-2">{hint}</div>
            ))}
            <Button variant="secondary" onClick={() => setHints((prev) => [...prev, "Expenses: Provide last 3 months of statements."])}>Add Hint</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Instructions & Certification</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-300">
            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">Chapter 7 Instructions: Provide complete income details.</div>
            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">Chapter 13 Instructions: Include all repayment plans.</div>
            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">Default Certification Language: I certify the information is accurate.</div>
            <Button variant="secondary">Edit Instructions</Button>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Billing Information</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Card on file: **** 2345</div>
            <Button variant="secondary">Update Billing</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-xs text-slate-300">
            <div>Invoice #2026-114 • Client File Purchase • Feb 2</div>
            <div>Invoice #2026-098 • Client File Purchase • Jan 21</div>
            <Button variant="secondary">View Past Invoices</Button>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Security Controls</CardTitle></CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={policy.mfaRequired}
                onChange={(e) => updatePolicy({ mfaRequired: e.target.checked })}
                disabled={saving}
              />
              Require MFA for this workspace
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={policy.ipWhitelistEnabled}
                onChange={(e) => updatePolicy({ ipWhitelistEnabled: e.target.checked })}
                disabled={saving}
              />
              Enforce IP allowlist
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>IP Allowlist</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-300">
            <div className="grid grid-cols-1 gap-2">
              <Input
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="203.0.113.0/24"
                className="bg-slate-950/60 border-slate-800"
              />
              <Input
                value={cidrLabel}
                onChange={(e) => setCidrLabel(e.target.value)}
                placeholder="Label (optional)"
                className="bg-slate-950/60 border-slate-800"
              />
              <Button variant="secondary" onClick={addIpRange} disabled={saving}>
                Add IP Range
              </Button>
            </div>
            <div className="space-y-2">
              {ipEntries.map((entry) => (
                <div key={entry.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-2 flex items-center justify-between">
                  <div>
                    <div className="text-slate-100">{entry.cidr}</div>
                    {entry.label ? <div className="text-[10px] text-slate-500">{entry.label}</div> : null}
                  </div>
                  <Button variant="ghost" onClick={() => removeIpRange(entry.id)} disabled={saving}>
                    Remove
                  </Button>
                </div>
              ))}
              {!ipEntries.length ? (
                <div className="text-[10px] text-slate-500">No IP ranges configured.</div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Enterprise SSO (SAML)</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-300">
            <Input
              value={samlIssuer}
              onChange={(e) => setSamlIssuer(e.target.value)}
              placeholder="Issuer (optional)"
              className="bg-slate-950/60 border-slate-800"
            />
            <textarea
              value={samlMetadata}
              onChange={(e) => setSamlMetadata(e.target.value)}
              placeholder="Paste IdP metadata XML"
              className="min-h-[140px] w-full rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[10px] text-slate-200"
            />
            <Button variant="secondary" onClick={saveSamlMetadata} disabled={saving}>
              Save Metadata
            </Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
