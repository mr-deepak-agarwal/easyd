import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { COSTING_ROLES } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveCosting } from "../costing-actions";
import { Calculator } from "./calculator";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CostAnalysisPage({ searchParams }: PageProps<"/projects/cost-analysis">) {
  await requireRole(COSTING_ROLES);
  const sp = await searchParams;
  const target = one(sp.target) || (one(sp.lead) ? `lead:${one(sp.lead)}` : one(sp.project) ? `project:${one(sp.project)}` : "");

  const supabase = await createClient();
  const [{ data: leads }, { data: projects }, { data: grades }, { data: oh }] = await Promise.all([
    supabase.from("leads").select("id, name, clients(firm_name)").eq("status", "pending").order("id", { ascending: false }).limit(300),
    supabase.from("projects").select("id, name").in("status", ["pending", "approved"]).order("id", { ascending: false }).limit(300),
    supabase.from("costing_grades").select("id, grade, cost").eq("active", true).order("cost", { ascending: false }),
    supabase.from("overheads").select("cost").order("id", { ascending: false }).limit(1),
  ]);
  const overheadRate = Number(oh?.[0]?.cost ?? 0);
  const valid = target && ((target.startsWith("lead:") && leads?.some((l) => `lead:${l.id}` === target)) || (target.startsWith("project:") && projects?.some((p) => `project:${p.id}` === target)));

  return (
    <div className="space-y-5">
      <PageHeader title="Cost Analysis" description="Estimate what a lead or project should be quoted. Saving replaces the previous estimate." />
      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-72 flex-1">
            <label htmlFor="target" className="mb-1 block text-sm font-medium">Lead or project</label>
            <Select id="target" name="target" defaultValue={valid ? target : ""}>
              <option value="">Choose...</option>
              <optgroup label="Pending leads">
                {leads?.map((l) => <option key={l.id} value={`lead:${l.id}`}>{l.name}{l.clients?.firm_name ? ` - ${l.clients.firm_name}` : ""}</option>)}
              </optgroup>
              <optgroup label="Projects">
                {projects?.map((p) => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
              </optgroup>
            </Select>
          </div>
          <SubmitButton variant="secondary">Open</SubmitButton>
        </form>
      </Card>

      {valid ? (
        !grades?.length ? <Card><p className="text-sm">Add at least one grade under Grades before costing.</p></Card> : (
          <ActionForm action={saveCosting} className="space-y-5" resetOnSuccess={false}>
            <Calculator grades={grades.map((g) => ({ id: g.id, grade: g.grade, cost: Number(g.cost) }))} overheadRate={overheadRate} target={target} />
          </ActionForm>
        )
      ) : null}
    </div>
  );
}
