"use client";

import { useRef, useState, useTransition } from "react";
import { addComment } from "../actions";

type Person = { id: string; name: string };

/** Comment box. Typing "@" shows the people who can open this task; picking one inserts their full name. */
export function CommentBox({ taskId, people }: { taskId: number; people: Person[] }) {
  const [text, setText] = useState(""), [msg, setMsg] = useState("");
  const [query, setQuery] = useState<string | null>(null), [sel, setSel] = useState(0);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const hits = query === null ? [] : people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  function update(value: string, caret: number) {
    setText(value);
    const m = /(?:^|\s)@([\p{L}\p{N} ]{0,30})$/u.exec(value.slice(0, caret));
    setQuery(m ? m[1] : null); setSel(0);
  }
  function pick(p: Person) {
    const el = ref.current; if (!el) return;
    const caret = el.selectionStart, before = text.slice(0, caret).replace(/@[\p{L}\p{N} ]{0,30}$/u, "");
    const next = `${before}@${p.name} ${text.slice(caret)}`;
    setText(next); setQuery(null);
    requestAnimationFrame(() => { const pos = before.length + p.name.length + 2; el.focus(); el.setSelectionRange(pos, pos); });
  }

  return (
    <form className="space-y-2" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(); fd.set("comment", text);
      start(async () => { const r = await addComment(taskId, {}, fd); if (r.error) setMsg(r.error); else { setMsg(""); setText(""); } });
    }}>
      <label htmlFor="comment" className="block text-sm font-medium">Add a comment</label>
      <div className="relative">
        <textarea id="comment" ref={ref} name="comment" rows={3} required maxLength={2000} value={text} placeholder="Write a comment. Type @ to mention someone."
          onChange={(e) => update(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (query === null || !hits.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(hits[sel]); }
            else if (e.key === "Escape") { e.preventDefault(); setQuery(null); }
          }}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand" />
        {query !== null && hits.length > 0 && (
          <ul role="listbox" aria-label="People to mention" className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-2xl">
            {hits.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === sel}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(p); }} onMouseEnter={() => setSel(i)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${i === sel ? "bg-brand-soft text-brand" : ""}`}>
                  <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">{p.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>{p.name}
                </button>
              </li>))}
          </ul>)}
      </div>
      {msg && <p role="alert" className="text-sm text-danger">{msg}</p>}
      <button disabled={pending || !text.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60">{pending ? "Posting..." : "Post"}</button>
    </form>
  );
}
