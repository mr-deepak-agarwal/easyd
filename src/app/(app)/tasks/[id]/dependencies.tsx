import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select } from "@/components/ui/fields";
import { addDependency, removeDependency } from "../actions";

type Ref = { id: number; title: string; status: string };

/** "Waiting for" lists what must finish first; "Blocking" lists the tasks waiting on this one. */
export function Dependencies({ taskId, waitingFor, blocking, candidates, canEdit }: { taskId: number; waitingFor: Ref[]; blocking: Ref[]; candidates: { id: number; title: string }[]; canEdit: boolean }) {
  const open = waitingFor.filter((b) => b.status !== "completed");
  return (
    <Card title="Dependencies">
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 font-medium"><Lock className="size-4 text-muted" aria-hidden />Waiting for{open.length ? <Badge tone="amber">{open.length} not done</Badge> : waitingFor.length ? <Badge tone="green">All done</Badge> : null}</h3>
          {waitingFor.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {waitingFor.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-3 py-2">
                  <Link href={`/tasks/${b.id}`} className="min-w-0 flex-1 truncate font-medium text-brand hover:underline">{b.title}</Link>
                  <Badge tone={b.status === "completed" ? "green" : "amber"}>{b.status === "completed" ? "Done" : "Open"}</Badge>
                  {canEdit && <form action={removeDependency.bind(null, taskId, b.id)}><button className="rounded-md px-2 py-1 text-xs text-muted hover:bg-raised hover:text-danger" aria-label={`Stop waiting for ${b.title}`}>Remove</button></form>}
                </li>))}
            </ul>) : <p className="text-muted">This task does not wait for anything.</p>}
          {canEdit && (
            <ActionForm action={addDependency.bind(null, taskId)} className="mt-2 flex flex-wrap items-center gap-2">
              <Select name="blocker" aria-label="Task to wait for" required defaultValue="" className="max-w-xs"><option value="" disabled>Choose a task to wait for</option>{candidates.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>
              <SubmitButton variant="secondary">Add</SubmitButton>
            </ActionForm>)}
        </div>
        {blocking.length > 0 && (
          <div>
            <h3 className="mb-1.5 font-medium">Blocking</h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {blocking.map((b) => <li key={b.id} className="flex items-center gap-3 px-3 py-2"><Link href={`/tasks/${b.id}`} className="min-w-0 flex-1 truncate text-brand hover:underline">{b.title}</Link><Badge tone={b.status === "completed" ? "green" : "grey"}>{b.status === "completed" ? "Done" : "Waiting"}</Badge></li>)}
            </ul>
          </div>)}
      </div>
    </Card>
  );
}
