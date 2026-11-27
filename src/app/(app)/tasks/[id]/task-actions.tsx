"use client";

import { useTransition } from "react";
import { moveTask } from "../actions";
import { useToast } from "@/components/ui/toast";
import { STAGES, type StageKey } from "@/lib/task-core";

/** Stage picker and the complete / reopen button. Shows the database's reason when a move is refused. */
export function TaskActions({ taskId, stage, done, waitingFor }: { taskId: number; stage: StageKey; done: boolean; waitingFor: string[] }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const go = (to: StageKey, message: string) => start(async () => {
    const r = await moveTask(taskId, to);
    if (!r.ok) toast(r.error, { tone: "error" });
    else toast(message);
  });
  return (
    <div className="flex items-center gap-2">
      {!done && (
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Stage</span>
          <select value={stage} disabled={pending} onChange={(e) => go(e.target.value as StageKey, "Stage updated")} className="rounded-lg border border-border bg-card px-2.5 py-2 text-sm">
            {STAGES.filter((s) => s.key !== "done").map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>)}
      <button type="button" disabled={pending} title={!done && waitingFor.length ? `Waiting for: ${waitingFor.join(", ")}` : undefined}
        onClick={() => { if (!done || window.confirm("Reopen this task?")) go(done ? "todo" : "done", done ? "Task reopened" : "Task completed"); }}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[.98] disabled:opacity-60 ${done ? "border border-border bg-card hover:bg-raised" : "bg-brand text-white hover:opacity-90"}`}>
        {done ? "Reopen" : "Mark complete"}
      </button>
    </div>
  );
}
