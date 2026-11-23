import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { LEAD_DECIDERS, MGMT_ROLES, COSTING_ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { approveLead, rejectLead, updateLead } from "../../actions";
import { LeadFields } from "../../lead-fields";
import { LEAD_TONE } from "../../lead-tone";
import { FollowupForm } from "../../followup-form";
import { FollowupList, type FollowupRow } from "../../followup-list";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default async function LeadPage({ params }: PageProps<"/crm/leads/[id]">) {
  const user = await requireRole(MGMT_ROLES);
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) notFound();
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*, clients(id, firm_name)").eq("id", leadId).maybeSingle();
  if (!lead) notFound();

  const [{ data: costing }, { data: followups }, { data: people }, { data: departments }] = await Promise.all([
    supabase.from("project_costing").select("id, grade_label, grade, num_employees, total_hours, overheads, multiply_factor, total_cost, active, added_at")
      .eq("lead_id", leadId).order("id"),
    supabase.from("followups")
      .select("id, reason, reply, description, next_followup_on, file_path, file_description, entered_at, profiles:entered_by(name)")
      .eq("lead_id", leadId).order("entered_at", { ascending: false }),
    supabase.from("profiles").select("id, name").eq("active", true).order("name"),
    supabase.from("departments").select("id, name").eq("active", true).order("name"),
  ]);
  const activeCost = (costing ?? []).filter((c) => c.active);
  const pending = lead.status === "pending";
  const canDecide = LEAD_DECIDERS.includes(user.role) && pending;
  const client = lead.clients;

  return (
    <div className="space-y-5">
      <PageHeader title={lead.name} description={client?.firm_name ?? undefined}>
        <Badge tone={LEAD_TONE[lead.status as keyof typeof LEAD_TONE] ?? "grey"}>{lead.status}</Badge>
        {client && <Link href={`/crm/clients/${client.id}`} className="text-sm text-brand hover:underline">Client</Link>}
      </PageHeader>

      {lead.status === "rejected" && (
        <Card title="Rejected"><p className="text-sm">{lead.reject_reason}</p></Card>
      )}
      {lead.status === "approved" && lead.approved_project_id && (
        <Card title="Approved"><p className="text-sm">A project was created from this lead (project #{lead.approved_project_id}).</p></Card>
      )}

      <Card title="Lead details">
        <ActionForm action={updateLead.bind(null, leadId)} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
          <LeadFields people={people ?? []} d={lead} />
          {pending && <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>}
        </ActionForm>
      </Card>

      {canDecide && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Approve and create project">
            <ActionForm action={approveLead.bind(null, leadId)} className="grid gap-4" resetOnSuccess={false}>
              <Field label="Project name" htmlFor="project_name"><Input id="project_name" name="project_name" required defaultValue={lead.name} /></Field>
              <Field label="Department" htmlFor="department_id">
                <Select id="department_id" name="department_id" required defaultValue="">
                  <option value="" disabled>Choose</option>
                  {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
              <Field label="Project type" htmlFor="project_type">
                <Select id="project_type" name="project_type" defaultValue="one time">
                  <option value="one time">One time</option><option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                </Select>
              </Field>
              <div><SubmitButton confirm="Approve this lead and create the project?">Approve</SubmitButton></div>
            </ActionForm>
          </Card>
          <Card title="Reject">
            <ActionForm action={rejectLead.bind(null, leadId)} className="grid gap-4" resetOnSuccess={false}>
              <Field label="Reason" htmlFor="reason"><Textarea id="reason" name="reason" required maxLength={1000} /></Field>
              <div><SubmitButton variant="danger" confirm="Reject this lead?">Reject</SubmitButton></div>
            </ActionForm>
          </Card>
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Costing</h2>
          {COSTING_ROLES.includes(user.role) && pending && (
            <Link href={`/projects/cost-analysis?lead=${leadId}`} className="text-sm text-brand hover:underline">Open cost analysis</Link>
          )}
        </div>
        <Table>
          <thead><tr><Th>Grade</Th><Th>Rate</Th><Th>People</Th><Th>Hours</Th><Th>Date</Th></tr></thead>
          <tbody>
            {activeCost.length ? activeCost.map((c) => (
              <tr key={c.id}><Td>{c.grade_label}</Td><Td>{inr(Number(c.grade))}</Td><Td>{c.num_employees}</Td><Td>{c.total_hours}</Td><Td>{formatDate(c.added_at)}</Td></tr>
            )) : <EmptyRow cols={5} text="No costing yet" />}
            {activeCost.length > 0 && (
              <tr className="bg-background font-medium">
                <Td colSpan={5}>Overhead hours {activeCost[0].overheads} · factor x{activeCost[0].multiply_factor} · <span className="text-brand">Quoted total {inr(Number(activeCost[0].total_cost))}</span></Td>
              </tr>
            )}
          </tbody>
        </Table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Follow-ups</h2>
        <FollowupList rows={(followups ?? []) as unknown as FollowupRow[]} />
        {lead.client_id && (
          <details className="mt-2 rounded-xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium text-brand">Add a follow-up</summary>
            <div className="mt-3"><FollowupForm target={{ clientId: lead.client_id, leadId }} /></div>
          </details>
        )}
      </section>
    </div>
  );
}
