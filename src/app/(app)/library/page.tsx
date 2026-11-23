import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { INVOICE_VIEWERS } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/fields";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
type Proj = { id: number; name: string | null; departments: { name: string } | null; clients: { firm_name: string | null } | null } | null;
const cat = (p: Proj) => p?.departments?.name ?? null;

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80), category = one(sp.category).trim().slice(0, 80), project = Number(one(sp.project));
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id, name, departments(name)").eq("status", "approved").order("name").limit(1000);
  const categories = [...new Set((projects ?? []).map((p) => (p.departments as { name: string } | null)?.name).filter((c): c is string => !!c))].sort();

  const sel = "id, project_id, description, entry_at, projects(id, name, departments(name), clients(firm_name))";
  let docs = supabase.from("project_documents").select(sel).not("project_id", "is", null).order("id", { ascending: false }).limit(300);
  let props = supabase.from("project_proposals").select(sel).not("project_id", "is", null).order("id", { ascending: false }).limit(300);
  if (Number.isInteger(project) && project > 0) { docs = docs.eq("project_id", project); props = props.eq("project_id", project); }
  if (q) { const t = q.replace(/[%,()]/g, ""); docs = docs.ilike("description", `%${t}%`); props = props.ilike("description", `%${t}%`); }
  const [{ data: d }, { data: p }] = await Promise.all([docs, props]);
  const keep = (x: { projects: unknown }) => !category || cat(x.projects as Proj) === category;
  const rows = [
    ...(d ?? []).filter(keep).map((x) => ({ kind: "documents" as const, label: "Document", ...x })),
    ...(p ?? []).filter(keep).map((x) => ({ kind: "proposals" as const, label: "Proposal", ...x })),
  ].sort((a, b) => String(b.entry_at ?? "").localeCompare(String(a.entry_at ?? "")));

  let invoices: { id: number; invoice_no: string; invoice_date: string | null; invoice_type: string; projects: Proj }[] = [];
  if (INVOICE_VIEWERS.includes(user.role)) {
    let iq = supabase.from("invoices").select("id, invoice_no, invoice_date, invoice_type, projects(id, name, departments(name), clients(firm_name))").is("deleted_at", null).order("id", { ascending: false }).limit(200);
    if (Number.isInteger(project) && project > 0) iq = iq.eq("project_id", project);
    if (q) iq = iq.ilike("invoice_no", `%${q.replace(/[%,()]/g, "")}%`);
    invoices = ((await iq).data ?? []).filter(keep) as typeof invoices;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Project Library" description="Documents, proposals and invoices across the projects you can see" />
      <form className="grid gap-2 sm:grid-cols-[1fr_220px_220px_auto]">
        <Input name="q" defaultValue={q} placeholder="Search description or invoice number" aria-label="Search" />
        <Select name="project" defaultValue={Number.isInteger(project) && project > 0 ? String(project) : ""} aria-label="Project"><option value="">All projects</option>{projects?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        <Select name="category" defaultValue={category} aria-label="Department"><option value="">All departments</option>{categories.map((c) => <option key={c}>{c}</option>)}</Select>
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Filter</button>
      </form>
      <Table>
        <thead><tr><Th>Client</Th><Th>Project</Th><Th>Department</Th><Th>Type</Th><Th>Description</Th><Th>Added</Th><Th /></tr></thead>
        <tbody>
          {rows.length ? rows.map((r) => {
            const pr = r.projects as Proj;
            return (
              <tr key={`${r.kind}${r.id}`}>
                <Td>{pr?.clients?.firm_name ?? "-"}</Td><Td><Link href={`/projects/${r.project_id}?tab=files`} className="hover:underline">{pr?.name}</Link></Td><Td>{cat(pr) ?? "-"}</Td>
                <Td>{r.label}</Td><Td>{r.description || "(no description)"}</Td><Td className="whitespace-nowrap">{formatDate(r.entry_at)}</Td>
                <Td><a href={`/projects/${r.project_id}/files/${r.kind}/${r.id}`} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">Download</a></Td>
              </tr>);
          }) : <EmptyRow cols={7} text="Nothing in the library matches" />}
        </tbody>
      </Table>
      {INVOICE_VIEWERS.includes(user.role) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Invoices</h2>
          <Table>
            <thead><tr><Th>Client</Th><Th>Project</Th><Th>Invoice no.</Th><Th>Date</Th></tr></thead>
            <tbody>
              {invoices.length ? invoices.map((i) => <tr key={i.id}><Td>{i.projects?.clients?.firm_name ?? "-"}</Td><Td>{i.projects?.name}</Td><Td><Link href={`/invoices/${i.id}`} className="text-brand hover:underline">{i.invoice_no}</Link></Td><Td>{formatDate(i.invoice_date)}</Td></tr>)
                : <EmptyRow cols={4} text="No invoices match" />}
            </tbody>
          </Table>
        </section>
      )}
    </div>
  );
}
