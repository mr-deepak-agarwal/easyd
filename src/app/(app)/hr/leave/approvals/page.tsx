import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { LeaveStatusBadge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { decideLeave } from "../actions";

const STATUSES = ["pending", "approved", "rejected", "all"] as const;

export default async function ApprovalsPage({ searchParams }: PageProps<"/hr/leave/approvals">) {
  const me = await requireRole(["admin", "teamlead", "teamlead2"]);
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = (STATUSES as readonly string[]).includes(raw ?? "") ? (raw as (typeof STATUSES)[number]) : "pending";

  const supabase = await createClient();
  let query = supabase.from("leave_applications")
    .select("id, profile_id, leave_from, leave_to, applied_on, reason, num_days, leave_type, status, employee:profiles!leave_applications_profile_id_fkey(name)")
    .order("id", { ascending: false }).limit(300);
  if (status !== "all") query = query.eq("status", status);
  const { data: rows } = await query;

  return (
    <div className="space-y-4">
      <PageHeader title="Leave approvals" description="Tick applications, then approve or reject them together">
        {STATUSES.map((s) => (
          <Link key={s} href={`/hr/leave/approvals?status=${s}`}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize ${s === status ? "border-brand bg-brand text-white" : "border-border bg-card hover:bg-raised"}`}>{s}</Link>
        ))}
      </PageHeader>

      <form>
        <Table>
          <thead><tr><Th className="w-8" /><Th>Employee</Th><Th>From</Th><Th>To</Th><Th>Days</Th><Th>Type</Th><Th>Reason</Th><Th>Applied</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows?.length ? rows.map((l) => (
              <tr key={l.id}>
                <Td>{l.status === "pending" && l.profile_id !== me.id && <input type="checkbox" name="ids" value={l.id} aria-label={`Select application ${l.id}`} />}</Td>
                <Td className="font-medium">{l.employee?.name ?? "-"}</Td>
                <Td>{formatDate(l.leave_from)}</Td><Td>{formatDate(l.leave_to)}</Td><Td>{l.num_days}</Td>
                <Td>{l.leave_type}</Td><Td className="max-w-xs">{l.reason}</Td><Td>{formatDate(l.applied_on)}</Td>
                <Td><LeaveStatusBadge status={l.status} /></Td>
              </tr>
            )) : <EmptyRow cols={9} text={`No ${status === "all" ? "" : status + " "}applications`} />}
          </tbody>
        </Table>
        {status === "pending" || status === "all" ? (
          <div className="mt-3 flex gap-2">
            <SubmitButton formAction={decideLeave.bind(null, "approved")}>Approve selected</SubmitButton>
            <SubmitButton variant="danger" formAction={decideLeave.bind(null, "rejected")} confirm="Reject the selected applications?">Reject selected</SubmitButton>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted">You cannot decide your own leave applications.</p>
      </form>
    </div>
  );
}
