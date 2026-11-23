import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { INVOICE_VIEWERS } from "@/lib/roles";
import { ENTITIES, computeInvoice, type Entity, type InvoiceType } from "@/lib/invoice";
import { csvRow } from "@/lib/report";

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !INVOICE_VIEWERS.includes(user.role)) return new NextResponse("Not allowed", { status: 403 });
  const p = req.nextUrl.searchParams;
  const from = p.get("from"), to = p.get("to"), project = Number(p.get("project"));
  if (!isDate(from) || !isDate(to)) return new NextResponse("Choose a date range", { status: 400 });
  const supabase = await createClient();
  let q = supabase.from("invoices")
    .select("invoice_no, invoice_type, invoice_by, invoice_date, place_of_supply, recipient_name, delivery_name, recipient_gst, recipient_pan, delivery_state_code, advance, ope, currency_type, created_at, projects(name), creator:created_by(name), invoice_lines(service_description, sac, taxable_value)")
    .is("deleted_at", null).gte("invoice_date", from).lte("invoice_date", to).order("invoice_date").order("id").limit(5000);
  if (Number.isInteger(project) && project > 0) q = q.eq("project_id", project);
  const { data } = await q;
  const lines = [csvRow(["Invoice no", "Type", "Billed by", "Date", "Project", "Place of supply", "Recipient", "Delivered to", "GSTIN", "PAN", "Services", "SAC", "Currency", "Services total", "Advance", "OPE", "Taxable", "CGST", "SGST", "IGST", "Total", "Created on", "Created by"])];
  for (const i of data ?? []) {
    const t = computeInvoice({ type: i.invoice_type as InvoiceType, entity: i.invoice_by as Entity, lines: i.invoice_lines, advance: i.advance, ope: i.ope, deliveryStateCode: i.delivery_state_code });
    lines.push(csvRow([i.invoice_no, i.invoice_type, ENTITIES[i.invoice_by as Entity]?.label ?? i.invoice_by, i.invoice_date, (i.projects as { name: string | null } | null)?.name, i.place_of_supply, i.recipient_name, i.delivery_name,
      i.recipient_gst, i.recipient_pan, i.invoice_lines.map((l) => l.service_description).filter(Boolean).join("; "), i.invoice_lines.map((l) => l.sac).filter(Boolean).join("; "), i.currency_type || "INR",
      t.linesTotal, t.advance, t.ope, t.taxable, t.cgst, t.sgst, t.igst, t.total, i.created_at?.slice(0, 10), (i.creator as { name: string } | null)?.name]));
  }
  return new NextResponse(lines.join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="invoices-${from}-to-${to}.csv"`, "cache-control": "no-store" } });
}
