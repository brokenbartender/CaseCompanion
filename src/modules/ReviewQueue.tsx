import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { opsStore, ReviewItem } from "../services/opsStore";
import { logForensicEvent } from "../services/forensicLogger";

export default function ReviewQueue() {
  const [filter, setFilter] = useState<ReviewItem["status"] | "all">("all");
  const [items, setItems] = useState<ReviewItem[]>(() => {
    const existing = opsStore.getReviewQueue();
    if (existing.length) return existing;
    return [
      { id: "EX-001", name: "Police_Report_Final.pdf", reviewer: "A. Lee", status: "queued" },
      { id: "EX-014", name: "Email_Thread_12-05.msg", reviewer: "J. Patel", status: "in-review" },
      { id: "EX-021", name: "Medical_Records_Bundle.pdf", reviewer: "S. Patel", status: "qc-hold" }
    ];
  });
  const [selected, setSelected] = useState<string[]>([]);

  const filteredItems = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.status === filter)),
    [filter, items]
  );

  const markDone = (id: string) => {
    const next: ReviewItem[] = items.map((item) =>
      item.id === id ? { ...item, status: "completed" as ReviewItem["status"] } : item
    );
    setItems(next);
    opsStore.saveReviewQueue(next);
    logForensicEvent("review.completed", { resourceId: id });
  };

  const markQcHold = (ids: string[]) => {
    const next: ReviewItem[] = items.map((item) =>
      ids.includes(item.id) ? { ...item, status: "qc-hold" as ReviewItem["status"] } : item
    );
    setItems(next);
    opsStore.saveReviewQueue(next);
    ids.forEach((id) => logForensicEvent("review.qc_hold", { resourceId: id }));
  };

  const markBulkComplete = (ids: string[]) => {
    const next: ReviewItem[] = items.map((item) =>
      ids.includes(item.id) ? { ...item, status: "completed" as ReviewItem["status"] } : item
    );
    setItems(next);
    opsStore.saveReviewQueue(next);
    ids.forEach((id) => logForensicEvent("review.completed", { resourceId: id }));
    setSelected([]);
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelected(filteredItems.map((item) => item.id));
  };

  const clearAll = () => setSelected([]);

  return (
    <Page title="Review Queue" subtitle="Assign reviewers and track discovery progress">
      <Card>
        <CardHeader>
          <CardTitle>Items in Review</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="uppercase tracking-[0.2em] text-slate-500">Filter</span>
            {(["all", "queued", "in-review", "qc-hold", "completed"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full border px-3 py-1 ${
                  filter === value ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-slate-800 bg-slate-900"
                }`}
              >
                {value === "all" ? "All" : value}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="uppercase tracking-[0.2em] text-slate-500">Bulk actions</span>
              <Button variant="secondary" onClick={selectAll}>Select All</Button>
              <Button variant="secondary" onClick={clearAll}>Clear</Button>
              <Button variant="primary" onClick={() => markBulkComplete(selected)} disabled={!selected.length}>
                Mark Complete ({selected.length})
              </Button>
              <Button variant="secondary" onClick={() => markQcHold(selected)} disabled={!selected.length}>
                Send to QC ({selected.length})
              </Button>
            </div>
          </div>

          {filteredItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3 text-sm">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(item.id)}
                  onChange={() => toggleSelected(item.id)}
                />
                <div>
                  <div className="text-slate-200">{item.name}</div>
                  <div className="text-xs text-slate-500">Assigned to {item.reviewer}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-amber-300">{item.status}</span>
                <Button variant="secondary" onClick={() => markDone(item.id)}>Mark Complete</Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </Page>
  );
}
