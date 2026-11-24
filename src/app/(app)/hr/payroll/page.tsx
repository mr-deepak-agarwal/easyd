import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { MONTH_NAMES, formatDate, todayIST } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { addSalary } from "./actions";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export default async function PayrollPage({ searchParams }: PageProps<"/hr/payroll">) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const today = todayIST();
  const supabase = await createClient();

  // Admin: pick a person and month to see the suggested pay, then record it.
  const emp = /^[0-9a-f-]{36}$/i.test(one(sp.emp)) ? one(sp.emp) : "";
  const month = Number(one(sp.month)) >= 1 && Number(one(sp.month)) <= 12 ? Number(one(sp.month)) : Number(today.slice(5, 7));
  const year = Number(one(sp.year)) >= 2000 && Number(one(sp.year)) <= 2100 ? Number(one(sp.year)) : Number(today.slice(0, 4));
  const [{ data: rows }, { data: people }, suggestion] = await Promise.all([
    supabase.from("salary_entries").select("id, pay_type, pay_date, designation, bank_branch, amount, description, profiles!salary_entries_profile_id_fkey(name)").order("pay_date", { ascending: false }).limit(300),
    isAdmin ? supabase.from("profiles").select("id, name").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    isAdmin && emp ? supabase.rpc("suggested_salary", { p_profile: emp, p_year: year, p_month: month }) : Promise.resolve({ data: null }),
  ]);
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return (
    <div className="space-y-5">
      <PageHeader title="Payroll" description={isAdmin ? "Salary register for the company" : "Your salary register"} />
      {isAdmin && (
        <Card title="Add a payment">
          <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_160px_100px_auto]">
            <Select name="emp" defaultValue={emp} aria-label="Employee for suggestion"><option value="">Employee</option>{people?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            <Select name="month" defaultValue={String(month)} aria-label="Month">{MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
            <Input name="year" defaultValue={String(year)} aria-label="Year" inputMode="numeric" />
            <button className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-raised">Suggest salary</button>
          </form>
          {emp && <p className="mb-4 text-sm text-muted" role="note">{suggestion.data != null ? <>Suggested for {MONTH_NAMES[month - 1]} {year}: <b className="text-foreground">{inr(Number(suggestion.data))}</b> (salary less a day-rate deduction for each day without attendance)</> : "No suggestion: the person logged no time that month, or has no salary on file."}</p>}
          <ActionForm action={addSalary} className="grid gap-4 sm:grid-cols-4" key={`${emp}-${year}-${month}`}>
            <Field label="Employee" htmlFor="profile" className="sm:col-span-2"><Select id="profile" name="profile" defaultValue={emp} required><option value="">Choose</option>{people?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Type" htmlFor="pay_type"><Select id="pay_type" name="pay_type" defaultValue="Salary">{["Salary", "Advance", "Bonus", "Reimbursement", "Other"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Pay date" htmlFor="pay_date"><Input id="pay_date" name="pay_date" type="date" defaultValue={`${year}-${mm}-${String(lastDay).padStart(2, "0")}`} required /></Field>
            <Field label="Amount (Rs)" htmlFor="amount"><Input id="amount" name="amount" inputMode="decimal" defaultValue={suggestion.data != null ? String(suggestion.data) : ""} required /></Field>
            <Field label="Description" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" rows={1} defaultValue="Monthly Salary" maxLength={300} /></Field>
            <div className="flex items-end"><SubmitButton>Save</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
      <Table>
        <thead><tr><Th>Date</Th>{isAdmin && <Th>Employee</Th>}<Th>Type</Th><Th>Designation</Th><Th>Bank</Th><Th className="text-right">Amount</Th><Th>Description</Th></tr></thead>
        <tbody>
          {rows?.length ? rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap">{formatDate(r.pay_date)}</Td>
              {isAdmin && <Td>{(r.profiles as { name: string } | null)?.name ?? "-"}</Td>}
              <Td>{r.pay_type}</Td><Td>{r.designation ?? "-"}</Td><Td>{r.bank_branch ?? "-"}</Td>
              <Td className="text-right tabular-nums">{inr(Number(r.amount))}</Td><Td>{r.description ?? ""}</Td>
            </tr>
          )) : <EmptyRow cols={isAdmin ? 7 : 6} text="No payments recorded yet" />}
        </tbody>
      </Table>
    </div>
  );
}
