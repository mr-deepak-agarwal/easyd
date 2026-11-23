import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { INVOICE_EDITORS } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm, type InvoiceDefaults } from "../invoice-form";
import { createInvoice } from "../actions";

export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  await requireRole(INVOICE_EDITORS);
  const sp = await searchParams;
  const projectId = Number(Array.isArray(sp.project) ? sp.project[0] : sp.project);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const supabase = await createClient();
  const [{ data: project }, { data: sacs }] = await Promise.all([
    supabase.from("projects").select("id, name, clients(firm_name, address, pan, gstin, state_code)").eq("id", projectId).maybeSingle(),
    supabase.from("sac_codes").select("sac, description").eq("active", true).order("sac"),
  ]);
  if (!project) notFound();
  const c = project.clients as { firm_name: string | null; address: string | null; pan: string | null; gstin: string | null; state_code: string | null } | null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const defaults: InvoiceDefaults = {
    invoice_type: "Proforma", invoice_by: "MARC", invoice_by_type: "", invoice_date: today, place_of_supply: "",
    recipient_name: c?.firm_name ?? "", recipient_address: c?.address ?? "", recipient_pan: c?.pan ?? "", recipient_gst: c?.gstin ?? "", recipient_state_code: c?.state_code ?? "",
    delivery_name: c?.firm_name ?? "", delivery_address: c?.address ?? "", delivery_pan: c?.pan ?? "", delivery_gst: c?.gstin ?? "", delivery_state_code: c?.state_code ?? "",
    advance: "", ope: "", currency_type: "", lines: [{ service_description: "", sac: "", taxable_value: "", rupee_value: "" }],
  };
  return (
    <div className="space-y-5">
      <PageHeader title="New invoice" description={`Project: ${project.name ?? projectId}. The number is issued when you save.`} />
      <InvoiceForm action={createInvoice.bind(null, projectId)} defaults={defaults} sacs={sacs ?? []} />
    </div>
  );
}
