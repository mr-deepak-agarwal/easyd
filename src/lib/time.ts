export const NON_CHARGEABLE = [
  "Marketing/ Business Development", "Internal Research Reports", "Exhibitions/Events/Conferences", "Trainings",
  "Admin/HR Activity", "Field Visits (BD Team Only)", "Idle", "Others",
] as const;

/** Hours and minutes typed on the form to total minutes (the database stores minutes). */
export function toMinutes(hours: unknown, minutes: unknown): number {
  const n = (v: unknown) => { const x = typeof v === "number" ? v : parseInt(String(v ?? "").trim() || "0", 10); return Number.isFinite(x) ? x : NaN; };
  const h = n(hours), m = n(minutes);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/** 150 -> "2h 30m" */
export function formatMinutes(total: number): string {
  const t = Math.max(0, Math.round(total));
  return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, "0")}m`;
}
