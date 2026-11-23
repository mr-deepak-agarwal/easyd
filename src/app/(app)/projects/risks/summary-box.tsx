"use client";

import { useState, useTransition } from "react";
import { summariseRisks } from "./actions";

export function SummaryBox({ enabled }: { enabled: boolean }) {
  const [text, setText] = useState(""), [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <button type="button" disabled={!enabled || pending} onClick={() => start(async () => { setErr(""); const r = await summariseRisks(); r.text ? setText(r.text) : setErr(r.error ?? "No summary"); })}
        className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background disabled:opacity-50">{pending ? "Writing..." : "Write a summary with AI"}</button>
      {!enabled && <span className="ml-2 text-xs text-muted">AI is not switched on yet.</span>}
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {text && <div className="whitespace-pre-line rounded-md border border-border bg-white p-3 text-sm">{text}<p className="mt-2 text-xs text-muted">AI wording of the warnings in the table. The table is the source.</p></div>}
    </div>
  );
}
