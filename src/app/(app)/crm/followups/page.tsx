import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { todayIST } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { FollowupList, type FollowupRow } from "../followup-list";

export default async function FollowupsPage() {
  await requireRole(MGMT_ROLES);
  const supabase = await createClient();
  const today = todayIST();
  const cols = "id, reason, reply, description, next_followup_on, file_path, file_description, entered_at, prospect_name, profiles:entered_by(name)";
  const [{ data: due }, { data: recent }] = await Promise.all([
    supabase.from("followups").select(cols).lte("next_followup_on", today).order("next_followup_on").limit(100),
    supabase.from("followups").select(cols).order("entered_at", { ascending: false }).limit(100),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Follow-ups" description="Add follow-ups from a client or lead page" />
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Due today or overdue</h2>
        <FollowupList rows={(due ?? []) as FollowupRow[]} showClient />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Most recent</h2>
        <FollowupList rows={(recent ?? []) as FollowupRow[]} showClient />
      </section>
    </div>
  );
}
