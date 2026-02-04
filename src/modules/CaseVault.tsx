import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Input from "../components/ui/Input";
import { api } from "../services/api";
import { getMatterId, getMatterName, getWorkspaceId, getWorkspaceName, setMatterId, setMatterName } from "../services/authStorage";

export default function CaseVault() {
  const nav = useNavigate();
  const workspaceId = getWorkspaceId();
  const workspaceName = getWorkspaceName() || "M&A Green Run";
  const [matters, setMatters] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loadingMatters, setLoadingMatters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMatterName, setNewMatterName] = useState("");
  const storedMatterId = getMatterId();
  const storedMatterName = getMatterName();

  const activeMatter = useMemo(() => {
    return matters.find((m) => m.id === storedMatterId) || null;
  }, [matters, storedMatterId]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    setLoadingMatters(true);
    setError(null);
    api.get(`/workspaces/${workspaceId}/matters`)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.matters || [];
        setMatters(list);
        if (!storedMatterId && list.length) {
          setMatterId(String(list[0].id));
          setMatterName(String(list[0].name || list[0].slug || ""));
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || "Unable to load matters.");
      })
      .finally(() => {
        if (!active) return;
        setLoadingMatters(false);
      });
    return () => {
      active = false;
    };
  }, [workspaceId]);

  const handleSelectMatter = (matterId: string) => {
    const selected = matters.find((m) => m.id === matterId);
    setMatterId(matterId);
    setMatterName(selected?.name || selected?.slug || "");
    nav(`/matters/${matterId}/exhibits`);
  };

  const handleCreateMatter = async () => {
    if (!workspaceId) return;
    const name = newMatterName.trim();
    if (!name) {
      setError("Enter a matter name to begin.");
      return;
    }
    setError(null);
    try {
      const created = await api.post(`/workspaces/${workspaceId}/matters`, { name });
      const matter = created?.matter || created;
      if (!matter?.id) throw new Error("Matter creation failed.");
      setMatters((prev) => [matter, ...prev]);
      setMatterId(String(matter.id));
      setMatterName(String(matter.name || matter.slug || ""));
      setNewMatterName("");
      nav(`/matters/${matter.id}/exhibits`);
    } catch (err: any) {
      setError(err?.message || "Unable to create matter.");
    }
  };

  return (
    <Page
      title="Case Vault"
      subtitle="Matter-first navigation. Pick a matter to scope every upload, analysis, and export."
      right={
        workspaceId ? (
          <div className="inline-flex items-center gap-2">
            <Badge tone="blue">Workspace: {workspaceName}</Badge>
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300"
              title={`Workspace ID: ${workspaceId}`}
              aria-label="Workspace ID"
            >
              <i className="fa-regular fa-copy" />
            </span>
          </div>
        ) : (
          <Badge tone="amber">No workspace</Badge>
        )
      }
    >
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Choose a matter</CardTitle>
            <CardSubtitle>All actions are scoped to the selected matter.</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {error ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Active matter</label>
              <select
                className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
                disabled={loadingMatters || matters.length === 0}
                value={activeMatter?.id || storedMatterId || ""}
                onChange={(e) => handleSelectMatter(e.target.value)}
              >
                <option value="" disabled>
                  {loadingMatters ? "Loading matters..." : "Select a matter"}
                </option>
                {matters.map((matter) => (
                  <option key={matter.id} value={matter.id}>
                    {matter.name || matter.slug}
                  </option>
                ))}
              </select>
              {storedMatterName && !activeMatter ? (
                <div className="text-xs text-slate-400">Stored matter: {storedMatterName}</div>
              ) : null}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Create a new matter</CardTitle>
            <CardSubtitle>Start a clean workspace for a new case.</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input
              value={newMatterName}
              onChange={(e) => setNewMatterName(e.target.value)}
              placeholder="e.g., Acme v. Northwind"
            />
            <Button variant="secondary" size="sm" onClick={handleCreateMatter}>
              <i className="fa-solid fa-plus" /> Create Matter
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[
          { label: "Ask", desc: "Research with citations.", to: "assistant", icon: "fa-solid fa-magnifying-glass" },
          { label: "Draft", desc: "Evidence-backed drafting.", to: "assistant", icon: "fa-solid fa-pen-nib" },
          { label: "Summarize", desc: "Facts and holdings.", to: "assistant", icon: "fa-solid fa-list-check" },
          { label: "Upload QA", desc: "Docs-only answers.", to: "intake", icon: "fa-solid fa-cloud-arrow-up" }
        ].map((tile) => (
          <button
            key={tile.label}
            type="button"
            onClick={() => (activeMatter ? nav(`/matters/${activeMatter.id}/${tile.to}`) : nav("/matters"))}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/80 p-4 text-left hover:border-emerald-400/40"
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Task</div>
            <div className="mt-2 flex items-center gap-2 text-white">
              <i className={`${tile.icon} text-emerald-300`} />
              <span className="font-semibold">{tile.label}</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">{tile.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>What's here now</CardTitle>
            <CardSubtitle>Short, real links - no "Coming Soon" traps.</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold text-white">Evidence Library</div>
              <div className="mt-1">Upload and browse exhibits, anchors, and source-line teleport.</div>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (activeMatter ? nav(`/matters/${activeMatter.id}/exhibits`) : nav("/matters"))}
                >
                  <i className="fa-solid fa-folder-open" /> Open Exhibits
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold text-white">Anchored AI</div>
              <div className="mt-1">
                {"Generate claim sets that cite real anchors. Click -> highlight."}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (activeMatter ? nav(`/matters/${activeMatter.id}/assistant`) : nav("/matters"))}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" /> Case Assistant
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (activeMatter ? nav(`/matters/${activeMatter.id}/verification`) : nav("/matters"))}
                >
                  <i className="fa-solid fa-file-pdf" /> Verification Hub
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold text-white">Chronology</div>
              <div className="mt-1">Run Auto‑Chronology and review results in Timeline View.</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (activeMatter ? nav(`/matters/${activeMatter.id}/intelligence`) : nav("/matters"))}
                >
                  <i className="fa-solid fa-timeline" /> Run Chronology
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (activeMatter ? nav(`/matters/${activeMatter.id}/timeline`) : nav("/matters"))}
                >
                  <i className="fa-solid fa-clock" /> Timeline View
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next vault features</CardTitle>
            <CardSubtitle>Planned, but not exposed as broken buttons.</CardSubtitle>
          </CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <ul className="list-disc list-inside space-y-2">
              <li>Playbooks and clause libraries</li>
              <li>Saved prompt templates per matter</li>
              <li>Export bundle (PDFs + JSON + audit log)</li>
              <li>Role-based sharing (read-only link)</li>
            </ul>
            <div className="pt-3 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => nav("/roadmap")}>
                <i className="fa-solid fa-list-check" /> View Roadmap
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
