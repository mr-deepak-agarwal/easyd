import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LEAVE_TYPES } from "@/lib/leave";
import { formatDate, todayIST } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { LeaveStatusBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { applyLeave } from "./actions";

export default async function LeavePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const year = todayIST().slice(0, 4);

  const [{ data: mine }, { data: quota }] = await Promise.all([
    supabase.from("leave_applications")
      .select("id, leave_from, leave_to, applied_on, reason, num_days, leave_type, status")
      .eq("profile_id", user.id).order("id", { ascending: false }),
    supabase.from("leave_quota").select("casual, privilege").eq("profile_id", user.id).maybeSingle(),
  ]);

  const takenIn = (prefix: string) =>
    (mine ?? []).filter((l) => l.status === "approved" && l.leave_type.startsWith(prefix) && l.leave_from.startsWith(year))
      .reduce((sum, l) => sum + Number(l.num_days), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Leave" description="Apply for leave and track your applications" />

      <div className="grid gap-4 sm:grid-cols-2">
        {([["Casual leave (CL)", quota?.casual, takenIn("CL")], ["Privilege leave (PL)", quota?.privilege, takenIn("PL")]] as const).map(([label, q, taken]) => (
          <Card key={label}>
            <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-brand">{q ?? 0}</div>
            <div className="text-xs text-muted">quota - {taken} approved so far in {year}</div>
          </Card>
        ))}
      </div>

      <Card title="Apply for leave">
        <ActionForm action={applyLeave} className="grid gap-4 sm:grid-cols-2">
          <Field label="Leave from" htmlFor="from"><Input id="from" name="from" type="date" required /></Field>
          <Field label="Leave to" htmlFor="to"><Input id="to" name="to" type="date" required /></Field>
          <Field label="Leave type" htmlFor="type">
            <Select id="type" name="type" required defaultValue="">
              <option value="" disabled>Select leave type</option>
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Reason" htmlFor="reason"><Textarea id="reason" name="reason" required maxLength={500} rows={2} /></Field>
          <div className="sm:col-span-2"><SubmitButton>Submit</SubmitButton></div>
        </ActionForm>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">My applications</h2>
        <Table>
          <thead><tr><Th>From</Th><Th>To</Th><Th>Days</Th><Th>Type</Th><Th>Reason</Th><Th>Applied</Th><Th>Status</Th></tr></thead>
          <tbody>
            {mine?.length ? mine.map((l) => (
              <tr key={l.id}>
                <Td>{formatDate(l.leave_from)}</Td><Td>{formatDate(l.leave_to)}</Td><Td>{l.num_days}</Td>
                <Td>{l.leave_type}</Td><Td className="max-w-xs">{l.reason}</Td><Td>{formatDate(l.applied_on)}</Td>
                <Td><LeaveStatusBadge status={l.status} /></Td>
              </tr>
            )) : <EmptyRow cols={7} text="You have not applied for any leave" />}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
