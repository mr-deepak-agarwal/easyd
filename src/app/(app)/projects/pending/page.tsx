import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { SubmitButton } from "@/components/ui/submit-button";
import { decideProject } from "../actions";

export default async function PendingProjectsPage() {
  const user = await requireRole(MGMT_ROLES);
  const canDecide = user.role === "admin" || user.role === "teamlead2";
  const supabase = await createClient();
  const { data } = await supabase.from("projects")
    .select("id, name, description, created_at, clients(firm_name), departments(name), project_type, creator:created_by(name)")
    .eq("status", "pending").order("id", { ascending: false }).limit(300);
  return (
    <div className="space-y-5">
      <PageHeader title="Pending projects" description={canDecide ? "Approve or reject projects waiting for a decision" : "Projects waiting for admin or teamlead2 approval"} />
      <Table>
        <thead><tr><Th>Project</Th><Th>Client</Th><Th>Department</Th><Th>Type</Th><Th>Opened</Th><Th>By</Th><Th /></tr></thead>
        <tbody>
          {data?.length ? data.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/projects/${p.id}`} className="font-medium text-brand hover:underline">{p.name}</Link>
                {p.description && <div className="max-w-md truncate text-xs text-muted">{p.description}</div>}</Td>
              <Td>{p.clients?.firm_name ?? "-"}</Td><Td>{p.departments?.name ?? "-"}</Td><Td>{p.project_type ?? "-"}</Td>
              <Td>{formatDate(p.created_at)}</Td><Td>{(p.creator as { name: string } | null)?.name ?? "-"}</Td>
              <Td>
                {canDecide && (
                  <div className="flex gap-2">
                    <form action={decideProject.bind(null, p.id, true)}><SubmitButton confirm="Approve this project?">Approve</SubmitButton></form>
                    <form action={decideProject.bind(null, p.id, false)}><SubmitButton variant="danger" confirm="Reject this project?">Reject</SubmitButton></form>
                  </div>
                )}
              </Td>
            </tr>
          )) : <EmptyRow cols={7} text="Nothing is waiting for approval" />}
        </tbody>
      </Table>
    </div>
  );
}
