"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { parseCsv } from "@/lib/csv";
import { daysInMonth } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";

const MAX_BYTES = 2 * 1024 * 1024;
const schema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

/**
 * CSV layout (same as the old app): first row is a header and is skipped; first column is the
 * employee's name; the next columns are the status for day 1, 2, 3 ... of the chosen month.
 * Days that already have a record are left untouched and reported.
 */
export async function uploadAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["admin"]);
  const parsed = schema.safeParse({ month: formData.get("month"), year: formData.get("year") });
  if (!parsed.success) return { error: "Choose a month and year" };
  const { month, year } = parsed.data;

  const file = formData.get("sheet");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file" };
  if (file.size > MAX_BYTES) return { error: "The file is larger than 2 MB" };
  if (!/\.csv$/i.test(file.name)) return { error: "Please upload a .csv file" };

  const rows = parseCsv(await file.text()).slice(1); // skip the header row
  if (!rows.length) return { error: "The file has no attendance rows" };

  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id, name");
  const byName = new Map<string, string[]>();
  for (const p of people ?? []) {
    const key = p.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), p.id]);
  }

  const days = daysInMonth(year, month);
  const mm = String(month).padStart(2, "0");
  const wanted: { profile_id: string; work_date: string; status: string; added_by: string }[] = [];
  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const row of rows) {
    const name = (row[0] ?? "").trim();
    if (!name) continue;
    const ids = byName.get(name.toLowerCase());
    if (!ids) { unmatched.push(name); continue; }
    if (ids.length > 1) { ambiguous.push(name); continue; }
    for (let d = 1; d <= days; d++) {
      const status = (row[d] ?? "").trim().slice(0, 20);
      if (status) wanted.push({ profile_id: ids[0], work_date: `${year}-${mm}-${String(d).padStart(2, "0")}`, status, added_by: user.id });
    }
  }

  // Skip days that already have a record.
  const { data: existing } = await supabase.from("attendance").select("profile_id, work_date")
    .gte("work_date", `${year}-${mm}-01`).lte("work_date", `${year}-${mm}-${String(days).padStart(2, "0")}`);
  const have = new Set((existing ?? []).map((e) => `${e.profile_id}|${e.work_date}`));
  const fresh = wanted.filter((w) => !have.has(`${w.profile_id}|${w.work_date}`));

  for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await supabase.from("attendance").insert(fresh.slice(i, i + 500));
    if (error) return { error: "Could not save the attendance. Nothing after the failure was recorded." };
  }

  revalidatePath("/hr/attendance");
  const parts = [`${fresh.length} day records saved`];
  if (wanted.length - fresh.length) parts.push(`${wanted.length - fresh.length} skipped (already recorded)`);
  if (unmatched.length) parts.push(`names not found: ${unmatched.slice(0, 8).join(", ")}${unmatched.length > 8 ? "..." : ""}`);
  if (ambiguous.length) parts.push(`name matches more than one employee: ${ambiguous.slice(0, 5).join(", ")}`);
  return { ok: parts.join(". ") + "." };
}
