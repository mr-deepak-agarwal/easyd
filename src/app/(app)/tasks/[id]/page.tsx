import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { addComment, setTaskStatus, updateTask } from "../actions";
import { TaskFields } from "../task-fields";

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId)) notFound();
  const supabase = await createClient();
  const [{ data: task }, { data: canEdit }, { data: comments }, { data: people }] = await Promise.all([
    supabase.from("tasks").select("*, projects(id, name), creator:created_by(name), task_participants(profile_id, is_responsible, profiles(name))").eq("id", taskId).maybeSingle(),
    supabase.rpc("can_edit_task", { tid: taskId }),
    supabase.from("task_comments").select("id, comment, created_at, user_id, profiles:user_id(name)").eq("task_id", taskId).order("id", { ascending: false }),
    supabase.from("profiles").select("id, name").eq("active", true).order("name"),
  ]);
  if (!task) notFound();
  const done = task.status === "completed";
  const named = (resp: boolean) => task.task_participants.filter((p) => p.is_responsible === resp).map((p) => (p.profiles as { name: string } | null)?.name ?? "Former staff").join(", ") || "-";
  const back = task.projects ? `/projects/${task.projects.id}?tab=tasks` : "/tasks";

  return (
    <div className="space-y-5">
      <PageHeader title={task.title} description={task.projects ? `Project: ${task.projects.name}` : "General task"}>
        <Badge tone={done ? "green" : "amber"}>{done ? "Completed" : "Open"}</Badge>
        {canEdit === true && (
          <form action={setTaskStatus.bind(null, taskId, !done)}>
            <SubmitButton variant={done ? "secondary" : "primary"} confirm={done ? "Reopen this task?" : "Mark this task as complete?"}>{done ? "Reopen" : "Mark complete"}</SubmitButton>
          </form>
        )}
        <Link href={back} className="text-sm text-brand hover:underline">Back</Link>
      </PageHeader>

      <Card title="Details">
        {canEdit === true && !done ? (
          <ActionForm action={updateTask.bind(null, taskId)} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
            <TaskFields people={people ?? []} d={{
              title: task.title, description: task.description, starts_on: task.starts_on, ends_on: task.ends_on,
              responsible: task.task_participants.filter((p) => p.is_responsible).map((p) => p.profile_id),
              participants: task.task_participants.filter((p) => !p.is_responsible).map((p) => p.profile_id),
            }} />
            <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
          </ActionForm>
        ) : (
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Description</dt><dd className="whitespace-pre-wrap">{task.description ?? "-"}</dd>
            <dt className="text-muted">Starts on</dt><dd>{formatDate(task.starts_on)}</dd>
            <dt className="text-muted">Due on</dt><dd>{formatDate(task.ends_on)}</dd>
            <dt className="text-muted">Responsible</dt><dd>{named(true)}</dd>
            <dt className="text-muted">Also involved</dt><dd>{named(false)}</dd>
            <dt className="text-muted">Created by</dt><dd>{(task.creator as { name: string } | null)?.name ?? "-"}</dd>
            {done && <><dt className="text-muted">Completed</dt><dd>{formatDate(task.completed_at)}</dd></>}
          </dl>
        )}
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Comments</h2>
        <Card>
          <ActionForm action={addComment.bind(null, taskId)} className="grid gap-3">
            <Field label="Add a comment" htmlFor="comment"><Textarea id="comment" name="comment" required maxLength={2000} /></Field>
            <div><SubmitButton>Post</SubmitButton></div>
          </ActionForm>
        </Card>
        <ul className="mt-3 space-y-3">
          {comments?.length ? comments.map((c) => (
            <li key={c.id} className={`rounded-xl border border-border p-3 text-sm ${c.user_id === user.id ? "bg-brand-soft" : "bg-card"}`}>
              <div className="mb-1 text-xs text-muted">{(c.profiles as { name: string } | null)?.name ?? "Former staff"} · {new Date(c.created_at ?? "").toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</div>
              <p className="whitespace-pre-wrap">{c.comment}</p>
            </li>
          )) : <li className="text-sm text-muted">No comments yet</li>}
        </ul>
      </section>
    </div>
  );
}
