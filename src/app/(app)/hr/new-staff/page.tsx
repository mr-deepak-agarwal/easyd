import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ROLES, ROLE_LABEL } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStaff } from "./actions";

export default async function NewStaffPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: departments } = await supabase.from("departments").select("name").eq("active", true).order("name");

  return (
    <div className="max-w-4xl">
      <PageHeader title="New Staff" description="Create a login and the employee's bio-data in one step" />
      <Card>
        <ActionForm action={createStaff} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name"><Input id="name" name="name" required maxLength={100} /></Field>
          <Field label="Designation" htmlFor="designation"><Input id="designation" name="designation" /></Field>

          <Field label="Login username" htmlFor="empid" hint="Leave blank to use firstname@marcglocal.com">
            <Input id="empid" name="empid" type="email" autoComplete="off" />
          </Field>
          <Field label="Initial password" htmlFor="password" hint="Leave blank to generate one">
            <Input id="password" name="password" type="text" autoComplete="off" minLength={8} />
          </Field>

          <Field label="Role" htmlFor="role">
            <Select id="role" name="role" defaultValue="employee">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </Field>
          <Field label="Department" htmlFor="department">
            <Select id="department" name="department" defaultValue="">
              <option value="">Select</option>
              {departments?.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </Select>
          </Field>

          <Field label="Personal email" htmlFor="personalEmail"><Input id="personalEmail" name="personalEmail" type="email" /></Field>
          <Field label="Contact number" htmlFor="contact"><Input id="contact" name="contact" inputMode="tel" /></Field>
          <Field label="Gender" htmlFor="gender">
            <Select id="gender" name="gender" defaultValue="">
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Salary" htmlFor="salary"><Input id="salary" name="salary" type="number" min={0} step="0.01" /></Field>
          <Field label="Date of birth" htmlFor="dob"><Input id="dob" name="dob" type="date" /></Field>
          <Field label="Joining date" htmlFor="joiningDate"><Input id="joiningDate" name="joiningDate" type="date" /></Field>
          <Field label="Address" htmlFor="address" className="sm:col-span-2"><Textarea id="address" name="address" /></Field>
          <Field label="Bank details" htmlFor="bank" className="sm:col-span-2"><Textarea id="bank" name="bank" /></Field>
          <Field label="CV" htmlFor="cv" hint="PDF, Word or image, up to 2 MB"><Input id="cv" name="cv" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" /></Field>
          <Field label="Qualification documents" htmlFor="qualification" hint="PDF, Word or image, up to 2 MB"><Input id="qualification" name="qualification" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" /></Field>
          <div className="sm:col-span-2"><SubmitButton>Create employee</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
