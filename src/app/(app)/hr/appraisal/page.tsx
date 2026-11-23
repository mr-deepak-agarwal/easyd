import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { TIME_VIEWERS } from "@/lib/roles";
import { formatDate, todayIST } from "@/lib/dates";
import { PARTS, computeScore, defaultPeriod, type Raw } from "@/lib/score";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Input } from "@/components/ui/fields";
import { BandBadge, Bar } from "./score-bits";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function AppraisalPage({ searchParams }: PageProps<"/hr/appraisal">) {
  const user = await requireUser();
  if (!TIME_VIEWERS.includes(user.role)) redirect(`/hr/appraisal/${user.id}`);
  const sp = await searchParams;
  const def = defaultPeriod(todayIST());
  const from = isDate(one(sp.from)) ? one(sp.from) : def.from, to = isDate(one(sp.to)) ? one(sp.to) : def.to;
  const supabase = await createClient();
  const [{ data: people }, { data: wRows }] = await Promise.all([
    supabase.from("profiles").select("id, name, role").eq("active", true).order("name").limit(200),
    supabase.from("score_weights").select("key, weight, label").order("sort"),
  ]);
  const weights = Object.fromEntries((wRows ?? []).map((w) => [w.key, Number(w.weight)]));
  const results = await Promise.all((people ?? []).map(async (p) => {
    const { data } = await supabase.rpc("employee_scorecard", { p_profile: p.id, p_from: from, p_to: to });
    return { p, score: data?.[0] ? computeScore(data[0] as unknown as Raw, weights) : null };
  }));
  const ranked = [...results].sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1));
  const label = Object.fromEntries((wRows ?? []).map((w) => [w.key, w.label]));

  return (
    <div className="space-y-5">
      <PageHeader title="Appraisal" description={`Performance scores, ${formatDate(from)} to ${formatDate(to)}`}>
        {user.role === "admin" && <Link href="/hr/appraisal/cycles" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">Appraisal cycles</Link>}
        {user.role === "admin" && <Link href="/hr/appraisal/weights" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">Score weights</Link>}
      </PageHeader>
      <form className="flex flex-wrap items-end gap-2">
        <Input type="date" name="from" defaultValue={from} aria-label="From" className="w-40" />
        <Input type="date" name="to" defaultValue={to} aria-label="To" className="w-40" />
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Show</button>
      </form>
      <Table>
        <thead><tr><Th>Employee</Th><Th>Score</Th><Th>Rating</Th>{PARTS.map((k) => <Th key={k}>{label[k] ?? k}</Th>)}</tr></thead>
        <tbody>
          {ranked.length ? ranked.map(({ p, score }) => (
            <tr key={p.id}>
              <Td><Link href={`/hr/appraisal/${p.id}?from=${from}&to=${to}`} className="font-medium text-brand hover:underline">{p.name}</Link></Td>
              <Td className="tabular-nums">{score?.total ?? "-"}</Td>
              <Td><BandBadge band={score?.band ?? null} /></Td>
              {PARTS.map((k) => <Td key={k}><Bar value={score?.parts.find((x) => x.key === k)?.score ?? null} /></Td>)}
            </tr>
          )) : <EmptyRow cols={8} text="No employees" />}
        </tbody>
      </Table>
      <p className="text-xs text-muted">Each part is out of 100. A part with nothing to judge yet shows n/a and its weight is shared among the others.</p>
    </div>
  );
}
