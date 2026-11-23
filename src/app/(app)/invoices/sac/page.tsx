import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { addSac, toggleSac } from "../actions";

export default async function SacPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: rows } = await supabase.from("sac_codes").select("id, sac, description, active").order("sac");
  return (
    <div className="space-y-5">
      <PageHeader title="SAC codes" description="Service codes offered when writing an invoice" />
      <Card title="Add a code">
        <ActionForm action={addSac} className="grid gap-4 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <Field label="SAC" htmlFor="sac"><Input id="sac" name="sac" inputMode="numeric" maxLength={8} required /></Field>
          <Field label="Description" htmlFor="description"><Input id="description" name="description" maxLength={300} required /></Field>
          <SubmitButton>Add</SubmitButton>
        </ActionForm>
      </Card>
      <Table>
        <thead><tr><Th>SAC</Th><Th>Description</Th><Th>Status</Th><Th /></tr></thead>
        <tbody>
          {rows?.length ? rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.sac}</Td><Td>{r.description}</Td>
              <Td>{r.active ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Hidden</Badge>}</Td>
              <Td><ActionForm action={toggleSac.bind(null, r.id, !r.active)} resetOnSuccess={false}><SubmitButton variant="secondary">{r.active ? "Hide" : "Show"}</SubmitButton></ActionForm></Td>
            </tr>
          )) : <EmptyRow cols={4} text="No SAC codes yet" />}
        </tbody>
      </Table>
    </div>
  );
}
