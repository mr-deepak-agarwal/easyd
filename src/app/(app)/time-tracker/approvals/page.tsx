import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { formatMinutes } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { approveAll, approveEdit, rejectEdit } from "../actions";

export default async function ApprovalsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const supabase = await createClient();
  const { data: edits } = await supabase.from("time_entry_edits")
    .select("id, entry_date, minutes, work_accomplished, non_chargeable_category, project_id, submitted_at, profiles!time_entry_edits_profile_id_fkey(name), projects(name), time_entries(entry_date, minutes, work_accomplished, non_chargeable_category, projects(name))")
    .order("id");
  const label = (cat: string | null, project: { name: string | null } | null) => project?.name ?? (cat || "-");
  return (
    <div className="space-y-5">
      <PageHeader title={isAdmin ? "Approve edited entries" : "My edit requests"} description="Changes to a logged entry apply only after an admin approves them">
        <Link href="/time-tracker" className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-raised">Back to time tracker</Link>
        {isAdmin && !!edits?.length && <ActionForm action={approveAll} resetOnSuccess={false}><SubmitButton confirm="Approve every pending edit?">Approve all</SubmitButton></ActionForm>}
      </PageHeader>
      <Table>
        <thead><tr><Th>Person</Th><Th>Now</Th><Th>Requested</Th><Th /></tr></thead>
        <tbody>
          {edits?.length ? edits.map((e) => {
            const cur = e.time_entries as { entry_date: string; minutes: number; work_accomplished: string | null; non_chargeable_category: string | null; projects: { name: string | null } | null } | null;
            return (
              <tr key={e.id}>
                <Td>{(e.profiles as { name: string } | null)?.name}</Td>
                <Td className="text-muted">{cur && <>{formatDate(cur.entry_date)} · {formatMinutes(cur.minutes)}<br />{label(cur.non_chargeable_category, cur.projects)}<br /><span className="whitespace-pre-line">{cur.work_accomplished}</span></>}</Td>
                <Td>{formatDate(e.entry_date)} · {e.minutes != null ? formatMinutes(e.minutes) : "-"}<br />{label(e.non_chargeable_category, e.projects as { name: string | null } | null)}<br /><span className="whitespace-pre-line">{e.work_accomplished}</span></Td>
                <Td className="whitespace-nowrap">
                  <div className="flex gap-2">
                    {isAdmin && <ActionForm action={approveEdit.bind(null, e.id)} resetOnSuccess={false}><SubmitButton>Approve</SubmitButton></ActionForm>}
                    <ActionForm action={rejectEdit.bind(null, e.id)} resetOnSuccess={false}><SubmitButton variant="secondary">{isAdmin ? "Reject" : "Withdraw"}</SubmitButton></ActionForm>
                  </div>
                </Td>
              </tr>
            );
          }) : <EmptyRow cols={4} text="No pending edits" />}
        </tbody>
      </Table>
    </div>
  );
}
