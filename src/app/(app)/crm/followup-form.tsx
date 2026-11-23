import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { addFollowup } from "./actions";

export function FollowupForm({ target }: { target: { clientId: number; leadId?: number; projectId?: number } }) {
  return (
    <ActionForm action={addFollowup.bind(null, target)} className="grid gap-4 sm:grid-cols-2">
      <Field label="Reason for follow-up" htmlFor="reason"><Input id="reason" name="reason" required maxLength={500} /></Field>
      <Field label="Next follow-up on" htmlFor="next_followup_on"><Input id="next_followup_on" name="next_followup_on" type="date" /></Field>
      <Field label="Client's reply" htmlFor="reply"><Textarea id="reply" name="reply" maxLength={2000} /></Field>
      <Field label="Notes" htmlFor="description"><Textarea id="description" name="description" maxLength={2000} /></Field>
      <Field label="Document (optional, up to 4 MB)" htmlFor="document"><Input id="document" name="document" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" /></Field>
      <Field label="Document description" htmlFor="file_description"><Input id="file_description" name="file_description" maxLength={500} /></Field>
      <div className="sm:col-span-2"><SubmitButton>Save follow-up</SubmitButton></div>
    </ActionForm>
  );
}
