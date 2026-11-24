import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "./progress";

const FILTERS = [["open", "Open"], ["closed", "Closed"]] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const user = await requireUser();
  const sp = await searchParams;
  const show = one(sp.show) === "closed" ? "closed" : "open";
  const q = one(sp.q).trim();
  const supabase = await createClient();
  let query = supabase.from("projects")
    .select("id, name, status, percent_complete, start_date, end_date, clients(firm_name), leader:leader_id(name), project_team(count)")
    .eq("status", show === "closed" ? "closed" : "approved").order("id", { ascending: false }).limit(500);
  if (q) query = query.ilike("name", `%${q.replace(/[%_\\,()]/g, " ")}%`);
  const { data: projects } = await query;

  return (
    <div className="space-y-5">
      <PageHeader title="Projects" description={MGMT_ROLES.includes(user.role) ? "All projects" : "Projects you are part of"}>
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/projects?show=${k}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${k === show ? "border-brand bg-brand text-white" : "border-border bg-card hover:bg-raised"}`}>{label}</Link>
        ))}
        {MGMT_ROLES.includes(user.role) && <Link href="/projects/new" className="rounded-md bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90">New project</Link>}
      </PageHeader>
      <form className="flex gap-2">
        <input type="hidden" name="show" value={show} />
        <Input name="q" defaultValue={q} placeholder="Search by project name" className="max-w-sm" aria-label="Search by project name" />
        <SubmitButton variant="secondary">Search</SubmitButton>
      </form>
      <Table>
        <thead><tr><Th>Project</Th><Th>Client</Th><Th>Leader</Th><Th>Team</Th><Th>Start</Th><Th>Deadline</Th><Th>Progress</Th></tr></thead>
        <tbody>
          {projects?.length ? projects.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/projects/${p.id}`} className="font-medium text-brand hover:underline">{p.name}</Link>{p.status === "closed" && <> <Badge>Closed</Badge></>}</Td>
              <Td>{p.clients?.firm_name ?? "-"}</Td>
              <Td>{(p.leader as { name: string } | null)?.name ?? "-"}</Td>
              <Td>{p.project_team?.[0]?.count ?? 0}</Td>
              <Td>{formatDate(p.start_date)}</Td><Td>{formatDate(p.end_date)}</Td>
              <Td><Progress value={Number(p.percent_complete)} /></Td>
            </tr>
          )) : <EmptyRow cols={7} text={show === "closed" ? "No closed projects" : "No open projects"} />}
        </tbody>
      </Table>
    </div>
  );
}
