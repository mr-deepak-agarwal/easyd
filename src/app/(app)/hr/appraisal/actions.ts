"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { computeScore, type Raw } from "@/lib/score";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

const rating = z.string().regex(/^[1-5]$/, "Give every rating from 1 to 5").transform(Number);
const reviewSchema = z.object({
  project: z.string().regex(/^\d+$/, "Choose the project").transform(Number),
  followup: rating, ownership: rating, accuracy: rating, enthusiasm: rating, detail: rating,
  comments: z.string().trim().max(1000, "Keep the comments under 1000 characters"),
});

export async function submitReview(profileId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin", "teamlead", "teamlead2"]);
  const p = reviewSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_profile: profileId, p_project: p.data.project, p_followup: p.data.followup, p_ownership: p.data.ownership,
    p_accuracy: p.data.accuracy, p_enthusiasm: p.data.enthusiasm, p_detail: p.data.detail, p_comments: p.data.comments,
  });
  if (error) return { error: /You |That |Only |Every /.test(error.message) ? error.message : "Could not save the review" };
  revalidatePath(`/hr/appraisal/${profileId}`);
  return { ok: "Review saved. Reviewing again this month replaces it." };
}

export async function saveWeights(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const keys = ["ontime", "discipline", "match", "attendance", "reviews"];
  const w: Record<string, number> = {};
  for (const k of keys) {
    const v = String(formData.get(k) ?? "").trim();
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(v)) return { error: "Enter every weight as a number from 0 to 100" };
    w[k] = Number(v);
  }
  const total = Object.values(w).reduce((s, x) => s + x, 0);
  if (Math.round(total * 100) !== 10000) return { error: `The weights must add up to 100 (they add up to ${Math.round(total * 100) / 100})` };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_score_weights", { p_weights: w });
  if (error) return { error: "Could not save the weights" };
  revalidatePath("/hr/appraisal");
  return { ok: "Weights saved" };
}

// ---------------------------------------------------------------- cycles

export async function createCycle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const p = z.object({ name: z.string().trim().min(1, "Enter a name for the cycle").max(100), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the first day"), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the last day") })
    .safeParse({ name: formData.get("name"), from: formData.get("from"), to: formData.get("to") });
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.to < p.data.from) return { error: "The last day cannot be before the first day" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_appraisal_cycle", { p_name: p.data.name, p_from: p.data.from, p_to: p.data.to });
  if (error || !data) return { error: "Could not create the cycle" };
  redirect(`/hr/appraisal/cycles/${data}`);
}

/** Freezes everyone's score for the cycle's period. */
export async function closeCycle(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: cycle } = await supabase.from("appraisal_cycles").select("period_from, period_to, status").eq("id", id).maybeSingle();
  if (!cycle || cycle.status !== "open") return { error: "This cycle is already closed" };
  const [{ data: people }, { data: wRows }] = await Promise.all([
    supabase.from("profiles").select("id").eq("active", true).neq("role", "admin"),
    supabase.from("score_weights").select("key, weight"),
  ]);
  const weights = Object.fromEntries((wRows ?? []).map((w) => [w.key, Number(w.weight)]));
  const results = [];
  for (const p of people ?? []) {
    const { data } = await supabase.rpc("employee_scorecard", { p_profile: p.id, p_from: cycle.period_from, p_to: cycle.period_to });
    if (!data?.[0]) continue;
    const raw = data[0] as unknown as Raw;
    const s = computeScore(raw, weights);
    results.push({ profile_id: p.id, total: s.total, band: s.band, parts: s.parts, weights, review_count: raw.review_count });
  }
  const { error } = await supabase.rpc("close_appraisal_cycle", { p_cycle: id, p_results: results });
  if (error) return { error: "Could not close the cycle" };
  revalidatePath(`/hr/appraisal/cycles/${id}`); revalidatePath("/hr/appraisal/cycles");
  return { ok: `Closed. ${results.length} scores are now frozen.` };
}

export async function rateResult(resultId: number, cycleId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const p = z.object({ rating: z.string().regex(/^[1-5]$/, "Choose a final rating").transform(Number), remark: z.string().trim().max(1000, "Keep the remark under 1000 characters") })
    .safeParse({ rating: formData.get("rating"), remark: formData.get("remark") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_appraisal_result", { p_result: resultId, p_rating: p.data.rating, p_remark: p.data.remark });
  if (error) return { error: /acknowledged/.test(error.message) ? error.message : "Could not save the rating" };
  revalidatePath(`/hr/appraisal/cycles/${cycleId}`);
  return { ok: "Saved" };
}

export async function publishCycle(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_appraisal_cycle", { p_cycle: id });
  if (error) return { error: /final rating|Close the cycle/.test(error.message) ? error.message : "Could not publish" };
  revalidatePath(`/hr/appraisal/cycles/${id}`); revalidatePath("/hr/appraisal/cycles");
  return { ok: "Published. Employees can now read their results." };
}

export async function acknowledgeResult(resultId: number, profileId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin", "bd", "teamlead", "teamlead2", "employee"]);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("acknowledge_appraisal", { p_result: resultId, p_comment: comment });
  if (error) return { error: "This result cannot be acknowledged" };
  revalidatePath(`/hr/appraisal/${profileId}`);
  return { ok: "Thank you. Your acknowledgement is recorded." };
}
