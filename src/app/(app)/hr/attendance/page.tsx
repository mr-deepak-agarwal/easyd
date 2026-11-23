import Link from "next/link";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { daysInMonth, MONTH_NAMES, todayIST } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { uploadAttendance } from "./actions";

export default async function AttendancePage({ searchParams }: PageProps<"/hr/attendance">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayIST();
  const pick = (k: string) => Number(Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);
  const year = pick("year") >= 2000 && pick("year") <= 2100 ? pick("year") : Number(today.slice(0, 4));
  const month = pick("month") >= 1 && pick("month") <= 12 ? pick("month") : Number(today.slice(5, 7));
  const days = daysInMonth(year, month);
  const mm = String(month).padStart(2, "0");

  const supabase = await createClient();
  const [{ data: records }, { data: people }] = await Promise.all([
    supabase.from("attendance").select("profile_id, work_date, status")
      .gte("work_date", `${year}-${mm}-01`).lte("work_date", `${year}-${mm}-${String(days).padStart(2, "0")}`),
    supabase.from("profiles").select("id, name").order("name"),
  ]);

  // RLS already limits employees to their own rows; the register lists only people with records.
  const grid = new Map<string, Map<number, string>>();
  for (const r of records ?? []) {
    const day = Number(r.work_date.slice(8, 10));
    if (!grid.has(r.profile_id)) grid.set(r.profile_id, new Map());
    grid.get(r.profile_id)!.set(day, r.status ?? "");
  }
  const rows = (people ?? []).filter((p) => grid.has(p.id));
  const isAdmin = user.role === "admin";
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" description={`${MONTH_NAMES[month - 1]} ${year}`}>
        <Link href={`/hr/attendance?year=${prev.year}&month=${prev.month}`} className="rounded-md border border-border bg-white px-3 py-1.5 text-sm hover:bg-background">Previous</Link>
        <Link href={`/hr/attendance?year=${next.year}&month=${next.month}`} className="rounded-md border border-border bg-white px-3 py-1.5 text-sm hover:bg-background">Next</Link>
      </PageHeader>

      {isAdmin && (
        <Card title="Upload a month's attendance">
          <ActionForm action={uploadAttendance} className="grid gap-4 sm:grid-cols-[140px_110px_1fr_auto] sm:items-end">
            <Field label="Month" htmlFor="month">
              <Select id="month" name="month" defaultValue={String(month)}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Year" htmlFor="year"><Input id="year" name="year" type="number" min={2000} max={2100} defaultValue={year} /></Field>
            <Field label="CSV file" htmlFor="sheet" hint="Row 1 is a header. Column 1 is the employee name, then one column per day (1, 2, 3 ...).">
              <Input id="sheet" name="sheet" type="file" accept=".csv" required />
            </Field>
            <SubmitButton>Upload</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-40 border-b border-r border-border bg-background px-3 py-2 text-left font-semibold uppercase tracking-wide text-muted">Employee</th>
              {Array.from({ length: days }, (_, i) => (
                <th key={i} className="min-w-8 border-b border-border bg-background px-1 py-2 text-center font-semibold text-muted">{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((p) => (
              <tr key={p.id}>
                <td className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-1.5 font-medium">{p.name}</td>
                {Array.from({ length: days }, (_, i) => {
                  const s = grid.get(p.id)?.get(i + 1) ?? "";
                  return <td key={i} className={`border-b border-border px-1 py-1.5 text-center ${/^a/i.test(s) ? "bg-red-50 text-danger" : ""}`}>{s}</td>;
                })}
              </tr>
            )) : (
              <tr><td colSpan={days + 1} className="px-3 py-8 text-center text-sm text-muted">No attendance recorded for this month</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
