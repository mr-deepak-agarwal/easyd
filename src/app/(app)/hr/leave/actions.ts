"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/session";
import { LEAVE_TYPES, leaveDays } from "@/lib/leave";
import { todayIST } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");
const applySchema = z.object({
  from: date, to: date,
  type: z.enum(LEAVE_TYPES, { message: "Select a leave type" }),
  reason: z.string().trim().min(3, "Enter a reason for the leave").max(500),
});

export async function applyLeave(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = applySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { from, to, type, reason } = parsed.data;
  if (to < from) return { error: "The end date cannot be before the start date" };
  if (type.includes("Half Day") && from !== to) return { error: "A half day must be a single date" };

  const supabase = await createClient();
  // Block overlapping requests (anything not rejected).
  const { data: clash } = await supabase.from("leave_applications").select("id")
    .eq("profile_id", user.id).neq("status", "rejected").lte("leave_from", to).gte("leave_to", from).limit(1);
  if (clash?.length) return { error: "You already have a leave application covering some of these dates" };

  const { error } = await supabase.from("leave_applications").insert({
    profile_id: user.id, leave_from: from, leave_to: to, applied_on: todayIST(),
    reason, leave_type: type, num_days: leaveDays(from, to, type), status: "pending",
  });
  if (error) return { error: "Could not submit your application" };
  revalidatePath("/hr/leave");
  return { ok: "Your leave request was submitted" };
}

// Approve or reject the ticked applications. Approvers cannot decide their own leave.
export async function decideLeave(decision: "approved" | "rejected", formData: FormData): Promise<void> {
  const user = await requireRole(["admin", "teamlead", "teamlead2"]);
  const ids = formData.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return;
  const supabase = await createClient();
  await supabase.from("leave_applications")
    .update({ status: decision, changed_by: user.id, changed_at: new Date().toISOString() })
    .in("id", ids).eq("status", "pending").neq("profile_id", user.id);
  revalidatePath("/hr/leave/approvals");
}

const quotaSchema = z.object({
  casual: z.coerce.number().min(0, "Quota cannot be negative").max(365),
  privilege: z.coerce.number().min(0, "Quota cannot be negative").max(365),
});

export async function updateQuota(profileId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  if (!z.string().uuid().safeParse(profileId).success) return { error: "Unknown employee" };
  const parsed = quotaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("leave_quota")
    .upsert({ profile_id: profileId, casual: parsed.data.casual, privilege: parsed.data.privilege }, { onConflict: "profile_id" });
  if (error) return { error: "Could not save the quota" };
  revalidatePath("/hr/leave/quota");
  return { ok: "Saved" };
}
