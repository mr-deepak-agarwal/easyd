import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { INVOICE_VIEWERS, INVOICE_EDITORS } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { ENTITIES, computeInvoice, money, type Entity, type InvoiceType } from "@/lib/invoice";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/fields";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const TYPE_LABEL = { Proforma: "Proforma", Taxable: "Tax invoice", Export: "Export" } as const;

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const user = await requireRole(INVOICE_VIEWERS);
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80), type = one(sp.type), entity = one(sp.entity), status = one(sp.status);
  const canEdit = INVOICE_EDITORS.includes(user.role);
  const supabase = await createClient();
  let query = supabase.from("invoices")
    .select("id, invoice_no, invoice_type, invoice_by, invoice_date, recipient_name, delivery_state_code, advance, ope, currency_type, confirmed, converted, projects(id, name), invoice_lines(taxable_value)")
    .is("deleted_at", null).order("invoice_date", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).limit(300);
  if (q) query = query.or(`invoice_no.ilike.%${q.replace(/[%,()]/g, "")}%,recipient_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (["Proforma", "Taxable", "Export"].includes(type)) query = query.eq("invoice_type", type);
  if (entity in ENTITIES) query = query.eq("invoice_by", entity);
  if (status === "paid") query = query.eq("confirmed", true);
  if (status === "unpaid") query = query.eq("confirmed", false);
  const [{ data: rows }, { data: projects }] = await Promise.all([
    query,
    canEdit ? supabase.from("projects").select("id, name").eq("status", "approved").order("name").limit(500) : Promise.resolve({ data: [] }),
  ]);
  return (
    <div className="space-y-5">
      <PageHeader title="Invoices" description="Proforma, tax and export invoices for all projects">
        {user.role === "admin" && <Link href="/invoices/sac" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">SAC codes</Link>}
      </PageHeader>
      {canEdit && (
        <form action="/invoices/new" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
          <span className="text-sm font-medium">Create an invoice for</span>
          <Select name="project" required aria-label="Project" className="max-w-xs">
            <option value="">Choose an open project</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">New invoice</button>
        </form>
      )}
      <form className="grid gap-2 sm:grid-cols-[1fr_150px_190px_130px_auto]">
        <Input name="q" defaultValue={q} placeholder="Search number or recipient" aria-label="Search" />
        <Select name="type" defaultValue={type} aria-label="Type"><option value="">All types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="entity" defaultValue={entity} aria-label="Billed by"><option value="">All entities</option>{Object.values(ENTITIES).map((e) => <option key={e.code} value={e.code}>{e.label}</option>)}</Select>
        <Select name="status" defaultValue={status} aria-label="Payment"><option value="">Any payment</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></Select>
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Filter</button>
      </form>
      <Table>
        <thead><tr><Th>Invoice no.</Th><Th>Type</Th><Th>Date</Th><Th>Recipient</Th><Th>Project</Th><Th className="text-right">Total</Th><Th>Status</Th></tr></thead>
        <tbody>
          {rows?.length ? rows.map((r) => {
            const t = computeInvoice({ type: r.invoice_type as InvoiceType, entity: r.invoice_by as Entity, lines: r.invoice_lines, advance: r.advance, ope: r.ope, deliveryStateCode: r.delivery_state_code });
            const p = r.projects as { id: number; name: string | null } | null;
            return (
              <tr key={r.id}>
                <Td><Link href={`/invoices/${r.id}`} className="font-medium text-brand hover:underline">{r.invoice_no}</Link></Td>
                <Td>{TYPE_LABEL[r.invoice_type as InvoiceType]}</Td>
                <Td>{formatDate(r.invoice_date)}</Td>
                <Td>{r.recipient_name ?? "-"}</Td>
                <Td>{p ? <Link href={`/projects/${p.id}?tab=invoices`} className="hover:underline">{p.name}</Link> : "-"}</Td>
                <Td className="text-right tabular-nums">{money(t.total, r.currency_type)}</Td>
                <Td>{r.confirmed ? <Badge tone="green">Paid</Badge> : r.converted ? <Badge tone="grey">Converted</Badge> : <Badge tone="amber">Unpaid</Badge>}</Td>
              </tr>
            );
          }) : <EmptyRow cols={7} text="No invoices match" />}
        </tbody>
      </Table>
      {rows?.length === 300 && <p className="text-xs text-muted">Showing the latest 300. Narrow the search to see older ones.</p>}
    </div>
  );
}
