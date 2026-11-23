"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  description: z.string().trim().min(1, "Enter a description").max(200),
});

export async function addHoliday(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const parsed = schema.safeParse({ date: formData.get("date"), description: formData.get("description") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("holidays").insert({ holiday_date: parsed.data.date, description: parsed.data.description });
  if (error) return { error: error.code === "23505" ? "A holiday is already recorded on that date" : "Could not save the holiday" };
  revalidatePath("/hr/holidays");
  return { ok: "Holiday added" };
}

export async function deleteHoliday(id: number): Promise<void> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("holidays").delete().eq("id", id);
  revalidatePath("/hr/holidays");
}
