import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { todayIST } from "@/lib/dates";
import { MONTH_NAMES } from "@/lib/dates";
import { eventsByDay, monthGrid, monthKey, parseMonth, shiftMonth, type RangeEvent } from "@/lib/calendar";
import { PageHeader } from "@/components/ui/page-header";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const STYLE = {
  holiday: "bg-danger-soft text-danger", leave: "bg-warn-soft text-warn", meeting: "bg-info-soft text-info",
  project: "bg-brand-soft text-brand", task: "bg-violet-soft text-violet", birthday: "bg-pink-100 text-pink-800",
} as const;
const LEGEND = [["holiday", "Holiday"], ["leave", "On leave"], ["meeting", "Meeting"], ["project", "Project start / deadline"], ["task", "Task due"], ["birthday", "Birthday"]] as const;

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  await requireUser();
  const sp = await searchParams;
  const today = todayIST();
  const { year, month } = parseMonth(one(sp.m), { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
  const first = `${monthKey(year, month)}-01`;
  const last = `${monthKey(year, month)}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;

  const supabase = await createClient();
  const [holidays, leaves, meetings, projects, tasks, birthdays] = await Promise.all([
    supabase.from("holidays").select("holiday_date, description").gte("holiday_date", first).lte("holiday_date", last),
    supabase.rpc("calendar_leaves", { p_from: first, p_to: last }),
    supabase.from("project_meetings").select("project_id, agenda, meeting_at, projects(name)").gte("meeting_at", `${first}T00:00:00+05:30`).lte("meeting_at", `${last}T23:59:59+05:30`),
    supabase.from("projects").select("id, name, start_date, end_date").eq("status", "approved").or(`and(start_date.gte.${first},start_date.lte.${last}),and(end_date.gte.${first},end_date.lte.${last})`),
    supabase.from("tasks").select("id, title, ends_on").eq("status", "created").gte("ends_on", first).lte("ends_on", last),
    supabase.rpc("calendar_birthdays"),
  ]);

  const events: RangeEvent[] = [];
  for (const h of holidays.data ?? []) events.push({ kind: "holiday", label: h.description, from: h.holiday_date, to: h.holiday_date });
  for (const l of leaves.data ?? []) events.push({ kind: "leave", label: `${l.name} (${l.leave_type})`, from: l.leave_from, to: l.leave_to });
  for (const m of meetings.data ?? []) {
    const day = new Date(m.meeting_at ?? "").toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const time = new Date(m.meeting_at ?? "").toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
    events.push({ kind: "meeting", label: `${time} ${m.agenda}${m.projects?.name ? ` - ${m.projects.name}` : ""}`, href: `/projects/${m.project_id}?tab=meetings`, from: day, to: day });
  }
  for (const p of projects.data ?? []) {
    if (p.start_date && p.start_date >= first && p.start_date <= last) events.push({ kind: "project", label: `Starts: ${p.name}`, href: `/projects/${p.id}`, from: p.start_date, to: p.start_date });
    if (p.end_date && p.end_date >= first && p.end_date <= last) events.push({ kind: "project", label: `Deadline: ${p.name}`, href: `/projects/${p.id}`, from: p.end_date, to: p.end_date });
  }
  for (const t of tasks.data ?? []) if (t.ends_on) events.push({ kind: "task", label: `Due: ${t.title}`, href: `/tasks/${t.id}`, from: t.ends_on, to: t.ends_on });
  for (const b of birthdays.data ?? []) {
    if (b.month === month) {
      const day = `${monthKey(year, month)}-${String(b.day).padStart(2, "0")}`;
      if (day <= last) events.push({ kind: "birthday", label: `${b.name}'s birthday`, from: day, to: day });
    }
  }

  const byDay = eventsByDay(year, month, events);
  const prev = shiftMonth(year, month, -1), next = shiftMonth(year, month, 1);
  const grid = monthGrid(year, month);

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar" description={`${MONTH_NAMES[month - 1]} ${year}`}>
        <Link href={`/calendar?m=${monthKey(prev.year, prev.month)}`} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-raised">Previous</Link>
        <Link href="/calendar" className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-raised">Today</Link>
        <Link href={`/calendar?m=${monthKey(next.year, next.month)}`} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-raised">Next</Link>
      </PageHeader>
      <ul className="flex flex-wrap gap-2 text-xs">
        {LEGEND.map(([k, label]) => <li key={k} className={`rounded-full px-2.5 py-0.5 ${STYLE[k]}`}>{label}</li>)}
      </ul>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] table-fixed border-collapse text-sm">
          <thead><tr className="bg-raised text-xs text-muted">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <th key={d} className="px-2 py-2 text-left font-medium">{d}</th>)}
          </tr></thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i} className="align-top">
                {row.map((day, j) => (
                  <td key={j} className={`h-28 border-t border-l border-border p-1 ${day === today ? "bg-brand-soft/40" : ""}`}>
                    {day && (
                      <>
                        <div className={`mb-1 text-xs ${day === today ? "font-bold text-brand" : "text-muted"}`}>{Number(day.slice(8))}</div>
                        <ul className="space-y-0.5">
                          {(byDay.get(day) ?? []).map((e, k) => (
                            <li key={k} className={`truncate rounded px-1 py-0.5 text-[11px] ${STYLE[e.kind]}`} title={e.label}>
                              {e.href ? <Link href={e.href}>{e.label}</Link> : e.label}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
