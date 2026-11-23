"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optText = z.preprocess(blank, z.string().trim().max(500).optional());
const optDate = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional());

const schema = z.object({
  name: z.string().trim().min(2, "Enter the employee's name").max(100),
  designation: optText, email: optText, contact: optText, address: optText, bank: optText, gender: optText,
  department: optText, supervisor: optText, category: optText, grade: optText, emp_code: optText,
  salary: z.preprocess(blank, z.coerce.number().min(0, "Salary cannot be negative").max(100000000).optional()),
  dob: optDate, join_date: optDate,
});

export async function updateEmployee(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("employee_details").update({
    name: v.name, designation: v.designation ?? null, email: v.email ?? null, contact: v.contact ?? null,
    address: v.address ?? null, bank: v.bank ?? null, gender: v.gender ?? null, department: v.department ?? null,
    supervisor: v.supervisor ?? null, category: v.category ?? null, grade: v.grade ?? null, emp_code: v.emp_code ?? null,
    salary: v.salary ?? null, dob: v.dob ?? null, join_date: v.join_date ?? null,
  }).eq("id", id);
  if (error) return { error: "Could not save the changes" };
  revalidatePath(`/hr/biodata/${id}`);
  revalidatePath("/hr/biodata");
  return { ok: "Details saved" };
}
