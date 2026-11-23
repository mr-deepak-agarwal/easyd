import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { createCycle } from "../actions";

export default async function CyclesPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: cycles } = await supabase.from("appraisal_cycles").select("id, name, period_from, period_to, status, published_at").order("id", { ascending: false });
  return (
    <div className="space-y-5">
      <PageHeader title="Appraisal cycles" description="Freeze scores for a period, rate each employee, publish">
        <Link href="/hr/appraisal" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">Live scores</Link>
      </PageHeader>
      <Card title="Start a cycle">
        <ActionForm action={createCycle} className="grid gap-4 sm:grid-cols-[1fr_170px_170px_auto] sm:items-end">
          <Field label="Name" htmlFor="name"><Input id="name" name="name" placeholder="Apr to Sep 2026" maxLength={100} required /></Field>
          <Field label="From" htmlFor="from"><Input id="from" name="from" type="date" required /></Field>
          <Field label="To" htmlFor="to"><Input id="to" name="to" type="date" required /></Field>
          <SubmitButton>Create</SubmitButton>
        </ActionForm>
      </Card>
      <Table>
        <thead><tr><Th>Cycle</Th><Th>Period</Th><Th>Status</Th></tr></thead>
        <tbody>
          {cycles?.length ? cycles.map((c) => (
            <tr key={c.id}>
              <Td><Link href={`/hr/appraisal/cycles/${c.id}`} className="font-medium text-brand hover:underline">{c.name}</Link></Td>
              <Td>{formatDate(c.period_from)} to {formatDate(c.period_to)}</Td>
              <Td>{c.published_at ? <Badge tone="green">Published</Badge> : c.status === "closed" ? <Badge tone="amber">Closed, not published</Badge> : <Badge tone="grey">Open</Badge>}</Td>
            </tr>)) : <EmptyRow cols={3} text="No cycles yet" />}
        </tbody>
      </Table>
    </div>
  );
}
