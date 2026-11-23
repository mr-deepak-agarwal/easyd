import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ROLES, ROLE_LABEL } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { resetPassword, setActive, setRole } from "./actions";

export default async function EmployeesAdminPage() {
  const me = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id, empid, name, role, active").order("active", { ascending: false }).order("name");

  return (
    <div>
      <PageHeader title="Employee Registration" description="Roles, passwords and access for every login" />
      <Table>
        <thead><tr><Th>Name</Th><Th>Login</Th><Th>Role</Th><Th>Status</Th><Th>Password</Th><Th /></tr></thead>
        <tbody>
          {people?.length ? people.map((p) => {
            const self = p.id === me.id;
            return (
              <tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td className="text-muted">{p.empid}</Td>
                <Td>
                  {self ? ROLE_LABEL[p.role] : (
                    <form action={setRole.bind(null, p.id)} className="flex items-center gap-2">
                      <Select name="role" defaultValue={p.role} className="w-36 py-1">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </Select>
                      <SubmitButton variant="ghost" className="px-2 py-1">Save</SubmitButton>
                    </form>
                  )}
                </Td>
                <Td>{p.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Terminated</Badge>}</Td>
                <Td>
                  <ActionForm action={resetPassword.bind(null, p.id)} className="flex items-center gap-2">
                    <Input name="password" type="text" placeholder="New password" minLength={8} autoComplete="off" className="w-40 py-1" required />
                    <SubmitButton variant="secondary" className="px-3 py-1">Set</SubmitButton>
                  </ActionForm>
                </Td>
                <Td>
                  {!self && (
                    <form action={setActive.bind(null, p.id, !p.active)}>
                      <SubmitButton variant={p.active ? "danger" : "secondary"} className="px-3 py-1"
                        confirm={p.active ? `Terminate ${p.name}? They will no longer be able to log in.` : `Re-activate ${p.name}?`}>
                        {p.active ? "Terminate" : "Activate"}
                      </SubmitButton>
                    </form>
                  )}
                </Td>
              </tr>
            );
          }) : <EmptyRow cols={6} />}
        </tbody>
      </Table>
    </div>
  );
}
