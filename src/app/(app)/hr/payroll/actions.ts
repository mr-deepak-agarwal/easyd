"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

const PAY_TYPES = ["Salary", "Advance", "Bonus", "Reimbursement", "Other"] as const;
const schema = z.object({
  profile: z.string().regex(/^[0-9a-f-]{36}$/i, "Choose the employee"),
  pay_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the pay date"),
  pay_type: z.enum(PAY_TYPES),
  amount: z.string().trim().transform((v) => v.replace(/,/g, "")).refine((v) => /^\d{1,9}(\.\d{1,2})?$/.test(v) && Number(v) > 0, "Enter the amount, for example 25000"),
  description: z.string().trim().max(300),
});

export async function addSalary(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const p = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_salary", {
    p_profile: p.data.profile, p_pay_date: p.data.pay_date, p_amount: Number(p.data.amount), p_pay_type: p.data.pay_type, p_description: p.data.description,
  });
  if (error) return { error: /already recorded|employee details|above zero/.test(error.message) ? error.message : "Could not save the entry" };
  revalidatePath("/hr/payroll");
  return { ok: "Saved" };
}
