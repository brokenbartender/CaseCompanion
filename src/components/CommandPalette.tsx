import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const COMMANDS = [
  { label: "Go to Evidence Locker", path: "exhibits" },
  { label: "Open Review Queue", path: "review-queue" },
  { label: "Open Compliance Hub", path: "compliance" },
  { label: "Create Production Package", path: "production-center" }
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const { matterId } = useParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const items = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-950 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          placeholder="Jump to a module..."
        />
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                navigate(`/matters/${matterId}/${item.path}`);
              }}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
            >
              {item.label}
            </button>
          ))}
          {!items.length ? <div className="text-xs text-slate-500">No matches.</div> : null}
        </div>
      </div>
    </div>
  );
}
