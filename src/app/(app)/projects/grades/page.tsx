import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { COSTING_ROLES } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { addGrade, setGradeActive, updateGradeCost } from "../costing-actions";

export default async function GradesPage() {
  await requireRole(COSTING_ROLES);
  const supabase = await createClient();
  const { data: grades } = await supabase.from("costing_grades").select("id, grade, cost, active").order("cost", { ascending: false });
  return (
    <div className="space-y-5">
      <PageHeader title="Grades" description="Hourly cost per grade, used by Cost Analysis" />
      <Card title="Add a grade">
        <ActionForm action={addGrade} className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <Field label="Grade" htmlFor="grade"><Input id="grade" name="grade" required maxLength={100} /></Field>
          <Field label="Cost per hour (Rs)" htmlFor="cost"><Input id="cost" name="cost" inputMode="decimal" required /></Field>
          <SubmitButton>Add</SubmitButton>
        </ActionForm>
      </Card>
      <Table>
        <thead><tr><Th>Grade</Th><Th>Cost per hour (Rs)</Th><Th>Status</Th><Th /></tr></thead>
        <tbody>
          {grades?.length ? grades.map((g) => (
            <tr key={g.id}>
              <Td>{g.grade}</Td>
              <Td>
                <ActionForm action={updateGradeCost.bind(null, g.id)} className="flex items-center gap-2" resetOnSuccess={false}>
                  <Input name="cost" inputMode="decimal" defaultValue={String(g.cost)} className="w-32" aria-label={`Cost for ${g.grade}`} />
                  <SubmitButton variant="secondary">Save</SubmitButton>
                </ActionForm>
              </Td>
              <Td>{g.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
              <Td><form action={setGradeActive.bind(null, g.id, !g.active)}><SubmitButton variant="ghost">{g.active ? "Deactivate" : "Activate"}</SubmitButton></form></Td>
            </tr>
          )) : <EmptyRow cols={4} text="No grades yet" />}
        </tbody>
      </Table>
    </div>
  );
}
