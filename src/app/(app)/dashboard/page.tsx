import Link from "next/link";
import { Bell, CalendarClock, Clock3, FolderCheck, ListTodo, UserCheck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/roles";
import { todayIST, formatDate } from "@/lib/dates";
import { formatMinutes } from "@/lib/time";
import { iconFor } from "@/components/shell/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WelcomeTips } from "@/components/shell/welcome-tips";
import { KIND_ICON } from "@/components/shell/kind-icons";
import { timeAgo } from "@/lib/notify-core";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function weekStart(today: string) {
  const d = new Date(today + "T00:00:00Z"); const back = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const today = todayIST();
  const mgmt = user.role !== "employee";
  const [{ data: mine }, { data: time }, pending, projectsPending, { data: recent }] = await Promise.all([
    supabase.from("task_participants").select("tasks!inner(id, title, ends_on, status, projects(name))").eq("profile_id", user.id).eq("tasks.status", "created").limit(200),
    supabase.from("time_entries").select("minutes").eq("profile_id", user.id).gte("entry_date", weekStart(today)).lte("entry_date", today),
    user.role === "admin" ? supabase.from("leave_applications").select("id", { count: "exact", head: true }).eq("status", "pending") : Promise.resolve({ count: null }),
    mgmt ? supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "pending") : Promise.resolve({ count: null }),
    supabase.from("notifications").select("id, kind, title, body, href, created_at, read_at").order("id", { ascending: false }).limit(5),
  ]);
  const tasks = [...new Map((mine ?? []).map((m) => [m.tasks!.id, m.tasks!])).values()]
    .sort((a, b) => (a.ends_on ?? "9999").localeCompare(b.ends_on ?? "9999"));
  const overdue = tasks.filter((t) => t.ends_on && t.ends_on < today).length;
  const minutes = (time ?? []).reduce((s, r) => s + r.minutes, 0);
  const groups = navForRole(user.role).map((g) => ({ ...g, items: g.items.filter((i) => i.href !== "/dashboard") })).filter((g) => g.items.length);

  const tiles = [
    { label: "Open tasks", value: String(tasks.length), Icon: ListTodo, href: "/tasks", tone: "" },
    { label: "Overdue", value: String(overdue), Icon: CalendarClock, href: "/tasks", tone: overdue ? "text-danger" : "" },
    { label: "Logged this week", value: formatMinutes(minutes), Icon: Clock3, href: "/time-tracker", tone: "" },
    ...(projectsPending.count !== null ? [{ label: "Projects to approve", value: String(projectsPending.count), Icon: FolderCheck, href: "/projects/pending", tone: projectsPending.count ? "text-warn" : "" }] : []),
    ...(pending.count !== null ? [{ label: "Leave to review", value: String(pending.count), Icon: UserCheck, href: "/hr/leave", tone: pending.count ? "text-warn" : "" }] : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">{ROLE_LABEL[user.role]} · {formatDate(today)}</p>
      </div>

      <WelcomeTips />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, Icon, href, tone }) => (
          <Link key={label} href={href} className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-brand">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" aria-hidden /></span>
            <span><span className={`block text-2xl font-semibold tabular-nums ${tone}`}>{value}</span><span className="text-sm text-muted">{label}</span></span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="up-next">
          <div className="mb-3 flex items-center justify-between"><h2 id="up-next" className="text-base font-semibold">Up next</h2><Link href="/tasks" className="text-sm text-brand hover:underline">All tasks</Link></div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow)]">
            {tasks.slice(0, 6).map((t) => {
              const late = !!t.ends_on && t.ends_on < today;
              return (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-raised">
                    <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${late ? "bg-danger" : "bg-accent"}`} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.title}</span><span className="block truncate text-xs text-muted">{(t.projects as { name: string | null } | null)?.name ?? "No project"}</span></span>
                    {t.ends_on ? <Badge tone={late ? "red" : "grey"}>{late ? "Overdue " : ""}{formatDate(t.ends_on)}</Badge> : <span className="text-xs text-muted">No date</span>}
                  </Link>
                </li>);
            })}
            {!tasks.length && <li><EmptyState Icon={ListTodo} title="You are all caught up" hint="Add a task, or paste meeting notes and let EasyD draft several." action={{ label: "New task", href: "/tasks?new=1" }} /></li>}
          </ul>

          <div className="mb-3 mt-8 flex items-center justify-between"><h2 id="recent" className="text-base font-semibold">Recent activity</h2><Link href="/notifications" className="text-sm text-brand hover:underline">See all</Link></div>
          <ul aria-labelledby="recent" className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow)]">
            {(recent ?? []).map((n) => { const Icon = KIND_ICON[n.kind] ?? Bell; return (
              <li key={n.id}>
                <Link href={n.href ?? "/notifications"} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-raised">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1"><span className={`block truncate ${n.read_at ? "" : "font-medium"}`}>{n.title}</span>{n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}</span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(n.created_at)}</span>
                </Link>
              </li>); })}
            {!recent?.length && <li><EmptyState compact title="No activity yet" hint="Assignments, mentions and reminders show up here." /></li>}
          </ul>
        </section>

        <section aria-labelledby="jump">
          <h2 id="jump" className="mb-3 text-base font-semibold">Go to</h2>
          <div className="gap-3 sm:columns-2">
            {groups.map((g) => { const Icon = iconFor(g.label); return (
              <div key={g.label} className="mb-3 break-inside-avoid rounded-xl border border-border bg-card p-4 shadow-[var(--shadow)]">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-brand" aria-hidden />{g.label}</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {g.items.map((i) => <li key={i.href}><Link href={i.href} className="inline-block rounded-md bg-raised px-2.5 py-1 text-xs text-muted transition hover:bg-brand-soft hover:text-brand">{i.label}</Link></li>)}
                </ul>
              </div>); })}
          </div>
        </section>
      </div>
    </div>
  );
}
