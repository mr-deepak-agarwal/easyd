import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { createProject } from "../actions";

export default async function NewProjectPage() {
  await requireRole(MGMT_ROLES);
  const supabase = await createClient();
  const [{ data: clients }, { data: departments }, { data: subs }] = await Promise.all([
    supabase.from("clients").select("id, firm_name").eq("active", true).order("firm_name").limit(1000),
    supabase.from("departments").select("id, name").eq("active", true).order("name"),
    supabase.from("sub_departments").select("id, name, department_id").eq("active", true).order("name"),
  ]);
  const deptName = new Map((departments ?? []).map((d) => [d.id, d.name]));
  return (
    <div className="space-y-5">
      <PageHeader title="New project" description="Opens a pending project. Admin or teamlead2 approves it before work starts." />
      <Card>
        <ActionForm action={createProject} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
          <Field label="Client" htmlFor="client_id">
            <Select id="client_id" name="client_id" required defaultValue="">
              <option value="" disabled>Choose a client</option>
              {clients?.map((c) => <option key={c.id} value={c.id}>{c.firm_name}</option>)}
            </Select>
          </Field>
          <Field label="Project name" htmlFor="name"><Input id="name" name="name" required maxLength={200} /></Field>
          <Field label="Department" htmlFor="department_id">
            <Select id="department_id" name="department_id" required defaultValue="">
              <option value="" disabled>Choose</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Sub-department (optional)" htmlFor="sub_department_id">
            <Select id="sub_department_id" name="sub_department_id" defaultValue="">
              <option value="">-</option>
              {subs?.map((s) => <option key={s.id} value={s.id}>{deptName.get(s.department_id)} - {s.name}</option>)}
            </Select>
          </Field>
          <Field label="Project type" htmlFor="project_type">
            <Select id="project_type" name="project_type" defaultValue="one time">
              <option value="one time">One time</option><option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
            </Select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="recurring" /> Recurring project</label>
          <Field label="Description" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" maxLength={2000} /></Field>
          <Field label="Proposal document (optional, up to 4 MB)" htmlFor="proposal"><Input id="proposal" name="proposal" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" /></Field>
          <Field label="Proposal description" htmlFor="proposal_description"><Input id="proposal_description" name="proposal_description" maxLength={500} /></Field>
          <div className="sm:col-span-2"><SubmitButton>Create project</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
