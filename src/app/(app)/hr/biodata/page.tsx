import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";

export default async function BioDataPage() {
  const user = await requireUser();
  const supabase = await createClient();

  if (user.role !== "admin") {
    // Everyone else sees only their own record (RLS enforces this as well).
    const { data } = await supabase.from("employee_details").select("id").eq("profile_id", user.id).maybeSingle();
    if (data) redirect(`/hr/biodata/${data.id}`);
    return (
      <div>
        <PageHeader title="Bio-Data" />
        <p className="text-sm text-muted">No bio-data is on file for your account yet. Please contact HR.</p>
      </div>
    );
  }

  const { data: staff } = await supabase
    .from("employee_details").select("id, name, designation, department, contact, join_date, profile_id").order("name");
  return (
    <div>
      <PageHeader title="Bio-Data" description={`${staff?.length ?? 0} employee records`} />
      <Table>
        <thead><tr><Th>Name</Th><Th>Designation</Th><Th>Department</Th><Th>Contact</Th><Th>Joined</Th><Th /></tr></thead>
        <tbody>
          {staff?.length ? staff.map((s) => (
            <tr key={s.id}>
              <Td className="font-medium">{s.name}</Td>
              <Td>{s.designation ?? "-"}</Td>
              <Td>{s.department ?? "-"}</Td>
              <Td>{s.contact ?? "-"}</Td>
              <Td>{formatDate(s.join_date)}</Td>
              <Td><Link href={`/hr/biodata/${s.id}`} className="text-brand hover:underline">View</Link></Td>
            </tr>
          )) : <EmptyRow cols={6} />}
        </tbody>
      </Table>
    </div>
  );
}
