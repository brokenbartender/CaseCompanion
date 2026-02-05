import React, { useMemo } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { MICHIGAN_OBJECTION_CARDS } from "../data/michiganEvidenceObjections";
import { MCI_115 } from "../data/michiganAssaultCivil";
import { useNavigate } from "react-router-dom";

const TIMELINE_KEY = "case_companion_timeline_v1";
const VIDEO_SYNC_KEY = "case_companion_video_sync_v1";
const JI_KEY = "case_companion_ji_checklist_v1";

type TimelineEvent = { date: string; title: string; note: string; evidence: string[] };
type SyncRow = { timecode: string; reportLine: string; note: string };

export default function TrialMode() {
  const navigate = useNavigate();
  const timeline = readJson<TimelineEvent[]>(TIMELINE_KEY, []);
  const syncRows = readJson<SyncRow[]>(VIDEO_SYNC_KEY, []);
  const checklist = readJson<Record<string, boolean>>(JI_KEY, {});

  const trialPicks = useMemo(
    () => EVIDENCE_INDEX.filter((item) => /police report|victim statement|video/i.test(item.name)).slice(0, 6),
    []
  );

  const sortedTimeline = useMemo(() => [...timeline].sort((a, b) => a.date.localeCompare(b.date)), [timeline]);

  function exportTrialPack() {
    const payload = {
      trialPicks,
      timeline: sortedTimeline,
      videoSync: syncRows,
      objections: MICHIGAN_OBJECTION_CARDS,
      juryChecklist: MCI_115.map((item) => ({ id: item.id, title: item.title, checked: Boolean(checklist[item.id]) }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_companion_trial_pack.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page title="Trial Mode" subtitle="Single-screen courtroom view (informational only).">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Export</CardSubtitle>
            <CardTitle>Trial Pack</CardTitle>
          </CardHeader>
          <CardBody>
            <button
              type="button"
              onClick={exportTrialPack}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Export Trial Pack
            </button>
            <div className="mt-2 text-xs text-slate-500">Includes timeline, video sync, objections, and checklist.</div>
          </CardBody>
        </Card>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardSubtitle>Exhibits</CardSubtitle>
              <CardTitle>Quick Access</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2">
                    {trialPicks.length === 0 ? (
                      <div className="text-sm text-slate-400">No trial picks found.</div>
                    ) : (
                      trialPicks.map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          className="w-full rounded-lg bg-amber-500 px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          onClick={() => navigate(`/evidence?highlight=${encodeURIComponent(item.path)}`)}
                        >
                          {item.name}
                        </button>
                      ))
                    )}
              </div>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardSubtitle>Timeline</CardSubtitle>
              <CardTitle>Linked Events</CardTitle>
            </CardHeader>
            <CardBody>
              {sortedTimeline.length === 0 ? (
                <div className="text-sm text-slate-400">No timeline entries yet.</div>
              ) : (
                <div className="space-y-3 text-sm text-slate-200">
                  {sortedTimeline.map((event, idx) => (
                    <div key={`${event.title}-${idx}`} className="rounded-md border border-white/5 bg-white/5 p-3">
                      <div className="text-xs text-slate-400">{event.date || "TBD"}</div>
                      <div className="text-sm font-semibold text-white">{event.title}</div>
                      {event.note ? <div className="text-xs text-slate-300 mt-1">{event.note}</div> : null}
                      {event.evidence?.length ? (
                        <div className="mt-2 text-xs text-amber-200">
                          Evidence:
                          <ul className="mt-1 space-y-1 text-slate-300">
                            {event.evidence.map((path) => {
                              const match = EVIDENCE_INDEX.find((item) => item.path === path);
                              return (
                                <li key={path}>
                                  <button
                                    type="button"
                                    className="text-left text-amber-200 hover:text-amber-100"
                                    onClick={() => navigate(`/evidence?highlight=${encodeURIComponent(path)}`)}
                                  >
                                    {match?.name || path}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardSubtitle>Video Sync</CardSubtitle>
              <CardTitle>Timestamp Links</CardTitle>
            </CardHeader>
            <CardBody>
              {syncRows.length === 0 ? (
                <div className="text-sm text-slate-400">No sync mappings yet.</div>
              ) : (
                <div className="space-y-2 text-xs text-slate-300">
                  {syncRows.map((row, idx) => (
                    <div key={idx} className="rounded-md border border-white/5 bg-white/5 p-2">
                      <div className="text-amber-200">{row.timecode}</div>
                      <div className="text-slate-100">{row.reportLine}</div>
                      {row.note ? <div className="text-slate-400">{row.note}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardSubtitle>Objections</CardSubtitle>
              <CardTitle>Battle Cards</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-xs text-slate-300">
                {MICHIGAN_OBJECTION_CARDS.map((card) => (
                  <div key={card.id} className="rounded-md border border-white/5 bg-white/5 p-2">
                    <div className="text-amber-200">{card.rule}</div>
                    <div className="text-slate-100 font-semibold">{card.title}</div>
                    <div className="text-slate-400">{card.whenToUse[0]}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardSubtitle>Jury Elements</CardSubtitle>
              <CardTitle>Instruction Checklist</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-xs text-slate-300">
                {MCI_115.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border border-white/5 bg-white/5 p-2">
                    <div>{item.title}</div>
                    <div className={checklist[item.id] ? "text-emerald-300" : "text-slate-500"}>
                      {checklist[item.id] ? "Proven" : "Open"}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  );
}
