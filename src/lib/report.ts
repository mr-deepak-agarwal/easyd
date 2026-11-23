export type EfficiencyInput = { est_hours: number | string; actual_minutes: number | string; rate: number | string };

/** Per team member on a project: planned vs actual hours and what each costs at the member's grade rate. */
export function efficiencyRow(r: EfficiencyInput) {
  const est = Number(r.est_hours) || 0, rate = Number(r.rate) || 0;
  const actualHours = (Number(r.actual_minutes) || 0) / 60;
  const estCost = est * rate, actualCost = actualHours * rate;
  return { estHours: est, actualHours, estCost, actualCost, saving: estCost - actualCost, over: actualHours > est };
}

export function sumEfficiency(rows: EfficiencyInput[]) {
  return rows.map(efficiencyRow).reduce(
    (t, x) => ({ estHours: t.estHours + x.estHours, actualHours: t.actualHours + x.actualHours, estCost: t.estCost + x.estCost, actualCost: t.actualCost + x.actualCost, saving: t.saving + x.saving }),
    { estHours: 0, actualHours: 0, estCost: 0, actualCost: 0, saving: 0 });
}

/** First and last day of the current month as YYYY-MM-DD, from a YYYY-MM-DD "today". */
export function monthRange(today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  return { from: `${y}-${String(m).padStart(2, "0")}-01`, to: `${y}-${String(m).padStart(2, "0")}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}` };
}

/** A cell for a CSV export. Values that start like a formula are prefixed so Excel shows them as text. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
