import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { addContact, addLead, deleteContact, setClientActive, updateClient } from "../../actions";
import { LeadFields } from "../../lead-fields";
import { LEAD_TONE } from "../../lead-tone";
import { FollowupForm } from "../../followup-form";
import { FollowupList, type FollowupRow } from "../../followup-list";

export default async function ClientPage({ params }: PageProps<"/crm/clients/[id]">) {
  await requireRole(MGMT_ROLES);
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) notFound();
  const supabase = await createClient();
  const [{ data: client }, { data: contacts }, { data: leads }, { data: followups }, { data: people }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("client_contacts").select("*").eq("client_id", clientId).order("id"),
    supabase.from("leads").select("id, name, service, status, entered_at").eq("client_id", clientId).order("id", { ascending: false }),
    supabase.from("followups")
      .select("id, reason, reply, description, next_followup_on, file_path, file_description, entered_at, profiles:entered_by(name)")
      .eq("client_id", clientId).order("entered_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, name").eq("active", true).order("name"),
  ]);
  if (!client) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title={client.firm_name ?? "Client"} description={client.sector ?? undefined}>
        {!client.active && <Badge tone="grey">Inactive</Badge>}
        {client.priority > 0 && <Badge tone="amber">Priority</Badge>}
        <form action={setClientActive.bind(null, clientId, !client.active)}>
          <SubmitButton variant="secondary" confirm={client.active ? "Mark this client inactive?" : "Mark this client active?"}>
            {client.active ? "Mark inactive" : "Mark active"}
          </SubmitButton>
        </form>
        <Link href="/crm/clients" className="text-sm text-brand hover:underline">All clients</Link>
      </PageHeader>

      <Card title="Client details">
        <ActionForm action={updateClient.bind(null, clientId)} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
          <Field label="Firm name" htmlFor="firm_name"><Input id="firm_name" name="firm_name" required defaultValue={client.firm_name ?? ""} /></Field>
          <Field label="Sector" htmlFor="sector"><Input id="sector" name="sector" defaultValue={client.sector ?? ""} /></Field>
          <Field label="Designation" htmlFor="designation"><Input id="designation" name="designation" defaultValue={client.designation ?? ""} /></Field>
          <Field label="Email" htmlFor="email"><Input id="email" name="email" defaultValue={client.email ?? ""} /></Field>
          <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" defaultValue={client.phone ?? ""} /></Field>
          <Field label="Priority client" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue={client.priority > 0 ? "1" : "0"}><option value="0">No</option><option value="1">Yes</option></Select>
          </Field>
          <Field label="Address" htmlFor="address" className="sm:col-span-2"><Textarea id="address" name="address" defaultValue={client.address ?? ""} /></Field>
          <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
        </ActionForm>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Contacts</h2>
        <Table>
          <thead><tr><Th>Name</Th><Th>Designation</Th><Th>Email</Th><Th>Phone</Th><Th /></tr></thead>
          <tbody>
            {contacts?.length ? contacts.map((c) => (
              <tr key={c.id}>
                <Td>{c.name}</Td><Td>{c.designation ?? "-"}</Td><Td>{c.email ?? "-"}</Td><Td>{c.phone ?? "-"}</Td>
                <Td><form action={deleteContact.bind(null, clientId, c.id)}><SubmitButton variant="ghost" confirm="Delete this contact?">Delete</SubmitButton></form></Td>
              </tr>
            )) : <EmptyRow cols={5} text="No contacts yet" />}
          </tbody>
        </Table>
        <details className="mt-2 rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand">Add a contact</summary>
          <ActionForm action={addContact.bind(null, clientId)} className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="c_name"><Input id="c_name" name="name" required maxLength={200} /></Field>
            <Field label="Designation" htmlFor="c_designation"><Input id="c_designation" name="designation" maxLength={200} /></Field>
            <Field label="Email" htmlFor="c_email"><Input id="c_email" name="email" type="email" maxLength={200} /></Field>
            <Field label="Phone" htmlFor="c_phone"><Input id="c_phone" name="phone" maxLength={50} /></Field>
            <div className="sm:col-span-2"><SubmitButton>Add contact</SubmitButton></div>
          </ActionForm>
        </details>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Leads</h2>
        <Table>
          <thead><tr><Th>Lead</Th><Th>Service</Th><Th>Entered</Th><Th>Status</Th></tr></thead>
          <tbody>
            {leads?.length ? leads.map((l) => (
              <tr key={l.id}>
                <Td><Link href={`/crm/leads/${l.id}`} className="font-medium text-brand hover:underline">{l.name}</Link></Td>
                <Td>{l.service ?? "-"}</Td><Td>{formatDate(l.entered_at)}</Td>
                <Td><Badge tone={LEAD_TONE[l.status as keyof typeof LEAD_TONE] ?? "grey"}>{l.status}</Badge></Td>
              </tr>
            )) : <EmptyRow cols={4} text="No leads yet" />}
          </tbody>
        </Table>
        <details className="mt-2 rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand">Add a lead</summary>
          <ActionForm action={addLead.bind(null, clientId)} className="mt-3 grid gap-4 sm:grid-cols-2">
            <LeadFields people={people ?? []} />
            <div className="sm:col-span-2"><SubmitButton>Add lead</SubmitButton></div>
          </ActionForm>
        </details>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Follow-ups</h2>
        <FollowupList rows={(followups ?? []) as unknown as FollowupRow[]} />
        <details className="mt-2 rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand">Add a follow-up</summary>
          <div className="mt-3"><FollowupForm target={{ clientId }} /></div>
        </details>
      </section>
    </div>
  );
}
