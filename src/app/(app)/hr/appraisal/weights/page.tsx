import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveWeights } from "../actions";

const HELP: Record<string, string> = {
  ontime: "Tasks and milestones finished on or before their end date, out of those that came due.",
  discipline: "Days present on which at least 6 hours were logged in the time tracker.",
  match: "Share of project time logged on projects the person is assigned to.",
  attendance: "Days present out of working days (Mon-Sat, minus holidays and approved full-day leave).",
  reviews: "Average of the team lead reviews, from 1 (poor) to 5 (excellent).",
};

export default async function WeightsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("score_weights").select("key, label, weight").order("sort");
  return (
    <div className="space-y-5">
      <PageHeader title="Score weights" description="How much each part counts towards the overall score">
        <Link href="/hr/appraisal" className="rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-background">Back to appraisal</Link>
      </PageHeader>
      <Card>
        <ActionForm action={saveWeights} className="space-y-4" resetOnSuccess={false}>
          {data?.map((w) => (
            <Field key={w.key} label={w.label} htmlFor={w.key} hint={HELP[w.key]}>
              <Input id={w.key} name={w.key} inputMode="decimal" defaultValue={String(Number(w.weight))} className="w-28" />
            </Field>
          ))}
          <p className="text-sm text-muted">The five weights must add up to 100.</p>
          <SubmitButton>Save weights</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
