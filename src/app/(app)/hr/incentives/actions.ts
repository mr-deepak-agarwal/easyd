"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  profile: z.string().regex(/^[0-9a-f-]{36}$/i, "Choose the employee"),
  incentive_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date"),
  reason: z.string().trim().min(1, "Enter the reason").max(300),
  amount: z.string().trim().transform((v) => v.replace(/,/g, "")).refine((v) => /^\d{1,9}(\.\d{1,2})?$/.test(v) && Number(v) > 0, "Enter the amount, for example 5000"),
});

export async function addIncentive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const p = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("incentives").insert({ profile_id: p.data.profile, incentive_date: p.data.incentive_date, reason: p.data.reason, amount: Number(p.data.amount) });
  if (error) return { error: "Could not save the incentive" };
  revalidatePath("/hr/incentives");
  return { ok: "Incentive saved" };
}
