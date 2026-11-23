"use client";

import { useRef, useState, useTransition } from "react";
import { askErp, type Turn } from "./actions";

const EXAMPLES = ["Which projects are over their planned hours?", "Who has overdue tasks right now?", "How much did we invoice last month?", "Which projects lost money this quarter?"];

export function AskBox({ enabled }: { enabled: boolean }) {
  const [turns, setTurns] = useState<(Turn & { used?: string[]; error?: boolean })[]>([]);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    setQ("");
    start(async () => {
      const res = await askErp(question, turns.filter((t) => !t.error).map(({ q, a }) => ({ q, a })));
      setTurns((t) => [...t, { q: question, a: res.answer ?? res.error ?? "No answer", used: res.used, error: !res.answer }]);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }

  return (
    <div className="space-y-4">
      {!enabled && <p role="status" className="rounded-md border border-border bg-white p-3 text-sm text-muted">AI is not switched on yet. The admin needs to add the AI key in the hosting settings.</p>}
      <div className="space-y-4" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-auto w-fit max-w-[90%] rounded-lg bg-brand px-3 py-2 text-sm text-white">{t.q}</p>
            <div className={`max-w-[90%] whitespace-pre-line rounded-lg border bg-white px-3 py-2 text-sm ${t.error ? "border-danger text-danger" : "border-border"}`}>
              {t.a}
              {!!t.used?.length && <p className="mt-2 text-xs text-muted">Looked at: {t.used.join(", ")}</p>}
            </div>
          </div>
        ))}
        {pending && <p className="text-sm text-muted">Looking it up...</p>}
        <div ref={end} />
      </div>
      {!turns.length && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => <button key={e} type="button" disabled={!enabled} onClick={() => send(e)} className="rounded-full border border-border bg-white px-3 py-1 text-sm hover:bg-background disabled:opacity-50">{e}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(q); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={600} placeholder="Ask about projects, time, tasks, invoices, scores" aria-label="Your question"
          className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm" disabled={!enabled} />
        <button disabled={!enabled || pending || q.trim().length < 3} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Ask</button>
      </form>
      <p className="text-xs text-muted">Answers come from live data and can still be wrong. Check important figures in the reports. This assistant can only read; it never changes anything.</p>
    </div>
  );
}
