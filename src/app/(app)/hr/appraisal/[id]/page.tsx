import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { TIME_VIEWERS } from "@/lib/roles";
import { formatDate, todayIST } from "@/lib/dates";
import { formatMinutes } from "@/lib/time";
import { computeScore, defaultPeriod, type Raw } from "@/lib/score";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Input } from "@/components/ui/fields";
import { BandBadge, Bar } from "../score-bits";
import { ReviewForm } from "./review-form";
import { submitReview, acknowledgeResult } from "../actions";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/fields";
import { Badge } from "@/components/ui/badge";
import type { Band } from "@/lib/score";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function ScorecardPage({ params, searchParams }: PageProps<"/hr/appraisal/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const isViewer = TIME_VIEWERS.includes(user.role);
  if (id !== user.id && !isViewer) notFound();
  const sp = await searchParams;
  const def = defaultPeriod(todayIST());
  const from = isDate(one(sp.from)) ? one(sp.from) : def.from, to = isDate(one(sp.to)) ? one(sp.to) : def.to;
  const supabase = await createClient();
  const [{ data: person }, { data: sc }, { data: wRows }, { data: overdue }, { data: reviews }, { data: teamRows }, { data: results }] = await Promise.all([
    supabase.from("profiles").select("id, name").eq("id", id).maybeSingle(),
    supabase.rpc("employee_scorecard", { p_profile: id, p_from: from, p_to: to }),
    supabase.from("score_weights").select("key, label, weight").order("sort"),
    supabase.rpc("employee_overdue", { p_profile: id }),
    supabase.from("performance_reviews").select("id, review_month, followup, ownership, accuracy, enthusiasm, detail, comments, projects(name), reviewer:reviewer_id(name)").eq("profile_id", id).order("review_month", { ascending: false }).limit(50),
    supabase.from("project_team").select("projects(id, name, status, clients(firm_name))").eq("member_id", id),
    supabase.from("appraisal_results").select("id, total, band, final_rating, admin_remark, employee_comment, acknowledged_at, appraisal_cycles(name, period_from, period_to, published_at)").eq("profile_id", id).order("id", { ascending: false }),
  ]);
  if (!person || !sc?.[0]) notFound();
  const raw = sc[0] as unknown as Raw & { nonchargeable_minutes: number; idle_projects: number };
  const weights = Object.fromEntries((wRows ?? []).map((w) => [w.key, Number(w.weight)]));
  const result = computeScore(raw, weights);
  const meta = Object.fromEntries((wRows ?? []).map((w) => [w.key, w]));
  const canReview = isViewer && id !== user.id;
  const projects = (teamRows ?? []).map((t) => t.projects as { id: number; name: string | null; status: string; clients: { firm_name: string | null } | null } | null)
    .filter((p): p is NonNullable<typeof p> => !!p && (p.status === "approved" || p.status === "closed"))
    .map((p) => ({ id: p.id, label: `${p.clients?.firm_name ?? "-"} - ${p.name}` }));

  return (
    <div className="space-y-5">
      <PageHeader title={person.name} description={`Performance, ${formatDate(from)} to ${formatDate(to)}`}>
        {isViewer && <Link href="/hr/appraisal" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">All employees</Link>}
      </PageHeader>
      <form className="flex flex-wrap items-end gap-2">
        <Input type="date" name="from" defaultValue={from} aria-label="From" className="w-40" />
        <Input type="date" name="to" defaultValue={to} aria-label="To" className="w-40" />
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Show</button>
      </form>

      <Card>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Overall score</p>
            <p className="text-4xl font-semibold tabular-nums" aria-label="Overall score">{result.total ?? "-"}<span className="text-lg text-muted"> / 100</span></p>
          </div>
          <BandBadge band={result.band} />
          {result.total !== null && result.coverage < 100 && <p className="text-sm text-muted">Based on {result.coverage}% of the measures; the rest have nothing to judge yet.</p>}
        </div>
      </Card>

      <Table>
        <thead><tr><Th>Measure</Th><Th>Weight</Th><Th>Score</Th><Th>How it was worked out</Th></tr></thead>
        <tbody>
          {result.parts.map((p) => (
            <tr key={p.key}><Td>{meta[p.key]?.label ?? p.key}</Td><Td>{Number(meta[p.key]?.weight ?? 0)}%</Td><Td><Bar value={p.score} /></Td><Td className="text-muted">{p.detail}</Td></tr>
          ))}
        </tbody>
      </Table>
      <p className="text-sm text-muted">Other time: {formatMinutes(Number(raw.nonchargeable_minutes))} non chargeable. {raw.idle_projects > 0 ? `${raw.idle_projects} assigned project${raw.idle_projects === 1 ? " has" : "s have"} no time logged in this period.` : ""}</p>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Late right now</h2>
        <Table>
          <thead><tr><Th>Type</Th><Th>Item</Th><Th>Project</Th><Th>Was due</Th></tr></thead>
          <tbody>{overdue?.length ? overdue.map((o, i) => <tr key={i}><Td>{o.kind}</Td><Td>{o.title}</Td><Td>{o.project_name ?? "-"}</Td><Td className="text-danger">{formatDate(o.due)}</Td></tr>) : <EmptyRow cols={4} text="Nothing is overdue" />}</tbody>
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Team lead reviews</h2>
        <Table>
          <thead><tr><Th>Month</Th><Th>Project</Th><Th>By</Th><Th>Follow-up</Th><Th>Ownership</Th><Th>Accuracy</Th><Th>Enthusiasm</Th><Th>Detail</Th><Th>Comments</Th></tr></thead>
          <tbody>
            {reviews?.length ? reviews.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{formatDate(r.review_month)}</Td><Td>{(r.projects as { name: string } | null)?.name}</Td><Td>{(r.reviewer as { name: string } | null)?.name}</Td>
                <Td>{r.followup}</Td><Td>{r.ownership}</Td><Td>{r.accuracy}</Td><Td>{r.enthusiasm}</Td><Td>{r.detail}</Td><Td className="max-w-xs whitespace-pre-line">{r.comments}</Td>
              </tr>)) : <EmptyRow cols={9} text="No reviews yet" />}
          </tbody>
        </Table>
      </section>

      {!!results?.length && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Appraisal results</h2>
          {results.map((r) => {
            const c = r.appraisal_cycles as { name: string; period_from: string; period_to: string; published_at: string | null } | null;
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center gap-4">
                  <div><p className="font-medium">{c?.name}</p><p className="text-sm text-muted">{formatDate(c?.period_from)} to {formatDate(c?.period_to)}</p></div>
                  <p className="text-2xl font-semibold tabular-nums">{r.total ?? "-"}<span className="text-sm text-muted"> / 100</span></p>
                  <BandBadge band={r.band as Band | null} />
                  {r.final_rating && <p className="text-sm">Final rating <b>{r.final_rating}</b> of 5</p>}
                  {r.acknowledged_at && <Badge tone="green">Acknowledged</Badge>}
                </div>
                {r.admin_remark && <p className="mt-3 whitespace-pre-line text-sm"><span className="text-muted">Remark: </span>{r.admin_remark}</p>}
                {r.employee_comment && <p className="mt-2 whitespace-pre-line text-sm"><span className="text-muted">Employee comment: </span>{r.employee_comment}</p>}
                {id === user.id && !r.acknowledged_at && (
                  <ActionForm action={acknowledgeResult.bind(null, r.id, id)} className="mt-4 space-y-2" resetOnSuccess={false}>
                    <Textarea name="comment" rows={2} maxLength={1000} placeholder="Your comment (optional)" aria-label="Your comment" />
                    <SubmitButton>Acknowledge this appraisal</SubmitButton>
                  </ActionForm>
                )}
              </Card>
            );
          })}
        </section>
      )}

      {canReview && (
        <Card title="Review this person's work">
          {projects.length ? <ReviewForm action={submitReview.bind(null, id)} projects={projects} profileId={id} /> : <p className="text-sm text-muted">This person is not on any open project, so there is nothing to review yet.</p>}
        </Card>
      )}
    </div>
  );
}
