import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { ShieldCheck, Lock, Timer, FileText } from "lucide-react";
import { useUser } from "../contexts/UserContext";

export default function PrivacyVault() {
  const [secured, setSecured] = useState(false);
  const { role } = useUser();
  const isClient = role === "Client";
  return (
    <ModuleLayout
      title="Privacy Vault"
      subtitle="Data retention, encryption controls, and client-specific policies"
      kpis={[
        { label: "Retention", value: "90d", tone: "neutral" },
        { label: "Encryption", value: "AES-256", tone: "good" },
        { label: "Exports", value: "Blocked", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-100">
                <ShieldCheck size={18} />
                Trust Controls
              </CardTitle>
              <CardSubtitle className="text-blue-200/60">
                Configure retention, encryption, and export limits.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-4 text-sm text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Retention</div>
                  <div className="mt-1 text-slate-200 font-medium">90 Days</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Encryption</div>
                  <div className="mt-1 text-slate-200 font-medium">AES-256</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Training</div>
                  <div className="mt-1 text-slate-200 font-medium">Disabled</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" className="bg-blue-600 hover:bg-blue-500">
                  Update Vault Policy
                </Button>
                <Button
                  variant="secondary"
                  className="border-emerald-500/30 text-emerald-200 hover:bg-emerald-950/40"
                  onClick={() => setSecured((prev) => !prev)}
                >
                  Encrypt Now
                </Button>
                {secured ? (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    Secure
                  </span>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-400" />
                Audit Events
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                2026-02-01: Client purge initiated by Admin.
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                2026-01-27: Export attempt blocked by policy (Opposing Counsel role).
              </div>
            </CardBody>
          </Card>

          {isClient ? (
            <Card className="border border-rose-500/30 bg-rose-500/10">
              <CardHeader>
                <CardTitle className="text-rose-200">Unauthorized</CardTitle>
                <CardSubtitle className="text-rose-200/70">
                  Client role cannot access Privilege Log or export controls.
                </CardSubtitle>
              </CardHeader>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer size={18} className="text-amber-400" />
                Purge Controls
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Next scheduled purge in 14 days.
              </div>
              <Button variant="secondary" className="w-full">
                Purge Session Now
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={18} className="text-emerald-400" />
                Access Controls
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Drafting disabled for Opposing Counsel role.
              </div>
              <Button variant="secondary" className="w-full">
                Review Role Policies
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
