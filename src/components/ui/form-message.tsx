import type { ActionState } from "@/lib/action-state";

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="text-sm text-danger">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm text-brand">{state.ok}</p>;
  return null;
}
