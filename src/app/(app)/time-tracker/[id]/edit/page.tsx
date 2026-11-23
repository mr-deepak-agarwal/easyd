import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { TimeFields } from "../../time-fields";
import { requestEdit } from "../../actions";

export default async function EditTimePage({ params }: PageProps<"/time-tracker/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isInteger(entryId)) notFound();
  const supabase = await createClient();
  const [{ data: e }, { data: projects }] = await Promise.all([
    supabase.from("time_entries").select("*").eq("id", entryId).maybeSingle(),
    supabase.from("projects").select("id, name, clients(firm_name)").eq("status", "approved").order("name").limit(500),
  ]);
  if (!e || e.profile_id !== user.id) notFound();
  const opts = (projects ?? []).map((p) => ({ id: p.id, label: `${(p.clients as { firm_name: string | null } | null)?.firm_name ?? "-"} - ${p.name ?? p.id}` }));
  if (e.project_id && !opts.some((o) => o.id === e.project_id)) opts.push({ id: e.project_id, label: `Project ${e.project_id}` });
  const non = !e.project_id;
  return (
    <div className="space-y-5">
      <PageHeader title="Edit time entry" description="Edits are sent to an admin for approval; the entry changes once approved." />
      <Card>
        <ActionForm action={requestEdit.bind(null, entryId)} className="space-y-4" resetOnSuccess={false}>
          <TimeFields projects={opts} defaults={{ entry_date: e.entry_date, kind: non ? "non" : "chargeable", project_id: e.project_id ? String(e.project_id) : "", category: e.non_chargeable_category ?? "",
            work: e.work_accomplished ?? "", hours: String(Math.floor(e.minutes / 60)), minutes: String(e.minutes % 60) }} />
          <SubmitButton>Send for approval</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
