import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { splitMentions } from "@/lib/notify-core";
import { CommentBox } from "./comment-box";
import { updateTask } from "../actions";
import { TaskFields } from "../task-fields";
import { TaskActions } from "./task-actions";
import { Dependencies } from "./dependencies";
import { repeatLabel, stageLabel, type StageKey } from "@/lib/task-core";

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId)) notFound();
  const supabase = await createClient();
  const [{ data: task }, { data: canEdit }, { data: comments }, { data: people }, { data: waitRows }, { data: blockRows }] = await Promise.all([
    supabase.from("tasks").select("*, projects(id, name), creator:created_by(name), task_participants(profile_id, is_responsible, profiles(name))").eq("id", taskId).maybeSingle(),
    supabase.rpc("can_edit_task", { tid: taskId }),
    supabase.from("task_comments").select("id, comment, created_at, user_id, mentions, profiles:user_id(name)").eq("task_id", taskId).order("id", { ascending: false }),
    supabase.from("profiles").select("id, name, role").eq("active", true).order("name"),
    supabase.from("task_dependencies").select("blocker:depends_on_id(id, title, status)").eq("task_id", taskId),
    supabase.from("task_dependencies").select("dependent:task_id(id, title, status)").eq("depends_on_id", taskId),
  ]);
  if (!task) notFound();
  // People who can open this task (and so can be @mentioned usefully): admin, the creator, the people on it, and the project team and managers.
  const team = task.project_id ? ((await supabase.from("project_team").select("member_id").eq("project_id", task.project_id)).data ?? []).map((m) => m.member_id) : [];
  const leader = task.project_id ? (await supabase.from("projects").select("leader_id").eq("id", task.project_id).maybeSingle()).data?.leader_id : null;
  const onTask = new Set([task.created_by, leader, ...team, ...task.task_participants.map((p) => p.profile_id)]);
  const mentionable = (people ?? []).filter((p) => p.id !== user.id && (p.role === "admin" || onTask.has(p.id) || (!!task.project_id && ["bd", "teamlead", "teamlead2"].includes(p.role))));
  const waitingFor = (waitRows ?? []).map((r) => r.blocker as { id: number; title: string; status: string } | null).filter((b): b is { id: number; title: string; status: string } => !!b);
  const blocking = (blockRows ?? []).map((r) => r.dependent as { id: number; title: string; status: string } | null).filter((b): b is { id: number; title: string; status: string } => !!b);
  // Tasks that could be waited for: open ones in the same project, or ones the person is on.
  const taken = new Set([taskId, ...waitingFor.map((b) => b.id)]);
  const candidates = canEdit === true
    ? ((task.project_id ? await supabase.from("tasks").select("id, title").eq("status", "created").eq("project_id", task.project_id).order("id", { ascending: false }).limit(200)
        : await supabase.from("tasks").select("id, title").eq("status", "created").order("id", { ascending: false }).limit(200)).data ?? []).filter((c) => !taken.has(c.id))
    : [];
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.name]));
  const done = task.status === "completed";
  const named = (resp: boolean) => task.task_participants.filter((p) => p.is_responsible === resp).map((p) => (p.profiles as { name: string } | null)?.name ?? "Former staff").join(", ") || "-";
  const back = task.projects ? `/projects/${task.projects.id}?tab=tasks` : "/tasks";

  return (
    <div className="space-y-5">
      <PageHeader title={task.title} description={task.projects ? `Project: ${task.projects.name}` : "General task"}>
        <Badge tone={done ? "green" : task.stage === "in_progress" ? "blue" : task.stage === "review" ? "violet" : "amber"}>{done ? "Completed" : stageLabel(task.stage)}</Badge>
        {canEdit === true && <TaskActions taskId={taskId} stage={task.stage as StageKey} done={done} waitingFor={waitingFor.filter((b) => b.status !== "completed").map((b) => b.title)} />}
        <Link href={back} className="text-sm text-brand hover:underline">Back</Link>
      </PageHeader>

      <Card title="Details">
        {canEdit === true && !done ? (
          <ActionForm action={updateTask.bind(null, taskId)} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
            <TaskFields people={people ?? []} d={{
              title: task.title, description: task.description, starts_on: task.starts_on, ends_on: task.ends_on,
              responsible: task.task_participants.filter((p) => p.is_responsible).map((p) => p.profile_id),
              participants: task.task_participants.filter((p) => !p.is_responsible).map((p) => p.profile_id),
              repeat_rule: task.repeat_rule, repeat_until: task.repeat_until,
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
            {task.repeat_rule && <><dt className="text-muted">Repeats</dt><dd>{repeatLabel(task.repeat_rule)}{task.repeat_until ? ` until ${formatDate(task.repeat_until)}` : ""}</dd></>}
            <dt className="text-muted">Created by</dt><dd>{(task.creator as { name: string } | null)?.name ?? "-"}</dd>
            {done && <><dt className="text-muted">Completed</dt><dd>{formatDate(task.completed_at)}</dd></>}
          </dl>
        )}
      </Card>

      <Dependencies taskId={taskId} waitingFor={waitingFor} blocking={blocking} candidates={candidates} canEdit={canEdit === true && !done} />

      <section>
        <h2 className="mb-2 text-base font-semibold">Comments</h2>
        <Card><CommentBox taskId={taskId} people={mentionable.map(({ id, name }) => ({ id, name }))} /></Card>
        <ul className="mt-3 space-y-3">
          {comments?.length ? comments.map((c) => (
            <li key={c.id} className={`rounded-xl border border-border p-3 text-sm ${c.user_id === user.id ? "bg-brand-soft" : "bg-card"}`}>
              <div className="mb-1 text-xs text-muted">{(c.profiles as { name: string } | null)?.name ?? "Former staff"} · {new Date(c.created_at ?? "").toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</div>
              <p className="whitespace-pre-wrap">{splitMentions(c.comment, (c.mentions ?? []).map((m) => nameOf.get(m) ?? "")).map((part, k) => part.mention ? <span key={k} className="rounded bg-brand-soft px-1 font-medium text-brand">{part.text}</span> : <span key={k}>{part.text}</span>)}</p>
            </li>
          )) : <li className="text-sm text-muted">No comments yet</li>}
        </ul>
      </section>
    </div>
  );
}
