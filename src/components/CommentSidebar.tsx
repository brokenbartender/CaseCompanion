import React, { useEffect, useMemo, useState } from "react";
import Button from "./ui/Button";

type Comment = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

const storageKey = (path: string) => {
  const parts = path.split("/");
  const matterId = parts[2] || "global";
  return `lexipro-comments:${matterId}:${path}`;
};

export default function CommentSidebar({ currentPath }: { currentPath: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(currentPath));
      setComments(raw ? JSON.parse(raw) : []);
    } catch {
      setComments([]);
    }
  }, [currentPath]);

  useEffect(() => {
    localStorage.setItem(storageKey(currentPath), JSON.stringify(comments));
  }, [comments, currentPath]);

  const addComment = () => {
    if (!text.trim()) return;
    const next: Comment = {
      id: `c-${Date.now()}`,
      text: text.trim(),
      author: "You",
      createdAt: new Date().toLocaleString()
    };
    setComments((prev) => [next, ...prev]);
    setText("");
  };

  const headerLabel = useMemo(() => currentPath.replace("/matters/", ""), [currentPath]);

  return (
    <div
      className={`border-l border-slate-800 bg-slate-950 text-slate-200 transition-all ${
        open ? "w-80" : "w-12"
      } hidden xl:flex flex-col`}
    >
      <button
        type="button"
        className="h-12 w-full border-b border-slate-800 text-xs uppercase tracking-[0.3em] text-slate-500"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Comments" : "C"}
      </button>
      {open ? (
        <div className="flex h-full flex-col p-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Thread</div>
          <div className="text-xs text-slate-400">{headerLabel || "Dashboard"}</div>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="rounded border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
                No comments yet. Add the first note for this module.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-xs text-slate-400">{comment.author}</div>
                  <div className="mt-1 text-sm text-slate-200">{comment.text}</div>
                  <div className="mt-2 text-[10px] text-slate-500">{comment.createdAt}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-200"
              placeholder="Add a comment..."
            />
            <Button variant="primary" size="sm" onClick={addComment}>
              Add Comment
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
