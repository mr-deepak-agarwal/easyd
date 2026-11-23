import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { profitRow, sumProfit } from "@/lib/profit";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Input } from "@/components/ui/fields";
import { Badge } from "@/components/ui/badge";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const pct = (n: number | null) => (n === null ? "-" : `${n}%`);

export default async function ProfitabilityPage({ searchParams }: PageProps<"/projects/profitability">) {
  await requireRole(["admin", "teamlead2"]);
  const sp = await searchParams;
  const from = isDate(one(sp.from)) ? one(sp.from) : null, to = isDate(one(sp.to)) ? one(sp.to) : null;
  const q = one(sp.q).trim().toLowerCase();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_profitability", { p_from: from, p_to: to });
  const all = data ?? [];
  const rows = q ? all.filter((r) => `${r.project_name} ${r.client_name}`.toLowerCase().includes(q)) : all;
  const active = rows.filter((r) => Number(r.invoiced) || Number(r.minutes) || Number(r.reimbursements));
  const t = sumProfit(active);
  const unrated = active.reduce((s, r) => s + Number(r.unrated_minutes), 0);
  const oh = Number(all[0]?.overhead_rate ?? 0);
  const sorted = [...active].sort((a, b) => profitRow(a).profit - profitRow(b).profit);

  return (
    <div className="space-y-5">
      <PageHeader title="Project profitability" description="Invoiced revenue against the cost of the time and expenses spent" />
      <form className="flex flex-wrap items-end gap-2">
        <Input name="q" defaultValue={one(sp.q)} placeholder="Search project or client" aria-label="Search" className="w-64" />
        <Input type="date" name="from" defaultValue={from ?? ""} aria-label="From" className="w-40" />
        <Input type="date" name="to" defaultValue={to ?? ""} aria-label="To" className="w-40" />
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Show</button>
        {(from || to || q) && <Link href="/projects/profitability" className="px-2 py-2 text-sm text-muted hover:underline">Clear</Link>}
      </form>
      {error && <p role="alert" className="text-sm text-danger">Could not load the report.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([["Invoiced", inr(t.invoiced)], ["Cost", inr(t.cost)], ["Profit", inr(t.profit)], ["Margin", pct(t.margin)]] as const).map(([k, v]) => (
          <Card key={k}><p className="text-sm text-muted">{k}</p><p className={`text-2xl font-semibold tabular-nums ${k === "Profit" && t.profit < 0 ? "text-danger" : ""}`}>{v}</p></Card>
        ))}
      </div>
      <Table>
        <thead><tr><Th>Project</Th><Th className="text-right">Quoted</Th><Th className="text-right">Invoiced</Th><Th className="text-right">Collected</Th><Th className="text-right">Time cost</Th><Th className="text-right">Expenses</Th><Th className="text-right">Overheads</Th><Th className="text-right">Profit</Th><Th className="text-right">Margin</Th></tr></thead>
        <tbody>
          {sorted.length ? <>
            {sorted.map((r) => { const p = profitRow(r); return (
              <tr key={r.project_id}>
                <Td><Link href={`/projects/${r.project_id}`} className="font-medium text-brand hover:underline">{r.project_name}</Link><p className="text-xs text-muted">{r.client_name ?? "-"}</p></Td>
                <Td className="text-right tabular-nums">{p.quoted ? inr(p.quoted) : "-"}</Td>
                <Td className="text-right tabular-nums">{inr(p.invoiced)}</Td>
                <Td className="text-right tabular-nums">{inr(p.collected)}</Td>
                <Td className="text-right tabular-nums">{inr(p.labour)}<p className="text-xs text-muted">{p.hours} h</p></Td>
                <Td className="text-right tabular-nums">{inr(p.reimb)}</Td>
                <Td className="text-right tabular-nums">{inr(p.overhead)}</Td>
                <Td className={`text-right font-medium tabular-nums ${p.loss ? "text-danger" : ""}`}>{inr(p.profit)}</Td>
                <Td className="text-right tabular-nums">{p.loss ? <Badge tone="red">Loss</Badge> : pct(p.margin)}</Td>
              </tr>); })}
            <tr className="bg-background font-medium"><Td>Total</Td><Td className="text-right tabular-nums">{inr(t.quoted)}</Td><Td className="text-right tabular-nums">{inr(t.invoiced)}</Td><Td className="text-right tabular-nums">{inr(t.collected)}</Td><Td className="text-right tabular-nums">{inr(t.labour)}</Td><Td className="text-right tabular-nums">{inr(t.reimb)}</Td><Td className="text-right tabular-nums">{inr(t.overhead)}</Td><Td className="text-right tabular-nums">{inr(t.profit)}</Td><Td className="text-right tabular-nums">{pct(t.margin)}</Td></tr>
          </> : <EmptyRow cols={9} text="No projects with invoices, time or expenses in this range" />}
        </tbody>
      </Table>
      <div className="space-y-1 text-sm text-muted">
        <p>Invoiced counts Taxable and Export invoices before GST (lines less advance already billed, plus out-of-pocket expenses). Proforma invoices are not counted.</p>
        <p>Time cost is hours logged on the project at each person&apos;s <i>current</i> grade rate. Overheads are hours logged times the current overhead rate ({inr(oh)} per hour). Expenses are approved reimbursements. Time logged as non-chargeable is not part of any project.</p>
        {unrated > 0 && <p className="text-danger">{Math.round(unrated / 60)} hours here were logged by people with no grade rate set, so they cost nothing in this report. Set grades in Employee details.</p>}
      </div>
    </div>
  );
}
