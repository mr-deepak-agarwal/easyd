import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { INVOICE_EDITORS } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm, type InvoiceDefaults } from "../../invoice-form";
import { updateInvoice } from "../../actions";

export default async function EditInvoicePage({ params }: PageProps<"/invoices/[id]/edit">) {
  await requireRole(INVOICE_EDITORS);
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) notFound();
  const supabase = await createClient();
  const [{ data: inv }, { data: lines }, { data: sacs }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", invoiceId).is("deleted_at", null).maybeSingle(),
    supabase.from("invoice_lines").select("service_description, sac, taxable_value, rupee_value").eq("invoice_id", invoiceId).order("position"),
    supabase.from("sac_codes").select("sac, description").eq("active", true).order("sac"),
  ]);
  if (!inv) notFound();
  if (inv.confirmed) redirect(`/invoices/${invoiceId}`);
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const defaults: InvoiceDefaults = {
    invoice_type: inv.invoice_type, invoice_by: inv.invoice_by, invoice_by_type: s(inv.invoice_by_type), invoice_date: s(inv.invoice_date), place_of_supply: s(inv.place_of_supply),
    recipient_name: s(inv.recipient_name), recipient_address: s(inv.recipient_address), recipient_pan: s(inv.recipient_pan), recipient_gst: s(inv.recipient_gst), recipient_state_code: s(inv.recipient_state_code),
    delivery_name: s(inv.delivery_name), delivery_address: s(inv.delivery_address), delivery_pan: s(inv.delivery_pan), delivery_gst: s(inv.delivery_gst), delivery_state_code: s(inv.delivery_state_code),
    advance: Number(inv.advance) ? s(inv.advance) : "", ope: Number(inv.ope) ? s(inv.ope) : "", currency_type: s(inv.currency_type),
    lines: (lines?.length ? lines : [{ service_description: "", sac: "", taxable_value: 0, rupee_value: null }]).map((l) => ({
      service_description: s(l.service_description), sac: s(l.sac), taxable_value: s(l.taxable_value), rupee_value: s(l.rupee_value) })),
  };
  return (
    <div className="space-y-5">
      <PageHeader title={`Edit ${inv.invoice_no}`} description="The invoice number stays the same. A confirmed invoice can no longer be edited." />
      <InvoiceForm action={updateInvoice.bind(null, invoiceId)} defaults={defaults} sacs={sacs ?? []} lockedNumber />
    </div>
  );
}
