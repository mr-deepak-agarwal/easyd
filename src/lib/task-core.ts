// Task workflow stages and filter parsing, shared by the server pages and the client board.
export const STAGES = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "review", label: "In review" },
  { key: "done", label: "Done" },
] as const;
export type StageKey = (typeof STAGES)[number]["key"];
export const isStage = (v: unknown): v is StageKey => STAGES.some((s) => s.key === v);
export const stageLabel = (k: string) => STAGES.find((s) => s.key === k)?.label ?? k;

export const REPEATS = [["", "Does not repeat"], ["daily", "Every day"], ["weekly", "Every week"], ["monthly", "Every month"]] as const;
export const repeatLabel = (r: string | null) => REPEATS.find(([k]) => k === r)?.[1] ?? "";

export type TaskFilters = { show: "open" | "completed"; view: "board" | "list" | "timeline"; group: "status" | "due"; who: "all" | "me"; due: "any" | "overdue" | "today" | "week" | "none"; project: number | null; q: string; from: string };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(v: string, allowed: readonly T[], fallback: T): T => (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

export function parseFilters(sp: Record<string, string | string[] | undefined>): TaskFilters {
  const project = Number(one(sp.project));
  return {
    show: pick(one(sp.show), ["open", "completed"] as const, "open"),
    view: pick(one(sp.view), ["board", "list", "timeline"] as const, "board"),
    group: pick(one(sp.group), ["status", "due"] as const, "status"),
    who: pick(one(sp.who), ["all", "me"] as const, "all"),
    due: pick(one(sp.due), ["any", "overdue", "today", "week", "none"] as const, "any"),
    project: Number.isInteger(project) && project > 0 ? project : null,
    q: one(sp.q).trim().slice(0, 60),
    from: /^\d{4}-\d{2}-\d{2}$/.test(one(sp.from)) ? one(sp.from) : "",
  };
}

/** The query string for a filter set, leaving out anything that is the default. */
export function filterQuery(f: Partial<TaskFilters>): string {
  const p = new URLSearchParams();
  if (f.view && f.view !== "board") p.set("view", f.view);
  if (f.show && f.show !== "open") p.set("show", f.show);
  if (f.group && f.group !== "status") p.set("group", f.group);
  if (f.who && f.who !== "all") p.set("who", f.who);
  if (f.due && f.due !== "any") p.set("due", f.due);
  if (f.project) p.set("project", String(f.project));
  if (f.q) p.set("q", f.q);
  if (f.from) p.set("from", f.from);
  return p.toString();
}

/** Only the filter keys, so a saved view cannot carry anything else. */
export function cleanViewQuery(raw: string): string {
  const p = new URLSearchParams(raw);
  return filterQuery(parseFilters(Object.fromEntries(p.entries())));
}

export const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
/** Monday on or before the date. */
export const weekStart = (d: string) => { const dow = new Date(d + "T00:00:00Z").getUTCDay(); return addDays(d, -((dow + 6) % 7)); };
