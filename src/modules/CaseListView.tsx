import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const casesSeed = [
  { id: "M-2024-001", title: "Acme v. Northwind", court: "E.D. Mich", nextDate: "2026-03-01" },
  { id: "M-2024-002", title: "United v. Clark", court: "N.D. Ill", nextDate: "2026-03-05" }
];

export default function CaseListView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Title");

  return (
    <Page title="Cases List" subtitle="Search, filter, customize columns, and print cause list">
      <Card>
        <CardHeader><CardTitle>Case List</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by case, number, court"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option>All</option>
              <option>Active</option>
              <option>Archived</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option>Title</option>
              <option>Court</option>
              <option>Next Date</option>
            </select>
            <Button variant="secondary">Customize Columns</Button>
            <Button variant="secondary">Print Cause List</Button>
            <Button variant="secondary">Calendar View</Button>
          </div>
          {casesSeed.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-slate-100 font-semibold">{c.title}</div>
              <div className="text-xs text-slate-500">{c.court} • Next date {c.nextDate}</div>
            </div>
          ))}
        </CardBody>
      </Card>
    </Page>
  );
}
