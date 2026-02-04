import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { Network, Database, Search, Users } from "lucide-react";

const NODES = [
  { label: "Alex Trent", role: "Engineer", link: "Northwind" },
  { label: "Northwind", role: "Vendor", link: "Sensor Project" },
  { label: "Sensor Project", role: "Program", link: "Recall 2025" }
];

export default function GraphRAGStudio() {
  const [built, setBuilt] = useState(false);

  return (
    <ModuleLayout
      title="GraphRAG Studio"
      subtitle="Entity graph + vector search for global reasoning"
      kpis={[
        { label: "Nodes", value: "1,482", tone: "neutral" },
        { label: "Edges", value: "3,902", tone: "good" },
        { label: "Queries", value: "12", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-100">
              <Network size={18} />
              Relationship Graph
            </CardTitle>
            <CardSubtitle className="text-blue-200/60">
              Extract entities, build edges, and query with graph walks.
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              Upload 1,000+ documents to generate a cross‑matter knowledge graph.
            </div>
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-500" onClick={() => setBuilt(true)}>
              Build Graph
            </Button>
            {built ? (
              <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-100">
                Graph ready. 1,482 nodes · 3,902 edges.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={18} className="text-blue-400" />
                Graph View
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              {NODES.map((node) => (
                <div key={node.label} className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-slate-200 font-medium">{node.label}</div>
                  <div className="text-xs text-slate-500">{node.role} → {node.link}</div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search size={18} className="text-emerald-400" />
                Query
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full">
                Run Graph Walk
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Export Neo4j Bundle
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                Insight
              </CardTitle>
            </CardHeader>
            <CardBody className="text-sm text-slate-300">
              "Alex Trent" appears in 7 documents tied to the recall investigation.
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
