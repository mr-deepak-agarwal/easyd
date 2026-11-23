import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { aiConfigured } from "@/lib/ai";
import { assessRisk, type Level } from "@/lib/risk";
import { todayIST, formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { SummaryBox } from "./summary-box";

const TONE: Record<Level, "red" | "amber" | "grey"> = { high: "red", medium: "amber", low: "grey" };
const ORDER = ["high", "medium", "low"];

export default async function RisksPage() {
  await requireRole(MGMT_ROLES);
  const supabase = await createClient();
  const today = todayIST();
  const { data, error } = await supabase.rpc("report_project_risks");
  const rows = (data ?? []).map((r) => ({ r, a: assessRisk(r, today) }));
  const flagged = rows.filter((x) => x.a.level).sort((x, y) => ORDER.indexOf(x.a.level!) - ORDER.indexOf(y.a.level!));
  return (
    <div className="space-y-5">
      <PageHeader title="Project risks" description={`${flagged.length} of ${rows.length} open projects have a warning`} />
      <SummaryBox enabled={aiConfigured()} />
      {error && <p role="alert" className="text-sm text-danger">Could not load the projects.</p>}
      <Table>
        <thead><tr><Th>Project</Th><Th>Risk</Th><Th>Warnings</Th><Th className="text-right">Hours used</Th><Th className="text-right">Milestones done</Th><Th>Ends</Th></tr></thead>
        <tbody>
          {flagged.length ? flagged.map(({ r, a }) => (
            <tr key={r.project_id} className="align-top">
              <Td><Link href={`/projects/${r.project_id}`} className="font-medium text-brand hover:underline">{r.project_name}</Link><p className="text-xs text-muted">{r.client_name ?? "-"}</p></Td>
              <Td><Badge tone={TONE[a.level!]}>{a.level}</Badge></Td>
              <Td><ul className="space-y-0.5">{a.flags.map((f) => <li key={f.text}>{f.text}</li>)}</ul></Td>
              <Td className="text-right tabular-nums">{a.burnPct === null ? "-" : `${a.burnPct}%`}</Td>
              <Td className="text-right tabular-nums">{a.progressPct}%</Td>
              <Td>{formatDate(r.end_date)}</Td>
            </tr>)) : <EmptyRow cols={6} text="No project has a warning right now" />}
        </tbody>
      </Table>
      <p className="text-sm text-muted">Warnings come from fixed rules: hours used against planned hours, milestones and tasks past their date, the end date, and days without any time logged. Hours are planned hours from each project team. Milestone progress adds up the percentages of completed milestones.</p>
    </div>
  );
}
