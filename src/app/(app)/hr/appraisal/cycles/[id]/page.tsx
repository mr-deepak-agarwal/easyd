import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import type { Band } from "@/lib/score";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { BandBadge } from "../../score-bits";
import { closeCycle, publishCycle, rateResult } from "../../actions";

const RATINGS = [[5, "5 - Outstanding"], [4, "4 - Exceeds expectations"], [3, "3 - Meets expectations"], [2, "2 - Below expectations"], [1, "1 - Unsatisfactory"]] as const;

export default async function CyclePage({ params }: PageProps<"/hr/appraisal/cycles/[id]">) {
  await requireRole(["admin"]);
  const { id } = await params;
  const cid = Number(id);
  if (!Number.isInteger(cid)) notFound();
  const supabase = await createClient();
  const [{ data: cycle }, { data: rows }] = await Promise.all([
    supabase.from("appraisal_cycles").select("*").eq("id", cid).maybeSingle(),
    supabase.from("appraisal_results").select("id, profile_id, total, band, review_count, final_rating, admin_remark, employee_comment, acknowledged_at, profiles!appraisal_results_profile_id_fkey(name)").eq("cycle_id", cid).order("total", { ascending: false, nullsFirst: false }),
  ]);
  if (!cycle) notFound();
  const locked = !!cycle.published_at;
  return (
    <div className="space-y-5">
      <PageHeader title={cycle.name} description={`${formatDate(cycle.period_from)} to ${formatDate(cycle.period_to)}`}>
        <Link href="/hr/appraisal/cycles" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">All cycles</Link>
        {cycle.status === "open" && <ActionForm action={closeCycle.bind(null, cid)} resetOnSuccess={false}><SubmitButton confirm="Close the cycle? Everyone's score for this period is frozen.">Close cycle and freeze scores</SubmitButton></ActionForm>}
        {cycle.status === "closed" && !locked && <ActionForm action={publishCycle.bind(null, cid)} resetOnSuccess={false}><SubmitButton confirm="Publish to employees? They will see their score, rating and remark.">Publish to employees</SubmitButton></ActionForm>}
        {locked && <Badge tone="green">Published {formatDate(cycle.published_at)}</Badge>}
      </PageHeader>
      {cycle.status === "open" && <p className="text-sm text-muted">The scores are worked out live until you close the cycle. Closing freezes them so later changes do not alter this appraisal.</p>}
      {cycle.status === "closed" && !locked && <p className="text-sm text-muted">Give every employee a final rating, then publish. Employees see nothing until you publish.</p>}
      <Table>
        <thead><tr><Th>Employee</Th><Th>Score</Th><Th>Reviews</Th><Th>Final rating and remark</Th><Th>Employee</Th></tr></thead>
        <tbody>
          {rows?.length ? rows.map((r) => (
            <tr key={r.id} className="align-top">
              <Td><Link href={`/hr/appraisal/${r.profile_id}?from=${cycle.period_from}&to=${cycle.period_to}`} className="text-brand hover:underline">{(r.profiles as { name: string } | null)?.name}</Link></Td>
              <Td><span className="tabular-nums">{r.total ?? "-"}</span> <BandBadge band={r.band as Band | null} /></Td>
              <Td>{r.review_count}</Td>
              <Td>
                {r.acknowledged_at ? <><b>{r.final_rating}</b> of 5<p className="whitespace-pre-line text-muted">{r.admin_remark}</p></> : cycle.status === "closed" ? (
                  <ActionForm action={rateResult.bind(null, r.id, cid)} className="grid gap-2" resetOnSuccess={false}>
                    <Select name="rating" defaultValue={r.final_rating ? String(r.final_rating) : ""} aria-label={`Final rating for ${(r.profiles as { name: string } | null)?.name}`}><option value="">Rate</option>{RATINGS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select>
                    <Textarea name="remark" defaultValue={r.admin_remark ?? ""} rows={2} maxLength={1000} placeholder="Remark for the employee" aria-label="Remark" />
                    <SubmitButton variant="secondary">Save</SubmitButton>
                  </ActionForm>) : <span className="text-muted">Close the cycle to rate</span>}
              </Td>
              <Td>{r.acknowledged_at ? <><Badge tone="green">Acknowledged</Badge><p className="mt-1 whitespace-pre-line text-muted">{r.employee_comment}</p></> : locked ? <Badge tone="amber">Not yet</Badge> : "-"}</Td>
            </tr>)) : <EmptyRow cols={5} text={cycle.status === "open" ? "Results appear when you close the cycle" : "No results"} />}
        </tbody>
      </Table>
    </div>
  );
}
