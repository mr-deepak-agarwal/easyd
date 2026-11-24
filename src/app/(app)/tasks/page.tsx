import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate, todayIST } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, List } from "lucide-react";
import { createTask } from "./actions";
import { Board, type BoardTask } from "./board";
import { TaskFields } from "./task-fields";

const FILTERS = [["open", "Open"], ["completed", "Completed"]] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  await requireUser();
  const sp = await searchParams;
  const show = one(sp.show) === "completed" ? "completed" : "open";
  const view = one(sp.view) === "list" ? "list" : "board";
  const supabase = await createClient();
  const [{ data: tasks }, { data: people }] = await Promise.all([
    supabase.from("tasks")
      .select("id, title, ends_on, status, projects(name), creator:created_by(name), task_participants(is_responsible, profiles(name))")
      .eq("status", show === "completed" ? "completed" : "created").order("ends_on", { ascending: true, nullsFirst: false }).limit(300),
    supabase.from("profiles").select("id, name").eq("active", true).order("name"),
  ]);
  const today = todayIST();
  return (
    <div className="space-y-5">
      <PageHeader title="Tasks" description="Tasks you created or are part of, and tasks on your projects">
        <Link href="/tasks/from-notes" className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-raised">Tasks from notes (AI)</Link>
        <div className="flex rounded-lg bg-raised p-1" role="group" aria-label="View">
          {([["board", "Board", LayoutGrid], ["list", "List", List]] as const).map(([k, label, Icon]) => (
            <Link key={k} href={`/tasks?view=${k}&show=${show}`} aria-current={view === k ? "true" : undefined}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${view === k ? "bg-card font-medium text-brand shadow-[var(--shadow)]" : "text-muted hover:text-foreground"}`}><Icon className="size-4" aria-hidden />{label}</Link>
          ))}
        </div>
        <div className="flex rounded-lg bg-raised p-1" role="group" aria-label="Status">
          {FILTERS.map(([k, label]) => (
            <Link key={k} href={`/tasks?view=${view}&show=${k}`} aria-current={k === show ? "true" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${k === show ? "bg-card font-medium text-brand shadow-[var(--shadow)]" : "text-muted hover:text-foreground"}`}>{label}</Link>
          ))}
        </div>
      </PageHeader>
      <details className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow)]">
        <summary className="cursor-pointer text-sm font-semibold">New task</summary>
        <ActionForm action={createTask.bind(null, null)} className="mt-4 grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
          <TaskFields people={people ?? []} />
          <div className="sm:col-span-2"><SubmitButton>Create task</SubmitButton></div>
        </ActionForm>
      </details>
      {view === "board" && show === "open" ? (
        <Board today={today} tasks={(tasks ?? []).map((t): BoardTask => ({ id: t.id, title: t.title, ends_on: t.ends_on, project: t.projects?.name ?? null, people: t.task_participants.filter((p) => p.is_responsible).map((p) => (p.profiles as { name: string } | null)?.name ?? "").filter(Boolean) }))} />
      ) : (
      <Table>
        <thead><tr><Th>Task</Th><Th>Project</Th><Th>Responsible</Th><Th>Due</Th><Th>Created by</Th></tr></thead>
        <tbody>
          {tasks?.length ? tasks.map((t) => {
            const resp = t.task_participants.filter((p) => p.is_responsible).map((p) => (p.profiles as { name: string } | null)?.name).filter(Boolean).join(", ");
            const late = show === "open" && t.ends_on && t.ends_on < today;
            return (
              <tr key={t.id}>
                <Td><Link href={`/tasks/${t.id}`} className="font-medium text-brand hover:underline">{t.title}</Link></Td>
                <Td>{t.projects?.name ?? "-"}</Td><Td>{resp || "-"}</Td>
                <Td>{formatDate(t.ends_on)} {late && <Badge tone="red">Overdue</Badge>}</Td>
                <Td>{(t.creator as { name: string } | null)?.name ?? "-"}</Td>
              </tr>
            );
          }) : <EmptyRow cols={5} text={show === "completed" ? "No completed tasks" : "No open tasks"} />}
        </tbody>
      </Table>
      )}
    </div>
  );
}
