import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateEmployee } from "../actions";

export default async function EmployeeDetailPage({ params }: PageProps<"/hr/biodata/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const empId = Number(id);
  if (!Number.isInteger(empId)) notFound();

  const supabase = await createClient();
  // RLS returns the row only to its owner or an admin.
  const { data: e } = await supabase.from("employee_details").select("*").eq("id", empId).maybeSingle();
  if (!e) notFound();
  const isAdmin = user.role === "admin";

  const files = [
    e.cv_path && { label: "CV", href: `/hr/biodata/${e.id}/cv` },
    e.docs_path && { label: "Qualification documents", href: `/hr/biodata/${e.id}/qualification` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title={e.name} description={[e.designation, e.department].filter(Boolean).join(" - ") || undefined}>
        {isAdmin && <Link href="/hr/biodata" className="text-sm text-brand hover:underline">All employees</Link>}
      </PageHeader>

      {isAdmin ? (
        <Card title="Edit details">
          <ActionForm action={updateEmployee.bind(null, e.id)} resetOnSuccess={false} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name"><Input id="name" name="name" defaultValue={e.name} required /></Field>
            <Field label="Designation" htmlFor="designation"><Input id="designation" name="designation" defaultValue={e.designation ?? ""} /></Field>
            <Field label="Department" htmlFor="department"><Input id="department" name="department" defaultValue={e.department ?? ""} /></Field>
            <Field label="Supervisor" htmlFor="supervisor"><Input id="supervisor" name="supervisor" defaultValue={e.supervisor ?? ""} /></Field>
            <Field label="Category" htmlFor="category"><Input id="category" name="category" defaultValue={e.category ?? ""} /></Field>
            <Field label="Grade" htmlFor="grade"><Input id="grade" name="grade" defaultValue={e.grade ?? ""} /></Field>
            <Field label="Employee code" htmlFor="emp_code"><Input id="emp_code" name="emp_code" defaultValue={e.emp_code ?? ""} /></Field>
            <Field label="Gender" htmlFor="gender">
              <Select id="gender" name="gender" defaultValue={e.gender ?? ""}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </Select>
            </Field>
            <Field label="Personal email" htmlFor="email"><Input id="email" name="email" defaultValue={e.email ?? ""} /></Field>
            <Field label="Contact number" htmlFor="contact"><Input id="contact" name="contact" defaultValue={e.contact ?? ""} /></Field>
            <Field label="Date of birth" htmlFor="dob"><Input id="dob" name="dob" type="date" defaultValue={e.dob ?? ""} /></Field>
            <Field label="Joining date" htmlFor="join_date"><Input id="join_date" name="join_date" type="date" defaultValue={e.join_date ?? ""} /></Field>
            <Field label="Salary" htmlFor="salary"><Input id="salary" name="salary" type="number" min={0} step="0.01" defaultValue={e.salary ?? ""} /></Field>
            <div />
            <Field label="Address" htmlFor="address" className="sm:col-span-2"><Textarea id="address" name="address" defaultValue={e.address ?? ""} /></Field>
            <Field label="Bank details" htmlFor="bank" className="sm:col-span-2"><Textarea id="bank" name="bank" defaultValue={e.bank ?? ""} /></Field>
            <div className="sm:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
          </ActionForm>
        </Card>
      ) : (
        <Card title="Details">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {([
              ["Login", e.empid], ["Employee code", e.emp_code], ["Designation", e.designation], ["Department", e.department],
              ["Supervisor", e.supervisor], ["Category", e.category], ["Gender", e.gender], ["Personal email", e.email],
              ["Contact", e.contact], ["Date of birth", e.dob ? formatDate(e.dob) : null], ["Joined", e.join_date ? formatDate(e.join_date) : null],
              ["Address", e.address], ["Bank details", e.bank],
            ] as [string, string | null][]).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 whitespace-pre-line">{v || "-"}</dd></div>
            ))}
          </dl>
        </Card>
      )}

      {files.length > 0 && (
        <Card title="Documents">
          <ul className="space-y-1 text-sm">
            {files.map((f) => <li key={f.href}><a href={f.href} className="text-brand hover:underline">{f.label}</a></li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
