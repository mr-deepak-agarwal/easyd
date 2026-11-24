"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { proposeTasks, createTasksFromProposals, type Proposal } from "./actions";

type Row = Proposal & { on: boolean; assignee_id: string };

export function NotesForm({ projects, enabled }: { projects: { id: number; label: string }[]; enabled: boolean }) {
  const [notes, setNotes] = useState(""), [project, setProject] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null), [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState(""), [done, setDone] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const pid = project ? Number(project) : null;
  const set = (i: number, p: Partial<Row>) => setRows((r) => r && r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <div className="space-y-4">
      {!enabled && <p role="status" className="rounded-md border border-border bg-card p-3 text-sm text-muted">AI is not switched on yet. The admin needs to add the AI key.</p>}
      {done !== null ? (
        <div className="space-y-3"><p role="status" className="text-sm">Created {done} task{done === 1 ? "" : "s"}.</p><Link href="/tasks" className="text-sm text-brand hover:underline">Go to tasks</Link></div>
      ) : !rows ? (
        <>
          <label className="block text-sm font-medium" htmlFor="project">Project (optional)</label>
          <select id="project" value={project} onChange={(e) => setProject(e.target.value)} className="w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-sm">
            <option value="">No project (general tasks, anyone can be chosen)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <label className="block text-sm font-medium" htmlFor="notes">Paste meeting notes or an email</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={9} maxLength={6000} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm" placeholder="e.g. Client wants the draft report by Friday. Ravi to send the data, Meera to update the model..." />
          <button type="button" disabled={!enabled || pending || notes.trim().length < 10} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => start(async () => {
              setMsg(""); const r = await proposeTasks(notes, pid);
              if (r.proposals) { setPeople(r.people ?? []); setRows(r.proposals.map((p) => ({ ...p, on: true, assignee_id: (r.people ?? []).find((x) => x.name === p.assignee)?.id ?? "" }))); } else setMsg(r.error ?? "Nothing found");
            })}>{pending ? "Reading..." : "Find the tasks"}</button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Check each task. Untick any you do not want. Tasks with nobody chosen are assigned to you.</p>
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={i} className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[auto_1fr_200px_150px] sm:items-start">
                <input type="checkbox" checked={r.on} onChange={(e) => set(i, { on: e.target.checked })} aria-label={`Include task ${i + 1}`} className="mt-2" />
                <div className="space-y-1">
                  <input value={r.title} onChange={(e) => set(i, { title: e.target.value })} maxLength={200} aria-label={`Title ${i + 1}`} className="w-full rounded-md border border-border px-2 py-1.5 text-sm" />
                  <input value={r.description} onChange={(e) => set(i, { description: e.target.value })} maxLength={500} aria-label={`Details ${i + 1}`} placeholder="Details" className="w-full rounded-md border border-border px-2 py-1 text-xs" />
                </div>
                <select value={r.assignee_id} onChange={(e) => set(i, { assignee_id: e.target.value })} aria-label={`Responsible ${i + 1}`} className="rounded-md border border-border px-2 py-1.5 text-sm">
                  <option value="">Me</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="date" value={r.due} onChange={(e) => set(i, { due: e.target.value })} aria-label={`Due ${i + 1}`} className="rounded-md border border-border px-2 py-1.5 text-sm" />
              </li>))}
          </ul>
          <div className="flex gap-2">
            <button type="button" disabled={pending || !rows.some((r) => r.on)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => start(async () => {
                setMsg(""); const r = await createTasksFromProposals(pid, rows.filter((x) => x.on).map((x) => ({ title: x.title, description: x.description, assignee_id: x.assignee_id, due: x.due })));
                if (r.created) setDone(r.created); else setMsg(r.error ?? "Nothing was created");
              })}>{pending ? "Creating..." : "Create selected tasks"}</button>
            <button type="button" onClick={() => setRows(null)} className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-raised">Back</button>
          </div>
        </>
      )}
      {msg && <p role="alert" className="text-sm text-danger">{msg}</p>}
      <p className="text-xs text-muted">AI suggests the tasks. Nothing is created until you press the button, and you can change anything first.</p>
    </div>
  );
}
