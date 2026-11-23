"use server";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/session";
import { NON_CHARGEABLE, toMinutes } from "@/lib/time";
import { todayIST } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date"),
  kind: z.enum(["chargeable", "non"]),
  project_id: z.string().trim(),
  category: z.string().trim(),
  work: z.string().trim().min(1, "Describe the work accomplished").max(2000, "Keep the description under 2000 characters"),
  hours: z.string().trim(), minutes: z.string().trim(),
});

function parse(fd: FormData) {
  const fields: Record<string, string> = { project_id: "", category: "", hours: "", minutes: "" };
  for (const [k, v] of fd.entries()) if (typeof v === "string") fields[k] = v;
  const p = schema.safeParse(fields);
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  if (d.entry_date > todayIST()) return { error: "You cannot log time for a future date" };
  const mins = toMinutes(d.hours, d.minutes);
  if (Number.isNaN(mins)) return { error: "Enter hours and minutes as numbers (minutes 0 to 59)" };
  if (mins < 1) return { error: "Enter the time spent" };
  if (mins > 1440) return { error: "A day has only 24 hours" };
  let project_id: number | null = null, category: string | null = null;
  if (d.kind === "chargeable") {
    if (!/^\d+$/.test(d.project_id)) return { error: "Choose the project" };
    project_id = Number(d.project_id);
  } else {
    if (!(NON_CHARGEABLE as readonly string[]).includes(d.category)) return { error: "Choose the non-chargeable category" };
    category = d.category;
  }
  return { entry_date: d.entry_date, minutes: mins, project_id, category, work: d.work };
}

export async function addEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const supabase = await createClient();
  if (p.project_id) {
    const { data } = await supabase.from("projects").select("id").eq("id", p.project_id).maybeSingle();
    if (!data) return { error: "That project was not found" };
  }
  const { error } = await supabase.from("time_entries").insert({
    profile_id: user.id, entry_date: p.entry_date, minutes: p.minutes, project_id: p.project_id,
    non_chargeable_category: p.category ?? "", work_accomplished: p.work, submitted_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save the entry" };
  revalidatePath("/time-tracker");
  return { ok: "Time entry added" };
}

export async function requestEdit(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_time_edit", {
    p_entry_id: id, p_date: p.entry_date, p_project_id: p.project_id as number, p_category: p.category ?? "", p_work: p.work, p_minutes: p.minutes,
  });
  if (error) return { error: error.message.length < 120 ? error.message : "Could not send the edit for approval" };
  revalidatePath("/time-tracker"); revalidatePath("/time-tracker/approvals");
  redirect("/time-tracker/approvals");
}

export async function deleteEntry(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "You cannot delete that entry" };
  revalidatePath("/time-tracker");
  return { ok: "Entry deleted" };
}

export async function approveEdit(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_time_edit", { p_edit_id: id });
  if (error) return { error: "Could not approve that edit" };
  revalidatePath("/time-tracker/approvals"); revalidatePath("/time-tracker");
  return { ok: "Approved" };
}

export async function approveAll(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_all_time_edits");
  if (error) return { error: "Could not approve the edits" };
  revalidatePath("/time-tracker/approvals"); revalidatePath("/time-tracker");
  return { ok: `${data} edit${data === 1 ? "" : "s"} approved` };
}

export async function rejectEdit(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_time_edit", { p_edit_id: id });
  if (error) return { error: "Could not remove that request" };
  revalidatePath("/time-tracker/approvals");
  return { ok: "Request removed" };
}
