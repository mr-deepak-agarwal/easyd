"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { LEAD_DECIDERS, MGMT_ROLES } from "@/lib/roles";
import { uploadFile } from "@/lib/storage";
import type { ActionState } from "@/lib/action-state";

const text = (max = 500) => z.string().trim().max(max);
const optional = (max = 500) => text(max).transform((v) => (v === "" ? null : v));
const optionalUuid = z.string().transform((v) => (/^[0-9a-f-]{36}$/i.test(v) ? v : null));
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form";
const raw = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));

const clientFields = {
  firm_name: text(200).min(1, "Enter the firm name"),
  designation: optional(200),
  email: optional(200),
  address: optional(1000),
  phone: optional(50),
  sector: optional(200),
};

const newLeadSchema = z.object({
  ...clientFields,
  contact_name: text(200).min(1, "Enter the contact person's name"),
  lead_name: text(200).min(1, "Enter a lead / project name"),
  service: optional(500),
  remarks: optional(2000),
  source: optional(200),
  lead_generator: optionalUuid,
  lead_handler: optionalUuid,
  priority: z.enum(["0", "1"]).default("0"),
  category: optional(200),
  cost_type: z.enum(["chargeable", "nonchargeable"]),
});

/** New enquiry: finds the client by firm name (any case) or creates it, then records the lead and contact. */
export async function addClientLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(MGMT_ROLES);
  const parsed = newLeadSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: existing } = await supabase.from("clients").select("id").ilike("firm_name", d.firm_name.replace(/[%_\\]/g, "\\$&")).limit(1);
  let clientId = existing?.[0]?.id;
  if (!clientId) {
    const { data: created, error } = await supabase.from("clients").insert({
      firm_name: d.firm_name, designation: d.designation, email: d.email, address: d.address, phone: d.phone,
      sector: d.sector, priority: Number(d.priority), entered_by: user.id, entered_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !created) return { error: "Could not save the client" };
    clientId = created.id;
  }
  const { error: leadError } = await supabase.from("leads").insert({
    name: d.lead_name, client_id: clientId, service: d.service, comments: d.remarks, source: d.source,
    cost_type: d.cost_type, category: d.category, lead_generator: d.lead_generator, lead_handler: d.lead_handler,
    entered_by: user.id, entered_at: new Date().toISOString(),
  });
  if (leadError) return { error: "Could not save the lead" };
  await supabase.from("client_contacts").insert({
    client_id: clientId, name: d.contact_name, designation: d.designation, email: d.email, phone: d.phone, address: d.address,
  });
  revalidatePath("/crm/clients");
  redirect(`/crm/clients/${clientId}`);
}

const clientSchema = z.object({ ...clientFields, priority: z.enum(["0", "1"]).default("0") });

export async function updateClient(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(MGMT_ROLES);
  const parsed = clientSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { priority, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ ...rest, priority: Number(priority) }).eq("id", id);
  if (error) return { error: "Could not update the client" };
  revalidatePath(`/crm/clients/${id}`);
  return { ok: "Client details saved" };
}

export async function setClientActive(id: number, active: boolean): Promise<void> {
  await requireRole(MGMT_ROLES);
  const supabase = await createClient();
  await supabase.from("clients").update({ active }).eq("id", id);
  revalidatePath(`/crm/clients/${id}`);
  revalidatePath("/crm/clients");
}

const contactSchema = z.object({
  name: text(200).min(1, "Enter the contact's name"),
  designation: optional(200), email: optional(200), phone: optional(50),
});

export async function addContact(clientId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(MGMT_ROLES);
  const parsed = contactSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("client_contacts").insert({ client_id: clientId, ...parsed.data });
  if (error) return { error: "Could not save the contact" };
  revalidatePath(`/crm/clients/${clientId}`);
  return { ok: "Contact added" };
}

export async function deleteContact(clientId: number, contactId: number): Promise<void> {
  await requireRole(MGMT_ROLES);
  const supabase = await createClient();
  await supabase.from("client_contacts").delete().eq("id", contactId).eq("client_id", clientId);
  revalidatePath(`/crm/clients/${clientId}`);
}

const leadSchema = z.object({
  name: text(200).min(1, "Enter a lead / project name"),
  service: optional(500), comments: optional(2000), source: optional(200), category: optional(200),
  cost_type: z.enum(["chargeable", "nonchargeable"]),
  lead_generator: optionalUuid, lead_handler: optionalUuid,
});

export async function addLead(clientId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(MGMT_ROLES);
  const parsed = leadSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({ client_id: clientId, ...parsed.data, entered_by: user.id, entered_at: new Date().toISOString() });
  if (error) return { error: "Could not save the lead" };
  revalidatePath(`/crm/clients/${clientId}`);
  return { ok: "Lead added" };
}

export async function updateLead(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(MGMT_ROLES);
  const parsed = leadSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(parsed.data).eq("id", id).eq("status", "pending");
  if (error) return { error: "Could not update the lead" };
  revalidatePath(`/crm/leads/${id}`);
  return { ok: "Lead saved" };
}

const approveSchema = z.object({
  project_name: text(200).min(1, "Enter a project name"),
  department_id: z.string().regex(/^\d+$/, "Choose a department").transform(Number),
  project_type: z.enum(["one time", "monthly", "quarterly", "yearly"]),
});

export async function approveLead(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(LEAD_DECIDERS);
  const parsed = approveSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_lead", {
    p_lead_id: id, p_name: parsed.data.project_name, p_department_id: parsed.data.department_id, p_project_type: parsed.data.project_type,
  });
  if (error) return { error: error.message };
  revalidatePath(`/crm/leads/${id}`);
  revalidatePath("/crm/clients");
  return { ok: "Lead approved and the project was created" };
}

export async function rejectLead(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(LEAD_DECIDERS);
  const reason = text(1000).min(1, "Enter a reason").safeParse(formData.get("reason") ?? "");
  if (!reason.success) return { error: firstError(reason.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_lead", { p_lead_id: id, p_reason: reason.data });
  if (error) return { error: error.message };
  revalidatePath(`/crm/leads/${id}`);
  return { ok: "Lead rejected" };
}

const followupSchema = z.object({
  reason: text(500).min(1, "Enter the reason for the follow-up"),
  reply: optional(2000), description: optional(2000),
  next_followup_on: z.string().transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  file_description: optional(500),
});
const MAX_FOLLOWUP_FILE = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB

/** Follow-up on a client (optionally one of its leads, or an approved project). */
export async function addFollowup(
  target: { clientId: number; leadId?: number; projectId?: number },
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(MGMT_ROLES);
  const parsed = followupSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("firm_name").eq("id", target.clientId).maybeSingle();
  if (!client) return { error: "Client not found" };

  let filePath: string | null = null;
  const file = formData.get("document");
  if (file instanceof File && file.size > 0) {
    const up = await uploadFile("documents", `followups/${target.clientId}`, file, MAX_FOLLOWUP_FILE);
    if ("error" in up) return { error: up.error };
    filePath = up.path;
  }
  const { error } = await supabase.from("followups").insert({
    client_id: target.clientId, lead_id: target.leadId ?? null, project_id: target.projectId ?? null,
    prospect_name: client.firm_name, reason: parsed.data.reason, reply: parsed.data.reply, description: parsed.data.description,
    next_followup_on: parsed.data.next_followup_on, file_path: filePath, file_description: parsed.data.file_description,
    entered_by: user.id, entered_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save the follow-up" };
  revalidatePath(`/crm/clients/${target.clientId}`);
  if (target.leadId) revalidatePath(`/crm/leads/${target.leadId}`);
  revalidatePath("/crm/followups");
  return { ok: "Follow-up saved" };
}
