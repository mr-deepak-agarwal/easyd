import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate, todayIST } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { addIncentive } from "./actions";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export default async function IncentivesPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const supabase = await createClient();
  const [{ data: rows }, { data: people }] = await Promise.all([
    supabase.from("incentives").select("id, incentive_date, reason, amount, profiles!incentives_profile_id_fkey(name)").order("incentive_date", { ascending: false }).limit(300),
    isAdmin ? supabase.from("profiles").select("id, name").eq("active", true).order("name") : Promise.resolve({ data: [] }),
  ]);
  const total = (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div className="space-y-5">
      <PageHeader title="Incentives" description={isAdmin ? "Incentives given to employees" : "Your incentives"} />
      {isAdmin && (
        <Card title="Add an incentive">
          <ActionForm action={addIncentive} className="grid gap-4 sm:grid-cols-5 sm:items-end">
            <Field label="Employee" htmlFor="profile"><Select id="profile" name="profile" required><option value="">Choose</option>{people?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Date" htmlFor="incentive_date"><Input id="incentive_date" name="incentive_date" type="date" defaultValue={todayIST()} required /></Field>
            <Field label="Reason" htmlFor="reason" className="sm:col-span-2"><Input id="reason" name="reason" maxLength={300} required /></Field>
            <Field label="Amount (Rs)" htmlFor="amount"><Input id="amount" name="amount" inputMode="decimal" required /></Field>
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
        </Card>
      )}
      <Table>
        <thead><tr><Th>Date</Th>{isAdmin && <Th>Employee</Th>}<Th>Reason</Th><Th className="text-right">Amount</Th></tr></thead>
        <tbody>
          {rows?.length ? <>
            {rows.map((r) => <tr key={r.id}><Td className="whitespace-nowrap">{formatDate(r.incentive_date)}</Td>{isAdmin && <Td>{(r.profiles as { name: string } | null)?.name ?? "-"}</Td>}<Td>{r.reason}</Td><Td className="text-right tabular-nums">{inr(Number(r.amount))}</Td></tr>)}
            <tr className="bg-background font-medium"><Td colSpan={isAdmin ? 3 : 2}>Total</Td><Td className="text-right tabular-nums">{inr(total)}</Td></tr>
          </> : <EmptyRow cols={isAdmin ? 4 : 3} text="No incentives yet" />}
        </tbody>
      </Table>
    </div>
  );
}
