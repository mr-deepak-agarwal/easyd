import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES, INVOICE_VIEWERS, TIME_VIEWERS } from "@/lib/roles";
import { formatDate, todayIST } from "@/lib/dates";
import { formatMinutes } from "@/lib/time";
import { efficiencyRow, sumEfficiency, monthRange } from "@/lib/report";
import { ENTITIES, computeInvoice, money, type Entity, type InvoiceType } from "@/lib/invoice";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/fields";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const hrs = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-IN");

export default async function ReportsPage({ searchParams }: PageProps<"/projects/reports">) {
  const user = await requireRole(MGMT_ROLES);
  const sp = await searchParams;
  const canInvoices = INVOICE_VIEWERS.includes(user.role), canPeople = TIME_VIEWERS.includes(user.role);
  const tabs = [["project", "Project efficiency", true], ["employee", "Employee efficiency", canPeople], ["revenue", "Revenue", canInvoices], ["invoice", "Invoices", canInvoices]] as const;
  const available = tabs.filter((t) => t[2]);
  const r = available.some((t) => t[0] === one(sp.r)) ? one(sp.r) : "project";
  const today = todayIST(), range = monthRange(today);
  const from = isDate(one(sp.from)) ? one(sp.from) : range.from, to = isDate(one(sp.to)) ? one(sp.to) : range.to;
  const supabase = await createClient();

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Efficiency, revenue and invoices" />
      <div className="flex flex-wrap gap-1 border-b border-border">
        {available.map(([k, label]) => (
          <Link key={k} href={`/projects/reports?r=${k}`} className={`-mb-px border-b-2 px-4 py-2 text-sm ${r === k ? "border-brand font-medium text-brand" : "border-transparent text-muted hover:text-foreground"}`}>{label}</Link>
        ))}
      </div>
      {r === "project" && await ProjectEfficiency({ supabase, project: Number(one(sp.project)) })}
      {r === "employee" && await EmployeeEfficiency({ supabase, who: one(sp.who), from, to, me: user.id })}
      {r === "revenue" && await Revenue({ supabase, from, to, project: Number(one(sp.project)) })}
      {r === "invoice" && await InvoiceReport({ supabase, from, to, project: Number(one(sp.project)) })}
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof createClient>>;

function ProjectPicker({ r, projects, project, dates, from, to }: { r: string; projects: { id: number; name: string | null }[]; project: number; dates?: boolean; from?: string; to?: string }) {
  return (
    <form className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="r" value={r} />
      <Select name="project" defaultValue={project || ""} aria-label="Project" className="max-w-sm"><option value="">{dates ? "All projects" : "Choose a project"}</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
      {dates && <><Input type="date" name="from" defaultValue={from} aria-label="From" className="w-40" /><Input type="date" name="to" defaultValue={to} aria-label="To" className="w-40" /></>}
      <button className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-raised">Show</button>
    </form>
  );
}

async function ProjectEfficiency({ supabase, project }: { supabase: Sb; project: number }) {
  const { data: projects } = await supabase.from("projects").select("id, name").in("status", ["approved", "closed"]).order("name").limit(1000);
  const rows = Number.isInteger(project) && project > 0 ? (await supabase.rpc("report_project_efficiency", { p_project: project })).data ?? [] : null;
  const tot = rows ? sumEfficiency(rows) : null;
  return (
    <div className="space-y-4">
      <ProjectPicker r="project" projects={projects ?? []} project={project} />
      {rows && (
        <Table>
          <thead><tr><Th>Team member</Th><Th>Grade</Th><Th className="text-right">Planned hours</Th><Th className="text-right">Actual hours</Th><Th className="text-right">Planned cost</Th><Th className="text-right">Actual cost</Th><Th className="text-right">Saving</Th></tr></thead>
          <tbody>
            {rows.length ? <>
              {rows.map((x) => { const e = efficiencyRow(x); return (
                <tr key={x.profile_id}>
                  <Td>{x.name}</Td><Td>{x.grade ?? "-"}</Td><Td className="text-right">{hrs(e.estHours)}</Td>
                  <Td className={`text-right ${e.over ? "font-semibold text-danger" : ""}`}>{hrs(e.actualHours)}{e.over ? " (over)" : ""}</Td>
                  <Td className="text-right">{inr(e.estCost)}</Td><Td className="text-right">{inr(e.actualCost)}</Td>
                  <Td className={`text-right ${e.saving < 0 ? "text-danger" : ""}`}>{inr(e.saving)}</Td>
                </tr>); })}
              {tot && <tr className="bg-background font-medium"><Td colSpan={2}>Total</Td><Td className="text-right">{hrs(tot.estHours)}</Td><Td className="text-right">{hrs(tot.actualHours)}</Td><Td className="text-right">{inr(tot.estCost)}</Td><Td className="text-right">{inr(tot.actualCost)}</Td><Td className="text-right">{inr(tot.saving)}</Td></tr>}
            </> : <EmptyRow cols={7} text="No team members, or you cannot see this project" />}
          </tbody>
        </Table>
      )}
      {rows && <p className="text-xs text-muted">Cost = hours x the member&apos;s grade rate (Projects → Grades). Actual hours come from the time tracker for this project.</p>}
    </div>
  );
}

async function EmployeeEfficiency({ supabase, who, from, to, me }: { supabase: Sb; who: string; from: string; to: string; me: string }) {
  const { data: people } = await supabase.from("profiles").select("id, name").eq("active", true).order("name");
  const ok = /^[0-9a-f-]{36}$/i.test(who);
  const [rows, non] = ok ? await Promise.all([
    supabase.rpc("report_employee_efficiency", { p_profile: who, p_from: from, p_to: to }),
    supabase.rpc("report_employee_nonchargeable", { p_profile: who, p_from: from, p_to: to }),
  ]) : [null, null];
  const charge = (rows?.data ?? []).reduce((s, x) => s + Number(x.actual_minutes), 0);
  const nonc = (non?.data ?? []).reduce((s, x) => s + Number(x.minutes), 0);
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="r" value="employee" />
        <Select name="who" defaultValue={who} aria-label="Employee" className="w-64"><option value="">Choose an employee</option>{people?.map((p) => <option key={p.id} value={p.id}>{p.id === me ? `${p.name} (me)` : p.name}</option>)}</Select>
        <Input type="date" name="from" defaultValue={from} aria-label="From" className="w-40" /><Input type="date" name="to" defaultValue={to} aria-label="To" className="w-40" />
        <button className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-raised">Show</button>
      </form>
      {ok && <>
        <p className="text-sm text-muted">Chargeable <b className="text-foreground">{formatMinutes(charge)}</b> · non chargeable <b className="text-foreground">{formatMinutes(nonc)}</b> · {charge + nonc > 0 ? Math.round((charge / (charge + nonc)) * 100) : 0}% chargeable</p>
        <Table>
          <thead><tr><Th>Client</Th><Th>Project</Th><Th className="text-right">Planned hours</Th><Th className="text-right">Actual hours</Th></tr></thead>
          <tbody>
            {rows?.data?.length ? rows.data.map((x) => { const over = Number(x.actual_minutes) / 60 > Number(x.est_hours); return (
              <tr key={x.project_id}><Td>{x.client_name ?? "-"}</Td><Td>{x.project_name}</Td><Td className="text-right">{hrs(Number(x.est_hours))}</Td><Td className={`text-right ${over && Number(x.est_hours) > 0 ? "font-semibold text-danger" : ""}`}>{hrs(Number(x.actual_minutes) / 60)}</Td></tr>); })
              : <EmptyRow cols={4} text="No project time in this period" />}
          </tbody>
        </Table>
        {!!non?.data?.length && (
          <Table>
            <thead><tr><Th>Non chargeable category</Th><Th className="text-right">Time</Th></tr></thead>
            <tbody>{non.data.map((x) => <tr key={x.category}><Td>{x.category}</Td><Td className="text-right">{formatMinutes(Number(x.minutes))}</Td></tr>)}</tbody>
          </Table>
        )}
      </>}
    </div>
  );
}

async function invoicesIn(supabase: Sb, from: string, to: string, project: number, onlyTax: boolean) {
  let q = supabase.from("invoices")
    .select("id, invoice_no, invoice_type, invoice_by, invoice_date, place_of_supply, recipient_name, delivery_name, recipient_gst, recipient_pan, delivery_state_code, advance, ope, currency_type, created_at, projects(id, name), creator:created_by(name), invoice_lines(service_description, sac, taxable_value, rupee_value)")
    .is("deleted_at", null).gte("invoice_date", from).lte("invoice_date", to).order("invoice_date").order("id").limit(2000);
  if (onlyTax) q = q.eq("invoice_type", "Taxable");
  if (Number.isInteger(project) && project > 0) q = q.eq("project_id", project);
  return (await q).data ?? [];
}

async function Revenue({ supabase, from, to, project }: { supabase: Sb; from: string; to: string; project: number }) {
  const [{ data: projects }, invoices] = await Promise.all([
    supabase.from("projects").select("id, name").order("name").limit(1000), invoicesIn(supabase, from, to, project, true)]);
  const by = new Map<string, { name: string; count: number; billed: number; total: number }>();
  for (const i of invoices) {
    const p = i.projects as { id: number; name: string | null } | null;
    const t = computeInvoice({ type: i.invoice_type as InvoiceType, entity: i.invoice_by as Entity, lines: i.invoice_lines, advance: i.advance, ope: i.ope, deliveryStateCode: i.delivery_state_code });
    const cur = by.get(String(p?.id)) ?? { name: p?.name ?? "-", count: 0, billed: 0, total: 0 };
    cur.count++; cur.billed += t.linesTotal; cur.total += t.total; by.set(String(p?.id), cur);
  }
  const list = [...by.values()].sort((a, b) => b.billed - a.billed);
  const all = list.reduce((s, x) => ({ count: s.count + x.count, billed: s.billed + x.billed, total: s.total + x.total }), { count: 0, billed: 0, total: 0 });
  return (
    <div className="space-y-4">
      <ProjectPicker r="revenue" projects={projects ?? []} project={project} dates from={from} to={to} />
      <Table>
        <thead><tr><Th>Project</Th><Th className="text-right">Tax invoices</Th><Th className="text-right">Billed (services)</Th><Th className="text-right">Invoice total incl. GST</Th></tr></thead>
        <tbody>
          {list.length ? <>
            {list.map((x) => <tr key={x.name}><Td>{x.name}</Td><Td className="text-right">{x.count}</Td><Td className="text-right">{inr(x.billed)}</Td><Td className="text-right">{inr(x.total)}</Td></tr>)}
            <tr className="bg-background font-medium"><Td>Total</Td><Td className="text-right">{all.count}</Td><Td className="text-right">{inr(all.billed)}</Td><Td className="text-right">{inr(all.total)}</Td></tr>
          </> : <EmptyRow cols={4} text="No tax invoices in this period" />}
        </tbody>
      </Table>
      <p className="text-xs text-muted">Counts tax invoices (T-) by invoice date. Proforma and export invoices are not revenue here.</p>
    </div>
  );
}

async function InvoiceReport({ supabase, from, to, project }: { supabase: Sb; from: string; to: string; project: number }) {
  const [{ data: projects }, invoices] = await Promise.all([
    supabase.from("projects").select("id, name").order("name").limit(1000), invoicesIn(supabase, from, to, project, false)]);
  const qs = new URLSearchParams({ from, to, ...(project ? { project: String(project) } : {}) }).toString();
  return (
    <div className="space-y-4">
      <ProjectPicker r="invoice" projects={projects ?? []} project={project} dates from={from} to={to} />
      <div className="flex items-center justify-between text-sm text-muted"><span>{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</span><a href={`/projects/reports/export?${qs}`} className="text-brand hover:underline">Download CSV</a></div>
      <Table>
        <thead><tr><Th>Invoice no.</Th><Th>Date</Th><Th>Project</Th><Th>Recipient</Th><Th className="text-right">Taxable</Th><Th className="text-right">CGST</Th><Th className="text-right">SGST</Th><Th className="text-right">IGST</Th><Th className="text-right">Total</Th><Th>Billed by</Th></tr></thead>
        <tbody>
          {invoices.length ? invoices.map((i) => {
            const t = computeInvoice({ type: i.invoice_type as InvoiceType, entity: i.invoice_by as Entity, lines: i.invoice_lines, advance: i.advance, ope: i.ope, deliveryStateCode: i.delivery_state_code });
            const c = i.currency_type;
            return (
              <tr key={i.id}>
                <Td><Link href={`/invoices/${i.id}`} className="text-brand hover:underline">{i.invoice_no}</Link></Td><Td className="whitespace-nowrap">{formatDate(i.invoice_date)}</Td>
                <Td>{(i.projects as { name: string | null } | null)?.name ?? "-"}</Td><Td>{i.recipient_name}</Td>
                <Td className="text-right">{money(t.taxable, c)}</Td><Td className="text-right">{money(t.cgst, c)}</Td><Td className="text-right">{money(t.sgst, c)}</Td><Td className="text-right">{money(t.igst, c)}</Td>
                <Td className="text-right">{money(t.total, c)}</Td><Td>{ENTITIES[i.invoice_by as Entity]?.label ?? i.invoice_by}</Td>
              </tr>);
          }) : <EmptyRow cols={10} text="No invoices in this period" />}
        </tbody>
      </Table>
    </div>
  );
}
