import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { COSTING_ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { setOverhead } from "../costing-actions";

export default async function OverheadsPage() {
  await requireRole(COSTING_ROLES);
  const supabase = await createClient();
  const { data: rows } = await supabase.from("overheads").select("id, cost, created_at, profiles:created_by(name)").order("id", { ascending: false }).limit(50);
  const current = rows?.[0];
  return (
    <div className="space-y-5">
      <PageHeader title="Overheads" description="Overhead cost per hour added on top of the grade costs" />
      <Card title={current ? `Current: Rs ${Number(current.cost).toLocaleString("en-IN")} per hour` : "No overhead set yet"}>
        <ActionForm action={setOverhead} className="grid gap-4 sm:grid-cols-[200px_auto] sm:items-end">
          <Field label="New overhead per hour (Rs)" htmlFor="cost"><Input id="cost" name="cost" inputMode="decimal" required /></Field>
          <SubmitButton>Update</SubmitButton>
        </ActionForm>
      </Card>
      <Table>
        <thead><tr><Th>Date</Th><Th>Overhead per hour (Rs)</Th><Th>Set by</Th></tr></thead>
        <tbody>
          {rows?.length ? rows.map((r) => (
            <tr key={r.id}><Td>{formatDate(r.created_at)}</Td><Td>{Number(r.cost).toLocaleString("en-IN")}</Td><Td>{(r.profiles as { name: string } | null)?.name ?? "-"}</Td></tr>
          )) : <EmptyRow cols={3} text="No history yet" />}
        </tbody>
      </Table>
    </div>
  );
}
