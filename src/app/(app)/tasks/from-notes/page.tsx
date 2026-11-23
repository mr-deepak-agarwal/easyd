import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/ui/page-header";
import { NotesForm } from "./notes-form";

export default async function FromNotesPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, name, clients(firm_name)").eq("status", "approved").order("name").limit(300);
  const projects = (data ?? []).map((p) => ({ id: p.id, label: `${(p.clients as { firm_name: string | null } | null)?.firm_name ?? "-"} - ${p.name ?? p.id}` }));
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Tasks from notes" description="Paste meeting notes or an email and review the tasks it finds" />
      <NotesForm projects={projects} enabled={aiConfigured()} />
    </div>
  );
}
