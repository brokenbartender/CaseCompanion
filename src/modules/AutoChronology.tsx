import React, { useEffect, useMemo, useState } from "react";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { api } from "../services/api";
import { getWorkspaceId, getWorkspaceName } from "../services/authStorage";
import { useSession } from "../hooks/useSession";
import { useMatterId } from "../hooks/useMatterId";

export default function AutoChronology() {
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const workspaceName = getWorkspaceName() || "M&A Green Run";
  const { authed } = useSession();
  const routeMatterId = useMatterId();
  const [matterId, setMatterId] = useState("");
  const [anchorLimit, setAnchorLimit] = useState(220);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<any>(null);

  const loadLatest = async () => {
    if (!workspaceId || !authed) return;
    try {
      const res = await api.get(`/workspaces/${workspaceId}/chronology/latest`);
      setLatest(res || null);
    } catch {
      setLatest(null);
    }
  };

  useEffect(() => {
    loadLatest();
  }, []);

  useEffect(() => {
    if (routeMatterId && !matterId) {
      setMatterId(routeMatterId);
    }
  }, [routeMatterId, matterId]);

  const run = async () => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/chronology/run`, {
        matterId: matterId.trim() || routeMatterId || undefined,
        anchorLimit: Number(anchorLimit) || 220,
      });
      setLatest(res || null);
    } catch (e: any) {
      setError(e?.message || "Chronology run failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Auto-Chronology"
      subtitle="Generate an anchored timeline run. Output is only accepted when it cites real anchors."
      right={
        <div className="flex items-center gap-2">
          {workspaceId ? (
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
          )}
          <Badge tone={authed ? "green" : "red"}>{authed ? "Auth OK" : "Signed out"}</Badge>
        </div>
      }
    >
      {error ? <div className="mb-4"><Badge tone="red">{error}</Badge></div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Run</CardTitle>
            <CardSubtitle>
              {"Bounded evidence pack -> anchored chronology."}
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <label className="block text-sm text-slate-300">
              Matter ID (optional)
              <Input value={matterId} onChange={(e) => setMatterId(e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm text-slate-300">
              Anchor limit
              <Input
                type="number"
                value={anchorLimit}
                onChange={(e) => setAnchorLimit(Number(e.target.value))}
                className="mt-1"
                min={50}
                max={800}
              />
            </label>
            <Button variant="primary" onClick={run} disabled={!authed || busy}>
              {busy ? <Spinner size={16} /> : <i className="fa-solid fa-play" />}
              Run chronology
            </Button>
            <Button variant="secondary" onClick={loadLatest} disabled={!authed || busy}>
              <i className="fa-solid fa-rotate" /> Refresh latest
            </Button>
            {!authed ? (
              <div className="text-xs text-slate-400">
                Sign in to run chronology. If AI is disabled, set <span className="text-slate-200">GEMINI_API_KEY</span>.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Latest result</CardTitle>
            <CardSubtitle>Most recent anchored chronology run for this workspace.</CardSubtitle>
          </CardHeader>
          <CardBody>
            {latest ? (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Run ID: <span className="text-slate-200">{latest?.run?.id || "n/a"}</span>
                  {latest?.run?.status ? (
                    <span className="text-slate-500"> - {latest.run.status}</span>
                  ) : null}
                </div>
                <pre className="text-xs whitespace-pre-wrap bg-black border border-white/10 rounded-2xl p-4 overflow-auto text-[#E2E8F0]">
{JSON.stringify(latest, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No chronology runs yet.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
