// Employee score: how each part is worked out from the numbers employee_scorecard() returns.
// A part with nothing to judge (no tasks due, no reviews yet...) is "n/a" and its weight is shared
// among the other parts, so a new joiner is not marked down for what has not happened yet.

export type Raw = {
  tasks_due: number; tasks_on_time: number; milestones_due: number; milestones_on_time: number;
  working_days: number; attendance_rows: number; present_days: number; logged_days: number;
  assigned_minutes: number | string; unassigned_minutes: number | string; nonchargeable_minutes: number | string; idle_projects: number;
  review_count: number; review_avg: number | string | null;
};
export type Weights = Record<string, number>;
export const PARTS = ["ontime", "discipline", "match", "attendance", "reviews"] as const;
export type Part = (typeof PARTS)[number];

export type PartScore = { key: Part; score: number | null; detail: string };
export type Band = "Excellent" | "Good" | "Needs improvement" | "Poor";
export type Result = { parts: PartScore[]; total: number | null; band: Band | null; coverage: number };

const pct = (num: number, den: number) => (den > 0 ? Math.max(0, Math.min(100, (num / den) * 100)) : null);
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const round1 = (v: number) => Math.round(v * 10) / 10;

export function bandFor(total: number): Band {
  return total >= 85 ? "Excellent" : total >= 70 ? "Good" : total >= 50 ? "Needs improvement" : "Poor";
}

export function scoreParts(r: Raw): PartScore[] {
  const due = n(r.tasks_due) + n(r.milestones_due), onTime = n(r.tasks_on_time) + n(r.milestones_on_time);
  const assigned = n(r.assigned_minutes), unassigned = n(r.unassigned_minutes);
  const attendanceKnown = n(r.attendance_rows) > 0;
  const reviewAvg = r.review_avg === null || r.review_avg === undefined ? null : n(r.review_avg);
  return [
    { key: "ontime", score: pct(onTime, due), detail: due ? `${onTime} of ${due} tasks and milestones finished by their date` : "No tasks or milestones came due" },
    { key: "discipline", score: attendanceKnown ? pct(n(r.logged_days), n(r.present_days)) : null,
      detail: attendanceKnown && n(r.present_days) ? `Logged a full day on ${n(r.logged_days)} of ${n(r.present_days)} days present` : "No attendance recorded to compare with" },
    { key: "match", score: pct(assigned, assigned + unassigned),
      detail: assigned + unassigned ? `${Math.round(pct(assigned, assigned + unassigned) ?? 0)}% of project time is on projects they are assigned to` : "No project time logged" },
    { key: "attendance", score: attendanceKnown ? pct(n(r.present_days), n(r.working_days)) : null,
      detail: attendanceKnown && n(r.working_days) ? `Present on ${n(r.present_days)} of ${n(r.working_days)} working days` : "No attendance recorded" },
    { key: "reviews", score: n(r.review_count) > 0 && reviewAvg !== null ? Math.max(0, Math.min(100, ((reviewAvg - 1) / 4) * 100)) : null,
      detail: n(r.review_count) > 0 && reviewAvg !== null ? `${reviewAvg.toFixed(1)} out of 5 from ${n(r.review_count)} review${n(r.review_count) === 1 ? "" : "s"}` : "No team lead review yet" },
  ];
}

export function computeScore(r: Raw, weights: Weights): Result {
  const parts = scoreParts(r);
  let sum = 0, w = 0;
  for (const p of parts) {
    const wt = n(weights[p.key]);
    if (p.score !== null && wt > 0) { sum += wt * p.score; w += wt; }
  }
  if (w === 0) return { parts, total: null, band: null, coverage: 0 };
  const total = round1(sum / w);
  const all = PARTS.reduce((s, k) => s + n(weights[k]), 0);
  return { parts, total, band: bandFor(total), coverage: all > 0 ? Math.round((w / all) * 100) : 0 };
}

/** Last three whole months ending today, as the default period of a scorecard. */
export function defaultPeriod(today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1 - 2, 1));
  return { from: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-01`, to: today };
}
