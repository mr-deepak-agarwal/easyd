"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { COSTING_ROLES } from "@/lib/roles";
import { computeCosting } from "@/lib/costing";
import type { ActionState } from "@/lib/action-state";

const money = z.string().trim().regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount such as 1500 or 1500.50").transform(Number);

export async function addGrade(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(COSTING_ROLES);
  const parsed = z.object({ grade: z.string().trim().min(1, "Enter a grade name").max(100), cost: money })
    .safeParse({ grade: formData.get("grade"), cost: formData.get("cost") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("costing_grades").insert({ ...parsed.data, created_by: user.id, created_at: new Date().toISOString() });
  if (error) return { error: "Could not save the grade" };
  revalidatePath("/projects/grades");
  return { ok: "Grade added" };
}

export async function updateGradeCost(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(COSTING_ROLES);
  const parsed = money.safeParse(formData.get("cost"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("costing_grades").update({ cost: parsed.data }).eq("id", id);
  if (error) return { error: "Could not update the grade" };
  revalidatePath("/projects/grades");
  return { ok: "Saved" };
}

export async function setGradeActive(id: number, active: boolean): Promise<void> {
  await requireRole(COSTING_ROLES);
  const supabase = await createClient();
  await supabase.from("costing_grades").update({ active }).eq("id", id);
  revalidatePath("/projects/grades");
}

export async function setOverhead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(COSTING_ROLES);
  const parsed = money.safeParse(formData.get("cost"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("overheads").insert({ cost: parsed.data, created_by: user.id, created_at: new Date().toISOString() });
  if (error) return { error: "Could not save the overhead" };
  revalidatePath("/projects/overheads");
  return { ok: "Overhead updated" };
}

const lineSchema = z.object({
  gradeId: z.number().int().positive(),
  employees: z.number().int().min(1).max(10000),
  hoursPerEmployee: z.number().min(0.25).max(24),
  days: z.number().int().min(1).max(3650),
});
const saveSchema = z.object({
  target: z.string().regex(/^(lead|project):\d+$/, "Choose a lead or project"),
  overheadHours: z.number().min(0).max(1_000_000),
  factor: z.number().min(0.1).max(100),
  lines: z.array(lineSchema).min(1, "Add at least one grade").max(50),
});

/** Saves a cost estimate. Totals are recomputed here from the database rates, never taken from the browser. */
export async function saveCosting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(COSTING_ROLES);
  let input: unknown;
  try {
    input = {
      target: formData.get("target"), overheadHours: Number(formData.get("overheadHours")), factor: Number(formData.get("factor")),
      lines: JSON.parse(String(formData.get("lines") ?? "[]")),
    };
  } catch { return { error: "Check the costing form" }; }
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { target, overheadHours, factor, lines } = parsed.data;
  const [kind, idStr] = target.split(":");
  const targetId = Number(idStr);

  const supabase = await createClient();
  const table = kind === "lead" ? "leads" : "projects";
  const { data: owner } = await supabase.from(table).select("id, client_id").eq("id", targetId).maybeSingle();
  if (!owner) return { error: "That lead or project was not found" };

  const [{ data: grades }, { data: oh }] = await Promise.all([
    supabase.from("costing_grades").select("id, grade, cost").eq("active", true).in("id", lines.map((l) => l.gradeId)),
    supabase.from("overheads").select("cost").order("id", { ascending: false }).limit(1),
  ]);
  const byId = new Map((grades ?? []).map((g) => [g.id, g]));
  if (lines.some((l) => !byId.has(l.gradeId))) return { error: "A selected grade is no longer available" };
  const overheadRate = Number(oh?.[0]?.cost ?? 0);

  const result = computeCosting(
    lines.map((l) => ({ rate: Number(byId.get(l.gradeId)!.cost), employees: l.employees, hoursPerEmployee: l.hoursPerEmployee, days: l.days })),
    overheadHours, overheadRate, factor);

  const col = kind === "lead" ? "lead_id" : "project_id";
  const { data: previous } = await supabase.from("project_costing").select("id").eq(col, targetId).eq("active", true);
  const now = new Date().toISOString();
  const { error } = await supabase.from("project_costing").insert(lines.map((l, i) => {
    const g = byId.get(l.gradeId)!;
    return {
      lead_id: kind === "lead" ? targetId : null, project_id: kind === "project" ? targetId : null, client_id: owner.client_id, grade_label: g.grade, grade: String(g.cost),
      num_employees: l.employees, total_hours: result.lines[i].hours, overheads: overheadHours, multiply_factor: factor,
      total_cost: result.total, actual_total_cost: result.total, active: true, added_by: user.id, added_at: now,
    };
  }));
  if (error) return { error: "Could not save the costing" };
  if (previous?.length) await supabase.from("project_costing").update({ active: false }).in("id", previous.map((p) => p.id));
  revalidatePath(`/crm/leads/${targetId}`);
  revalidatePath("/projects/cost-analysis");
  return { ok: `Costing saved. Quoted total: Rs ${result.total.toLocaleString("en-IN")}` };
}
