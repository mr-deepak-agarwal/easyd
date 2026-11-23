"use server";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { INVOICE_EDITORS } from "@/lib/roles";
import { CURRENCIES, SERIES } from "@/lib/invoice";
import type { ActionState } from "@/lib/action-state";

const text = (max: number) => z.string().trim().max(max, `Keep each field under ${max} characters`);
const amount = (label: string) => z.string().trim().transform((v) => v.replace(/,/g, ""))
  .refine((v) => v === "" || /^\d{1,10}(\.\d{1,2})?$/.test(v), `${label}: enter a number such as 1500 or 1500.50`);

const headerSchema = z.object({
  invoice_type: z.enum(["Proforma", "Taxable", "Export"]),
  invoice_by: z.enum(["MARC", "KNP", "KNPM", "KNPI", "AC"]),
  invoice_by_type: z.string().trim().refine((v) => v === "" || (SERIES as readonly string[]).includes(v), "Pick a valid series"),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the invoice date"),
  place_of_supply: text(100),
  recipient_name: text(200).min(1, "Enter the recipient's name"), recipient_address: text(500), recipient_pan: text(20), recipient_gst: text(20), recipient_state_code: text(4),
  delivery_name: text(200), delivery_address: text(500), delivery_pan: text(20), delivery_gst: text(20), delivery_state_code: text(4),
  advance: amount("Advance"), ope: amount("Out of pocket expenses"),
  currency_type: z.string().trim().refine((v) => v === "" || (CURRENCIES as readonly string[]).includes(v), "Pick a valid currency"),
});

/** Rows are posted as l<key>_desc / _sac / _amt / _inr with the keys listed in "rows". */
function readLines(fd: FormData) {
  const keys = String(fd.get("rows") ?? "").split(",").filter((k) => /^\d{1,3}$/.test(k)).slice(0, 50);
  const lines: { service_description: string; sac: string; taxable_value: number; rupee_value: number | null }[] = [];
  for (const k of keys) {
    const desc = String(fd.get(`l${k}_desc`) ?? "").trim(), sac = String(fd.get(`l${k}_sac`) ?? "").trim();
    const amt = String(fd.get(`l${k}_amt`) ?? "").trim().replace(/,/g, ""), inr = String(fd.get(`l${k}_inr`) ?? "").trim().replace(/,/g, "");
    if (!desc && !sac && !amt) continue; // an empty row is ignored
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(amt)) return { error: `Line "${desc || sac || k}": enter the amount as a number` };
    if (inr && !/^\d{1,12}(\.\d{1,4})?$/.test(inr)) return { error: `Line "${desc || sac || k}": enter the rupee value as a number` };
    if (desc.length > 1000) return { error: "A line description is too long" };
    lines.push({ service_description: desc, sac: sac.slice(0, 20), taxable_value: Number(amt), rupee_value: inr ? Number(inr) : null });
  }
  if (!lines.length) return { error: "Add at least one line with an amount" };
  return { lines };
}

function parse(fd: FormData) {
  const fields: Record<string, FormDataEntryValue> = Object.fromEntries(Object.keys(headerSchema.shape).map((k) => [k, ""]));
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k in fields) fields[k] = v;
  const parsed = headerSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const l = readLines(fd);
  if ("error" in l) return { error: l.error };
  const h = parsed.data;
  if ((h.invoice_by === "KNPM" || h.invoice_by === "KNPI") && !h.invoice_by_type) return { error: "Pick a series for this entity" };
  if (h.invoice_type === "Export" && !h.currency_type) return { error: "Pick the currency for an export invoice" };
  if (h.invoice_type !== "Export" && !h.place_of_supply) return { error: "Enter the place of supply" };
  return { header: h, lines: l.lines };
}

const friendly = (m: string | undefined) => (m && m.length < 140 && !/violates|permission|function|relation/i.test(m) ? m : "Could not save the invoice. You may not have permission.");

export async function createInvoice(projectId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(INVOICE_EDITORS);
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice", { p_header: { ...p.header, project_id: projectId }, p_lines: p.lines });
  if (error || !data) return { error: friendly(error?.message) };
  revalidatePath("/invoices");
  redirect(`/invoices/${data}`);
}

export async function updateInvoice(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(INVOICE_EDITORS);
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_invoice", { p_id: id, p_header: p.header, p_lines: p.lines });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}

export async function convertInvoice(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(INVOICE_EDITORS);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_to_tax_invoice", { p_id: id });
  if (error || !data) return { error: friendly(error?.message) };
  revalidatePath("/invoices");
  redirect(`/invoices/${data}`);
}

export async function confirmPayment(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(INVOICE_EDITORS);
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_invoice_payment", { p_id: id });
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/invoices/${id}`); revalidatePath("/invoices");
  return { ok: "Payment confirmed" };
}

export async function deleteInvoice(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(INVOICE_EDITORS);
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_invoice", { p_id: id });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function addSac(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const p = z.object({ sac: z.string().trim().regex(/^\d{4,8}$/, "A SAC code is 4 to 8 digits"), description: z.string().trim().min(1, "Enter a description").max(300) })
    .safeParse({ sac: formData.get("sac"), description: formData.get("description") });
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("sac_codes").insert(p.data);
  if (error) return { error: error.code === "23505" ? "That SAC code already exists" : "Could not save the code" };
  revalidatePath("/invoices/sac");
  return { ok: "SAC code added" };
}

export async function toggleSac(id: number, active: boolean, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("sac_codes").update({ active }).eq("id", id);
  if (error) return { error: "Could not update the code" };
  revalidatePath("/invoices/sac");
  return { ok: active ? "Activated" : "Deactivated" };
}
