import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { MGMT_ROLES, INVOICE_VIEWERS, INVOICE_EDITORS } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "../progress";
import { Overview, Team, Milestones, Tasks, Files, Meetings, Forum, Costing, ProjectInvoices } from "./sections";

const STATUS_TONE = { pending: "amber", approved: "green", rejected: "red", closed: "grey" } as const;
const STATUS_LABEL = { pending: "Pending approval", approved: "Open", rejected: "Rejected", closed: "Closed" } as const;
const TABS = [["overview", "Overview"], ["team", "Team"], ["milestones", "Milestones"], ["tasks", "Tasks"], ["files", "Documents"], ["meetings", "Meetings"], ["forum", "Forum"], ["costing", "Costing"], ["invoices", "Invoices"]] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) notFound();
  const sp = await searchParams;

  const supabase = await createClient();
  const [{ data: project }, { data: manage }] = await Promise.all([
    supabase.from("projects").select("*, clients(id, firm_name), leader:leader_id(name)").eq("id", projectId).maybeSingle(),
    supabase.rpc("can_manage_project", { pid: projectId }),
  ]);
  if (!project) notFound();

  const isMgmt = MGMT_ROLES.includes(user.role);
  const started = project.status === "approved" || project.status === "closed";
  const tabs = TABS.filter(([k]) => (k === "overview" || started) && (k !== "costing" || isMgmt) && (k !== "invoices" || INVOICE_VIEWERS.includes(user.role)));
  const tab = tabs.some(([k]) => k === one(sp.tab)) ? one(sp.tab) : "overview";
  const canManage = manage === true;
  const editable = canManage && project.status === "approved";
  const status = project.status as keyof typeof STATUS_TONE;

  return (
    <div className="space-y-5">
      <PageHeader title={project.name ?? "Project"} description={project.clients?.firm_name ?? undefined}>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
        <Link href="/projects" className="text-sm text-brand hover:underline">All projects</Link>
      </PageHeader>
      {started && <div className="max-w-md"><Progress value={Number(project.percent_complete)} /></div>}
      <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Project sections">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/projects/${projectId}?tab=${k}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === k ? "border-brand font-medium text-brand" : "border-transparent text-muted hover:text-foreground"}`}>{label}</Link>
        ))}
      </nav>
      {tab === "overview" && <Overview project={project} editable={editable} />}
      {tab === "team" && <Team projectId={projectId} editable={editable} />}
      {tab === "milestones" && <Milestones projectId={projectId} editable={editable} />}
      {tab === "tasks" && <Tasks projectId={projectId} open={project.status === "approved"} />}
      {tab === "files" && <Files projectId={projectId} canManage={canManage} open={project.status === "approved"} />}
      {tab === "meetings" && <Meetings projectId={projectId} open={project.status === "approved"} />}
      {tab === "forum" && <Forum projectId={projectId} open={project.status === "approved"} currentUserId={user.id} />}
      {tab === "costing" && isMgmt && <Costing projectId={projectId} />}
      {tab === "invoices" && INVOICE_VIEWERS.includes(user.role) && <ProjectInvoices projectId={projectId} canCreate={INVOICE_EDITORS.includes(user.role) && project.status === "approved"} />}
    </div>
  );
}
