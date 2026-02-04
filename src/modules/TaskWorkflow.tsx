import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { CheckCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  owner: string;
  status: "open" | "approved";
}

export default function TaskWorkflow() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "T-001", title: "Approve privilege log", owner: "Partner", status: "open" },
    { id: "T-002", title: "Review expert report", owner: "Associate", status: "open" }
  ]);

  const approve = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "approved" } : t)));
  };

  return (
    <Page title="Task & Approval Workflow" subtitle="Assignments, sign-offs, and decision history">
      <Card>
        <CardHeader><CardTitle>Open Tasks</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3 text-sm">
              <div>
                <div className="text-slate-200">{task.title}</div>
                <div className="text-xs text-slate-500">Owner: {task.owner}</div>
              </div>
              {task.status === "approved" ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs"><CheckCircle size={14}/> Approved</div>
              ) : (
                <Button variant="secondary" onClick={() => approve(task.id)}>Approve</Button>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </Page>
  );
}
