"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "./form-message";

/** Puts back what the person typed. React clears a form after every submit, including a failed one. */
function restore(form: HTMLFormElement, values: FormData) {
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) || !el.name) continue;
    if (el instanceof HTMLInputElement && (el.type === "file" || el.type === "hidden" || el.type === "submit" || el.type === "button")) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      el.checked = values.getAll(el.name).includes(el.value);
    } else if (el instanceof HTMLSelectElement && el.multiple) {
      const chosen = values.getAll(el.name).map(String);
      for (const o of Array.from(el.options)) o.selected = chosen.includes(o.value);
    } else {
      const v = values.get(el.name);
      if (typeof v === "string") el.value = v;
    }
  }
}

export function ActionForm({ action, children, className, resetOnSuccess = true }: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const submitted = useRef<FormData | null>(null);
  const [state, formAction] = useActionState(async (prev: ActionState, formData: FormData) => {
    submitted.current = formData;
    return action(prev, formData);
  }, {} as ActionState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = ref.current, values = submitted.current;
    if (!form || !values || (!state.ok && !state.error)) return;
    const wipe = state.ok && resetOnSuccess;
    // React clears the form after the action finishes; wait for that, then either keep it cleared or put the input back.
    const t = setTimeout(() => { if (wipe) form.reset(); else restore(form, values); }, 0);
    return () => clearTimeout(t);
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="col-span-full"><FormMessage state={state} /></div>
    </form>
  );
}
