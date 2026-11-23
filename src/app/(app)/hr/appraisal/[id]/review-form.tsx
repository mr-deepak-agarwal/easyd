"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";

const CRITERIA = [
  ["followup", "Feedback and follow-up"], ["ownership", "Ownership of the project"], ["accuracy", "Formatting and accuracy"],
  ["enthusiasm", "Enthusiasm"], ["detail", "Attention to detail"],
] as const;
const SCALE = [[5, "5 - Excellent"], [4, "4 - Good"], [3, "3 - Fair"], [2, "2 - Weak"], [1, "1 - Poor"]] as const;

export function ReviewForm({ action, projects }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; projects: { id: number; label: string }[] }) {
  return (
    <ActionForm action={action} className="grid gap-4 sm:grid-cols-3" resetOnSuccess={false}>
      <Field label="Project" htmlFor="project" className="sm:col-span-3">
        <Select id="project" name="project" required defaultValue=""><option value="">Choose the project this review is about</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select>
      </Field>
      {CRITERIA.map(([k, label]) => (
        <Field key={k} label={label} htmlFor={k}>
          <Select id={k} name={k} required defaultValue=""><option value="">Rate</option>{SCALE.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select>
        </Field>
      ))}
      <Field label="Comments" htmlFor="comments" className="sm:col-span-3"><Textarea id="comments" name="comments" maxLength={1000} placeholder="What went well, what to improve" /></Field>
      <div><SubmitButton>Save review</SubmitButton></div>
    </ActionForm>
  );
}
