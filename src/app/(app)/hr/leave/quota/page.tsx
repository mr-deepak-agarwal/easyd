import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateQuota } from "../actions";

export default async function QuotaPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [{ data: people }, { data: quotas }] = await Promise.all([
    supabase.from("profiles").select("id, name").eq("active", true).order("name"),
    supabase.from("leave_quota").select("profile_id, casual, privilege"),
  ]);
  const byId = new Map((quotas ?? []).map((q) => [q.profile_id, q]));

  return (
    <div>
      <PageHeader title="Leave quota" description="Casual and privilege leave allowed for each active employee" />
      <Table>
        <thead><tr><Th>Employee</Th><Th>Casual (CL)</Th><Th>Privilege (PL)</Th><Th /></tr></thead>
        <tbody>
          {people?.length ? people.map((p) => {
            const q = byId.get(p.id);
            return (
              <tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td colSpan={3}>
                  <ActionForm action={updateQuota.bind(null, p.id)} resetOnSuccess={false} className="flex items-center gap-3">
                    <Input name="casual" type="number" min={0} max={365} step="0.5" defaultValue={q?.casual ?? 0} aria-label="Casual leave" className="w-24 py-1" />
                    <Input name="privilege" type="number" min={0} max={365} step="0.5" defaultValue={q?.privilege ?? 0} aria-label="Privilege leave" className="w-24 py-1" />
                    <SubmitButton variant="secondary" className="px-3 py-1">Save</SubmitButton>
                  </ActionForm>
                </Td>
              </tr>
            );
          }) : <EmptyRow cols={4} />}
        </tbody>
      </Table>
    </div>
  );
}
