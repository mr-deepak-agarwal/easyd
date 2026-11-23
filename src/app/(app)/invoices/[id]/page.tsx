import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { INVOICE_VIEWERS, INVOICE_EDITORS } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { ENTITIES, CURRENCY_SYMBOL, amountInWords, computeInvoice, money, type Entity, type InvoiceType } from "@/lib/invoice";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { confirmPayment, convertInvoice, deleteInvoice } from "../actions";
import { PrintButton } from "./print-button";

const TITLE = { Proforma: "PROFORMA INVOICE", Taxable: "TAX INVOICE", Export: "EXPORT INVOICE (AGAINST LUT)" } as const;

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const user = await requireRole(INVOICE_VIEWERS);
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) notFound();
  const supabase = await createClient();
  const [{ data: inv }, { data: lines }] = await Promise.all([
    supabase.from("invoices").select("*, projects(id, name), confirmer:confirmed_by(name)").eq("id", invoiceId).is("deleted_at", null).maybeSingle(),
    supabase.from("invoice_lines").select("service_description, sac, taxable_value, rupee_value").eq("invoice_id", invoiceId).order("position"),
  ]);
  if (!inv) notFound();
  const canEdit = INVOICE_EDITORS.includes(user.role);
  const type = inv.invoice_type as InvoiceType, en = ENTITIES[inv.invoice_by as Entity] ?? ENTITIES.KNP;
  const cur = inv.currency_type ?? "";
  const t = computeInvoice({ type, entity: en.code, lines: lines ?? [], advance: inv.advance, ope: inv.ope, deliveryStateCode: inv.delivery_state_code });
  const exp = type === "Export";
  const project = inv.projects as { id: number; name: string | null } | null;
  const confirmer = inv.confirmer as { name: string } | null;
  const m = (n: number) => money(n, exp ? cur : "");
  const sym = CURRENCY_SYMBOL[cur] ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/invoices" className="text-sm text-muted hover:underline">← All invoices</Link>
        {project && <Link href={`/projects/${project.id}?tab=invoices`} className="text-sm text-muted hover:underline">· {project.name}</Link>}
        <span className="flex-1" />
        {inv.confirmed ? <Badge tone="green">Paid {formatDate(inv.confirmed_at)}{confirmer ? ` · ${confirmer.name}` : ""}</Badge> : <Badge tone="amber">Payment not confirmed</Badge>}
        <PrintButton />
        {canEdit && !inv.confirmed && <Link href={`/invoices/${invoiceId}/edit`} className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Edit</Link>}
        {canEdit && type === "Proforma" && !inv.converted && (
          <ActionForm action={convertInvoice.bind(null, invoiceId)} resetOnSuccess={false}><SubmitButton variant="secondary" confirm="Create a tax invoice from this proforma?">Convert to tax invoice</SubmitButton></ActionForm>
        )}
        {canEdit && !inv.confirmed && (
          <ActionForm action={confirmPayment.bind(null, invoiceId)} resetOnSuccess={false}><SubmitButton confirm="Confirm that the amount has been received?">Confirm payment received</SubmitButton></ActionForm>
        )}
        {canEdit && (
          <ActionForm action={deleteInvoice.bind(null, invoiceId)} resetOnSuccess={false}><SubmitButton variant="danger" confirm={`Delete invoice ${inv.invoice_no}?`}>Delete</SubmitButton></ActionForm>
        )}
      </div>
      {inv.converted && <p className="text-sm text-muted print:hidden">This proforma has been converted to a tax invoice.</p>}

      <article className="mx-auto max-w-[820px] space-y-4 rounded-xl border border-border bg-white p-8 text-sm print:max-w-none print:rounded-none print:border-0 print:p-0" id="invoice">
        <header className="flex justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-brand">{en.name}</h2>
            {en.subtitle && <p>{en.subtitle}</p>}
            {en.address.map((a) => <p key={a}>{a}</p>)}
            <p>Ph: {en.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">{TITLE[type]}</p>
            {type === "Proforma" && <p className="text-xs text-muted">Please do not consider this invoice for tax purpose</p>}
            {type === "Taxable" && <p className="text-xs text-muted">Original for recipient</p>}
            <p className="mt-2">GSTIN: {en.gstin}</p>
            <p>PAN: {en.pan}</p>
          </div>
        </header>
        <section className="grid grid-cols-2 gap-4">
          <dl className="space-y-1">
            <div className="flex gap-2"><dt className="w-32 font-medium">Invoice no.</dt><dd>{inv.invoice_no}</dd></div>
            <div className="flex gap-2"><dt className="w-32 font-medium">Invoice date</dt><dd>{formatDate(inv.invoice_date)}</dd></div>
            {!exp && <div className="flex gap-2"><dt className="w-32 font-medium">Place of supply</dt><dd>{inv.place_of_supply || "-"}</dd></div>}
          </dl>
        </section>
        <section className="grid grid-cols-2 gap-4">
          {([["Billed to", "recipient"], ["Delivered to", "delivery"]] as const).map(([title, p]) => {
            const g = (f: string) => (inv as unknown as Record<string, string | null>)[`${p}_${f}`];
            return (
              <div key={p} className="rounded-md border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
                <p className="font-medium">{g("name")}</p>
                <p className="whitespace-pre-line">{g("address")}</p>
                {g("pan") && <p>PAN: {g("pan")}</p>}
                {g("gst") && <p>{exp ? "Tax ID" : "GSTIN"}: {g("gst")}</p>}
                {!exp && g("state_code") && <p>State code: {g("state_code")}</p>}
              </div>
            );
          })}
        </section>
        <table className="w-full border-collapse text-left">
          <thead><tr className="border-y border-border bg-background"><th className="px-2 py-1.5 w-10">#</th><th className="px-2 py-1.5">Description of service</th><th className="px-2 py-1.5">SAC</th><th className="px-2 py-1.5 text-right">Taxable value</th>{exp && <th className="px-2 py-1.5 text-right">In Rs</th>}</tr></thead>
          <tbody>
            {lines?.map((l, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="px-2 py-1.5">{i + 1}</td><td className="whitespace-pre-line px-2 py-1.5">{l.service_description}</td><td className="px-2 py-1.5">{l.sac}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{m(Number(l.taxable_value))}</td>
                {exp && <td className="px-2 py-1.5 text-right tabular-nums">{l.rupee_value ? money(Number(l.rupee_value), "") : "-"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <section className="ml-auto w-full max-w-sm space-y-1" aria-label="Totals">
          <Row label="Total of services" v={m(t.linesTotal)} />
          {!exp && t.advance > 0 && <Row label="Less: advance" v={`- ${m(t.advance)}`} />}
          {t.ope > 0 && <Row label="Add: out of pocket expenses" v={m(t.ope)} />}
          <Row label="Taxable amount" v={m(t.taxable)} bold />
          {t.mode === "cgst_sgst" && <><Row label="CGST @ 9%" v={m(t.cgst)} /><Row label="SGST @ 9%" v={m(t.sgst)} /></>}
          {t.mode === "igst" && <Row label="IGST @ 18%" v={m(t.igst)} />}
          {exp && <Row label="GST (export against LUT) @ 0%" v={m(0)} />}
          <Row label="Total invoice value" v={m(t.total)} bold big />
          <p className="pt-1 text-xs">{amountInWords(t.total, exp ? (sym.trim() === "$" ? "US Dollars" : cur || "Rupees") : "Rupees")}</p>
        </section>
        <footer className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <p className="font-medium">Bank details</p>
            <p>{en.bank.name}</p><p>Account number: {en.bank.account}</p><p>IFSC: {en.bank.ifsc}</p>
          </div>
          <div>
            <p className="font-medium">Terms &amp; conditions</p>
            <p>Payment: within 7 days from the date of invoice.</p>
            <p>Any complaint about this invoice must be received within one week from the date of this invoice.</p>
            <p>Please mention the invoice number while remitting the amount.</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, v, bold, big }: { label: string; v: string; bold?: boolean; big?: boolean }) {
  return <div className={`flex justify-between gap-6 ${bold ? "font-semibold" : ""} ${big ? "border-t border-border pt-1 text-base" : ""}`}><span>{label}</span><span className="tabular-nums">{v}</span></div>;
}
