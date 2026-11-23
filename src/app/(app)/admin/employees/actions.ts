"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/action-state";

const uuid = z.string().uuid();

export async function setActive(profileId: string, active: boolean): Promise<void> {
  const me = await requireRole(["admin"]);
  if (!uuid.safeParse(profileId).success || profileId === me.id) return; // nobody can lock themselves out
  const admin = createAdminClient();
  await admin.from("profiles").update({ active }).eq("id", profileId);
  // A terminated employee must also be unable to sign in at all.
  await admin.auth.admin.updateUserById(profileId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/admin/employees");
}

export async function setRole(profileId: string, formData: FormData): Promise<void> {
  const me = await requireRole(["admin"]);
  const role = z.enum(["admin", "bd", "teamlead", "teamlead2", "employee"]).safeParse(formData.get("role"));
  if (!role.success || !uuid.safeParse(profileId).success || profileId === me.id) return;
  await createAdminClient().from("profiles").update({ role: role.data }).eq("id", profileId);
  revalidatePath("/admin/employees");
}

export async function resetPassword(profileId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const pw = z.string().min(8, "Password must be at least 8 characters").max(72).safeParse(formData.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (!uuid.safeParse(profileId).success) return { error: "Unknown employee" };
  const { error } = await createAdminClient().auth.admin.updateUserById(profileId, { password: pw.data });
  if (error) return { error: "Could not change the password" };
  return { ok: "Password changed" };
}
