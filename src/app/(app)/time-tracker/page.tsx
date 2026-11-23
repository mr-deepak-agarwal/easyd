import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { TIME_VIEWERS } from "@/lib/roles";
import { MONTH_NAMES, daysInMonth, formatDate, todayIST } from "@/lib/dates";
import { formatMinutes } from "@/lib/time";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select } from "@/components/ui/fields";
import { Badge } from "@/components/ui/badge";
import { TimeFields } from "./time-fields";
import { addEntry, deleteEntry } from "./actions";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TimeTrackerPage({ searchParams }: PageProps<"/time-tracker">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayIST();
  const ym = /^\d{4}-\d{2}$/.test(one(sp.month)) ? one(sp.month) : today.slice(0, 7);
  const [year, month] = ym.split("-").map(Number);
  const canSeeAll = TIME_VIEWERS.includes(user.role);
  const who = canSeeAll && /^[0-9a-f-]{36}$/i.test(one(sp.who)) ? one(sp.who) : canSeeAll && one(sp.who) === "all" ? "all" : user.id;

  const supabase = await createClient();
  let q = supabase.from("time_entries")
    .select("id, profile_id, entry_date, minutes, work_accomplished, non_chargeable_category, project_id, projects(name, clients(firm_name)), profiles!time_entries_profile_id_fkey(name)")
    .gte("entry_date", `${ym}-01`).lte("entry_date", `${ym}-${String(daysInMonth(year, month)).padStart(2, "0")}`)
    .order("entry_date", { ascending: false }).order("id", { ascending: false }).limit(500);
  if (who !== "all") q = q.eq("profile_id", who);
  const [{ data: rows }, { data: projects }, { data: people }, { data: pending }, { data: mineRows }] = await Promise.all([
    q,
    supabase.from("projects").select("id, name, clients(firm_name)").eq("status", "approved").order("name").limit(500),
    canSeeAll ? supabase.from("profiles").select("id, name").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    supabase.from("time_entry_edits").select("time_entry_id"),
    supabase.from("project_team").select("project_id").eq("member_id", user.id),
  ]);
  const mine = new Set((mineRows ?? []).map((m) => m.project_id));
  const pend = new Set((pending ?? []).map((p) => p.time_entry_id));
  const total = (rows ?? []).reduce((s, r) => s + r.minutes, 0);
  const chargeable = (rows ?? []).filter((r) => !r.non_chargeable_category).reduce((s, r) => s + r.minutes, 0);
  const opts = (projects ?? []).map((p) => ({ id: p.id, label: `${(p.clients as { firm_name: string | null } | null)?.firm_name ?? "-"} - ${p.name ?? p.id}`, mine: mine.has(p.id) }));
  const months = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - i, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; });
  if (!months.includes(ym)) months.push(ym);

  return (
    <div className="space-y-5">
      <PageHeader title="Time Tracker" description="Log what you worked on each day">
        <Link href="/time-tracker/approvals" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">{user.role === "admin" ? "Approve edited entries" : "My edit requests"}</Link>
      </PageHeader>
      <Card title="Add time">
        <ActionForm action={addEntry} className="space-y-4">
          <TimeFields defaults={{ entry_date: today, kind: "chargeable", project_id: "", category: "", work: "", hours: "", minutes: "" }} projects={opts} />
          <SubmitButton>Add entry</SubmitButton>
        </ActionForm>
      </Card>
      <form className="flex flex-wrap items-end gap-2">
        <Select name="month" defaultValue={ym} aria-label="Month" className="w-44">{months.map((m) => <option key={m} value={m}>{MONTH_NAMES[Number(m.slice(5)) - 1]} {m.slice(0, 4)}</option>)}</Select>
        {canSeeAll && (
          <Select name="who" defaultValue={who} aria-label="Person" className="w-56">
            <option value="all">Everyone</option>
            {people?.map((p) => <option key={p.id} value={p.id}>{p.id === user.id ? `${p.name} (me)` : p.name}</option>)}
          </Select>
        )}
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Show</button>
        <span className="ml-auto text-sm text-muted">Total <b className="text-foreground">{formatMinutes(total)}</b> · chargeable {formatMinutes(chargeable)}</span>
      </form>
      <Table>
        <thead><tr><Th>Date</Th>{who === "all" && <Th>Person</Th>}<Th>Client / project</Th><Th>Work accomplished</Th><Th>Time</Th><Th /></tr></thead>
        <tbody>
          {rows?.length ? rows.map((r) => {
            const p = r.projects as { name: string | null; clients: { firm_name: string | null } | null } | null;
            const mine = r.profile_id === user.id;
            return (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{formatDate(r.entry_date)}</Td>
                {who === "all" && <Td>{(r.profiles as { name: string } | null)?.name ?? "-"}</Td>}
                <Td>{p ? `${p.clients?.firm_name ?? "-"} - ${p.name}` : r.non_chargeable_category ? <span className="text-muted">{r.non_chargeable_category}</span> : "-"}</Td>
                <Td className="max-w-md whitespace-pre-line">{r.work_accomplished}</Td>
                <Td className="whitespace-nowrap">{formatMinutes(r.minutes)}</Td>
                <Td className="whitespace-nowrap">
                  {pend.has(r.id) && <Badge tone="amber">Edit pending</Badge>}
                  {(mine) && !pend.has(r.id) && <Link href={`/time-tracker/${r.id}/edit`} className="mr-3 text-sm text-brand hover:underline">Edit</Link>}
                  {(mine || user.role === "admin") && (
                    <ActionForm action={deleteEntry.bind(null, r.id)} className="inline" resetOnSuccess={false}><SubmitButton variant="ghost" confirm="Delete this entry?" className="!px-2 !py-1 text-danger">Delete</SubmitButton></ActionForm>
                  )}
                </Td>
              </tr>
            );
          }) : <EmptyRow cols={who === "all" ? 6 : 5} text="No entries for this month" />}
        </tbody>
      </Table>
      {rows?.length === 500 && <p className="text-xs text-muted">Showing the latest 500 entries. Pick a person to narrow it down.</p>}
    </div>
  );
}
