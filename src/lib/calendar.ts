export type CalEvent = { kind: "holiday" | "leave" | "meeting" | "project" | "task" | "birthday"; label: string; href?: string };
export type RangeEvent = CalEvent & { from: string; to: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11" -> { year, month } (month 1-12), falling back to the given default for anything malformed. */
export function parseMonth(value: string | undefined, fallback: { year: number; month: number }) {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return fallback;
  const year = Number(m[1]), month = Number(m[2]);
  return month >= 1 && month <= 12 && year >= 2000 && year <= 2100 ? { year, month } : fallback;
}

export function shiftMonth(year: number, month: number, by: number) {
  const idx = year * 12 + (month - 1) + by;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;

/** The weeks of a month as rows of 7 cells (Monday first); days outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** Spreads events that cover a range of dates onto each day of the month. */
export function eventsByDay(year: number, month: number, events: RangeEvent[]): Map<string, CalEvent[]> {
  const out = new Map<string, CalEvent[]>();
  const first = `${year}-${pad(month)}-01`;
  const last = `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`;
  for (const { from, to, ...ev } of events) {
    const start = from < first ? first : from;
    const end = to > last ? last : to;
    for (let d = new Date(`${start}T00:00:00Z`); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      out.set(key, [...(out.get(key) ?? []), ev]);
    }
  }
  return out;
}
