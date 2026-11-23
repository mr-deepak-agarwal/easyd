// Project risk rules. Fixed and explainable: every warning says which number triggered it.
// AI is only used afterwards, to turn these warnings into a short readable summary.

export type RiskInput = {
  project_name: string | null; end_date: string | null;
  planned_hours: number | string; logged_minutes: number | string; progress_pct: number | string;
  milestones_open: number; milestones_overdue: number; tasks_open: number; tasks_overdue: number;
  last_time_entry: string | null; top_overdue_person: string | null; top_overdue_count: number;
};
export type Level = "high" | "medium" | "low";
export type Flag = { level: Level; text: string };

const n = (v: unknown) => Number(v) || 0;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const RANK: Record<Level, number> = { high: 3, medium: 2, low: 1 };

export function assessRisk(r: RiskInput, today: string): { flags: Flag[]; level: Level | null; burnPct: number | null; progressPct: number } {
  const planned = n(r.planned_hours), hours = n(r.logged_minutes) / 60, progress = n(r.progress_pct);
  const burn = planned > 0 ? Math.round((hours / planned) * 100) : null;
  const flags: Flag[] = [];
  if (burn !== null && burn >= 100) flags.push({ level: "high", text: `Hours used up: ${Math.round(hours)} of ${Math.round(planned)} planned (${burn}%)` });
  else if (burn !== null && burn - progress > 25 && burn >= 50) flags.push({ level: "medium", text: `Hours are running ahead of progress: ${burn}% of hours used, ${Math.round(progress)}% of milestones done` });
  if (r.end_date) {
    const left = daysBetween(today, r.end_date);
    if (left < 0) flags.push({ level: "high", text: `Past its end date by ${-left} day${left === -1 ? "" : "s"}` });
    else if (left <= 14 && progress < 70) flags.push({ level: "medium", text: `Ends in ${left} day${left === 1 ? "" : "s"} with only ${Math.round(progress)}% of milestones done` });
  }
  if (r.milestones_overdue > 0) flags.push({ level: r.milestones_overdue >= 3 ? "high" : "medium", text: `${r.milestones_overdue} milestone${r.milestones_overdue === 1 ? "" : "s"} overdue` });
  if (r.tasks_overdue >= 3) flags.push({ level: r.tasks_overdue >= 6 ? "high" : "medium", text: `${r.tasks_overdue} tasks overdue${r.top_overdue_person && r.top_overdue_count >= 2 ? `, ${r.top_overdue_count} of them with ${r.top_overdue_person}` : ""}` });
  else if (r.tasks_overdue > 0) flags.push({ level: "low", text: `${r.tasks_overdue} task${r.tasks_overdue === 1 ? "" : "s"} overdue` });
  if (planned > 0 && (r.tasks_open > 0 || r.milestones_open > 0)) {
    const idle = r.last_time_entry ? daysBetween(r.last_time_entry, today) : null;
    if (idle === null) flags.push({ level: "low", text: "No time has been logged on this project yet" });
    else if (idle >= 14) flags.push({ level: "low", text: `No time logged for ${idle} days` });
  }
  flags.sort((a, b) => RANK[b.level] - RANK[a.level]);
  return { flags, level: flags[0]?.level ?? null, burnPct: burn, progressPct: Math.round(progress) };
}
