"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";

export type Hit = { kind: "Task" | "Project" | "Client" | "Lead" | "Invoice"; label: string; sub: string; href: string };

// % and _ are wildcards in LIKE; people typing them mean the characters.
const like = (t: string) => `%${t.replace(/[\\%_]/g, (c) => "\\" + c)}%`;

/** Finds records by name for the command palette. Runs as the signed-in user, so row security decides what each person can see. */
export async function searchAll(raw: string): Promise<Hit[]> {
  await requireUser();
  const q = raw.trim().slice(0, 60);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const p = like(q);
  const [tasks, projects, clients, leads, invoices] = await Promise.all([
    supabase.from("tasks").select("id, title, status, projects(name)").ilike("title", p).order("id", { ascending: false }).limit(4),
    supabase.from("projects").select("id, name, status, clients(firm_name)").ilike("name", p).order("id", { ascending: false }).limit(4),
    supabase.from("clients").select("id, firm_name, sector").ilike("firm_name", p).limit(4),
    supabase.from("leads").select("id, name, service").ilike("name", p).limit(3),
    supabase.from("invoices").select("id, invoice_no, invoice_type, projects(name)").ilike("invoice_no", p).is("deleted_at", null).order("id", { ascending: false }).limit(3),
  ]);
  const hits: Hit[] = [];
  for (const t of tasks.data ?? []) hits.push({ kind: "Task", label: t.title, sub: `${t.status === "completed" ? "Done · " : ""}${(t.projects as { name: string | null } | null)?.name ?? "No project"}`, href: `/tasks/${t.id}` });
  for (const r of projects.data ?? []) hits.push({ kind: "Project", label: r.name ?? "Untitled", sub: (r.clients as { firm_name: string | null } | null)?.firm_name ?? r.status, href: `/projects/${r.id}` });
  for (const c of clients.data ?? []) hits.push({ kind: "Client", label: c.firm_name ?? "Unnamed", sub: c.sector ?? "Client", href: `/crm/clients/${c.id}` });
  for (const l of leads.data ?? []) hits.push({ kind: "Lead", label: l.name, sub: l.service ?? "Lead", href: `/crm/leads/${l.id}` });
  for (const i of invoices.data ?? []) hits.push({ kind: "Invoice", label: i.invoice_no, sub: `${i.invoice_type} · ${(i.projects as { name: string | null } | null)?.name ?? ""}`, href: `/invoices/${i.id}` });
  return hits;
}
