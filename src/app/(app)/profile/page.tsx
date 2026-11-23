import { requireUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePassword } from "./actions";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title="My Account" />
      <Card title="Details">
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Name</dt><dd>{user.name}</dd>
          <dt className="text-muted">Login</dt><dd>{user.empid}</dd>
          <dt className="text-muted">Role</dt><dd>{ROLE_LABEL[user.role]}</dd>
        </dl>
      </Card>
      <Card title="Change password">
        <ActionForm action={changePassword} className="grid gap-4">
          <Field label="Current password" htmlFor="current"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
          <Field label="New password" htmlFor="next" hint="At least 8 characters"><Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required /></Field>
          <Field label="Confirm new password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></Field>
          <div><SubmitButton>Change password</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
