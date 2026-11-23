import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/session";
import { clip } from "@/lib/ai-core";
import { computeScore, defaultPeriod, type Raw } from "@/lib/score";
import { todayIST } from "@/lib/dates";
import type { Tool } from "@/lib/ai";

type Sb = Awaited<ReturnType<typeof createClient>>;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const safeLike = (v: string) => v.replace(/[%_,()\\]/g, " ").trim();

/**
 * Read-only tools the assistant can use. Every one runs as the signed-in person through the normal
 * database rules, so it can only see what that person could already see in the app.
 */
export const TOOLS: Tool[] = [
  { name: "find_person", description: "Find colleagues by (part of) name. Returns name, role and employee id.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "list_projects", description: "List projects the person can see, with client, status and dates. Optional text search on project or client name.", input_schema: { type: "object", properties: { search: { type: "string" } } } },
  { name: "project_profitability", description: "Profit report per project (quoted, invoiced, collected, time cost, expenses, overheads, hours). Admin and teamlead2 only. Dates are optional YYYY-MM-DD.", input_schema: { type: "object", properties: { project_search: { type: "string" }, from: { type: "string" }, to: { type: "string" } } } },
  { name: "overdue_tasks", description: "Tasks that are past their end date and not completed, with who is responsible. Optional filter by person name.", input_schema: { type: "object", properties: { person: { type: "string" } } } },
  { name: "employee_time_on_projects", description: "Hours one person logged per project in a date range, against the hours planned for them.", input_schema: { type: "object", properties: { person: { type: "string" }, from: { type: "string" }, to: { type: "string" } }, required: ["person", "from", "to"] } },
  { name: "employee_score", description: "Appraisal score breakdown for one person over a date range (default last 3 months). Only for the person themselves or team leads and admin.", input_schema: { type: "object", properties: { person: { type: "string" }, from: { type: "string" }, to: { type: "string" } }, required: ["person"] } },
  { name: "list_invoices", description: "Invoices (number, type, date, project, confirmed) in a date range. Admin, bd and teamlead2 only.", input_schema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } } } },
];

async function person(sb: Sb, name: string): Promise<{ id: string; name: string } | string> {
  const n = safeLike(name);
  if (!n) return "No name given";
  const { data } = await sb.from("profiles").select("id, name").eq("active", true).ilike("name", `%${n}%`).limit(5);
  if (!data?.length) return `No active person matches "${n}"`;
  if (data.length > 1) return `More than one match: ${data.map((d) => d.name).join(", ")}. Ask which one.`;
  return data[0];
}

export async function runTool(sb: Sb, user: SessionUser, name: string, input: Record<string, unknown>): Promise<string> {
  const out = (v: unknown) => JSON.stringify(v);
  const today = todayIST();
  switch (name) {
    case "find_person": {
      const n = safeLike(str(input.name));
      const { data } = await sb.from("profiles").select("name, role, empid").eq("active", true).ilike("name", `%${n}%`).limit(10);
      return out(data ?? []);
    }
    case "list_projects": {
      const { data } = await sb.from("projects").select("id, name, status, start_date, end_date, clients(firm_name)").in("status", ["approved", "closed"]).order("name").limit(300);
      const s = str(input.search).toLowerCase();
      const rows = (data ?? []).map((p) => ({ id: p.id, name: p.name, client: (p.clients as { firm_name: string | null } | null)?.firm_name, status: p.status, start: p.start_date, end: p.end_date }))
        .filter((p) => !s || `${p.name} ${p.client}`.toLowerCase().includes(s));
      return out(clip(rows));
    }
    case "project_profitability": {
      const { data, error } = await sb.rpc("report_profitability", { p_from: isDate(input.from) ? input.from : null, p_to: isDate(input.to) ? input.to : null });
      if (error) return out({ error: "You do not have access to profitability figures." });
      const s = str(input.project_search).toLowerCase();
      const rows = (data ?? []).filter((r) => !s || `${r.project_name} ${r.client_name}`.toLowerCase().includes(s))
        .filter((r) => Number(r.invoiced) || Number(r.minutes) || Number(r.reimbursements))
        .map((r) => {
          const hours = Number(r.minutes) / 60, overhead = hours * Number(r.overhead_rate);
          const cost = Number(r.labour_cost) + Number(r.reimbursements) + overhead;
          return { project: r.project_name, client: r.client_name, quoted: r.quoted, invoiced: r.invoiced, collected: r.collected, time_cost: r.labour_cost, expenses: r.reimbursements, overheads: Math.round(overhead), profit: Math.round(Number(r.invoiced) - cost), hours: Math.round(hours * 10) / 10 };
        });
      return out(clip(rows));
    }
    case "overdue_tasks": {
      const { data } = await sb.from("tasks").select("id, title, ends_on, projects(name), task_participants(is_responsible, profiles(name))").eq("status", "created").lt("ends_on", today).order("ends_on").limit(200);
      const p = str(input.person).toLowerCase();
      const rows = (data ?? []).map((t) => ({ id: t.id, title: t.title, due: t.ends_on, project: (t.projects as { name: string | null } | null)?.name ?? null,
        responsible: (t.task_participants as { is_responsible: boolean; profiles: { name: string } | null }[]).filter((x) => x.is_responsible).map((x) => x.profiles?.name) }))
        .filter((t) => !p || t.responsible.some((n) => n?.toLowerCase().includes(p)));
      return out(clip(rows));
    }
    case "employee_time_on_projects": {
      const who = await person(sb, str(input.person));
      if (typeof who === "string") return out({ error: who });
      if (!isDate(input.from) || !isDate(input.to)) return out({ error: "from and to must be dates like 2026-10-01" });
      const { data, error } = await sb.rpc("report_employee_efficiency", { p_profile: who.id, p_from: input.from, p_to: input.to });
      if (error) return out({ error: "You may not see this person's time." });
      return out({ person: who.name, projects: (data ?? []).map((r) => ({ project: r.project_name, client: r.client_name, planned_hours: Number(r.est_hours), logged_hours: Math.round(Number(r.actual_minutes) / 6) / 10 })) });
    }
    case "employee_score": {
      const who = await person(sb, str(input.person));
      if (typeof who === "string") return out({ error: who });
      const d = defaultPeriod(today);
      const from = isDate(input.from) ? input.from : d.from, to = isDate(input.to) ? input.to : d.to;
      const [{ data, error }, { data: w }] = await Promise.all([sb.rpc("employee_scorecard", { p_profile: who.id, p_from: from, p_to: to }), sb.from("score_weights").select("key, weight")]);
      if (error || !data?.[0]) return out({ error: "You may not see this person's score." });
      const s = computeScore(data[0] as unknown as Raw, Object.fromEntries((w ?? []).map((x) => [x.key, Number(x.weight)])));
      return out({ person: who.name, from, to, total: s.total, band: s.band, parts: s.parts.map((p) => ({ part: p.key, score: p.score === null ? null : Math.round(p.score), detail: p.detail })) });
    }
    case "list_invoices": {
      let q = sb.from("invoices").select("invoice_no, invoice_type, invoice_date, confirmed, projects(name)").is("deleted_at", null).order("invoice_date", { ascending: false }).limit(100);
      if (isDate(input.from)) q = q.gte("invoice_date", input.from);
      if (isDate(input.to)) q = q.lte("invoice_date", input.to);
      const { data, error } = await q;
      if (error || (data ?? []).length === 0 && !["admin", "bd", "teamlead2"].includes(user.role)) return out({ error: "You do not have access to invoices." });
      return out(clip((data ?? []).map((i) => ({ number: i.invoice_no, type: i.invoice_type, date: i.invoice_date, paid_confirmed: i.confirmed, project: (i.projects as { name: string | null } | null)?.name }))));
    }
    default:
      return out({ error: "Unknown tool" });
  }
}
