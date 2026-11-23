import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { addClientLead } from "../actions";
import { LeadFields } from "../lead-fields";

const FILTERS = [["active", "Active"], ["priority", "Priority"], ["inactive", "Inactive"]] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ClientsPage({ searchParams }: PageProps<"/crm/clients">) {
  await requireRole(MGMT_ROLES);
  const sp = await searchParams;
  const filter = FILTERS.some(([k]) => k === one(sp.show)) ? one(sp.show) : "active";
  const q = one(sp.q).trim();
  const supabase = await createClient();

  let query = supabase.from("clients").select("id, firm_name, sector, phone, email, priority, active, leads(count)").order("firm_name").limit(500);
  if (filter === "inactive") query = query.eq("active", false);
  else query = query.eq("active", true);
  if (filter === "priority") query = query.gt("priority", 0);
  if (q) query = query.ilike("firm_name", `%${q.replace(/[%_\\,()]/g, " ")}%`);
  const [{ data: clients }, { data: people }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Clients" description="Firms, their contacts, leads and follow-ups">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/crm/clients?show=${k}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${k === filter ? "border-brand bg-brand text-white" : "border-border bg-white hover:bg-background"}`}>{label}</Link>
        ))}
      </PageHeader>

      <details className="rounded-xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted">New enquiry (client + lead)</summary>
        <p className="mt-2 text-sm text-muted">If a client with the same firm name already exists, the lead and contact are added to it.</p>
        <ActionForm action={addClientLead} className="mt-4 grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
          <Field label="Firm name" htmlFor="firm_name"><Input id="firm_name" name="firm_name" required maxLength={200} /></Field>
          <Field label="Sector" htmlFor="sector"><Input id="sector" name="sector" maxLength={200} /></Field>
          <Field label="Contact person" htmlFor="contact_name"><Input id="contact_name" name="contact_name" required maxLength={200} /></Field>
          <Field label="Designation" htmlFor="designation"><Input id="designation" name="designation" maxLength={200} /></Field>
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" maxLength={200} /></Field>
          <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" maxLength={50} /></Field>
          <Field label="Address" htmlFor="address" className="sm:col-span-2"><Textarea id="address" name="address" maxLength={1000} /></Field>
          <Field label="Priority client" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue="0"><option value="0">No</option><option value="1">Yes</option></Select>
          </Field>
          <div className="hidden sm:block" />
          <LeadFields people={people ?? []} nameField="lead_name" />
          <div className="sm:col-span-2"><SubmitButton>Save enquiry</SubmitButton></div>
        </ActionForm>
      </details>

      <form className="flex gap-2">
        <input type="hidden" name="show" value={filter} />
        <Input name="q" defaultValue={q} placeholder="Search by firm name" className="max-w-sm" aria-label="Search by firm name" />
        <SubmitButton variant="secondary">Search</SubmitButton>
      </form>

      <Table>
        <thead><tr><Th>Firm</Th><Th>Sector</Th><Th>Phone</Th><Th>Email</Th><Th>Leads</Th><Th /></tr></thead>
        <tbody>
          {clients?.length ? clients.map((c) => (
            <tr key={c.id}>
              <Td><Link href={`/crm/clients/${c.id}`} className="font-medium text-brand hover:underline">{c.firm_name}</Link>{" "}
                {c.priority > 0 && <Badge tone="amber">Priority</Badge>}</Td>
              <Td>{c.sector ?? "-"}</Td><Td>{c.phone ?? "-"}</Td><Td>{c.email ?? "-"}</Td>
              <Td>{c.leads?.[0]?.count ?? 0}</Td>
              <Td><Link href={`/crm/clients/${c.id}`} className="text-brand hover:underline">Open</Link></Td>
            </tr>
          )) : <EmptyRow cols={6} text="No clients found" />}
        </tbody>
      </Table>
    </div>
  );
}
