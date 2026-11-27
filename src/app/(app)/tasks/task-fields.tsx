import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { REPEATS } from "@/lib/task-core";

export type Person = { id: string; name: string };
type Defaults = { title?: string; description?: string | null; starts_on?: string | null; ends_on?: string | null; responsible?: string[]; participants?: string[]; repeat_rule?: string | null; repeat_until?: string | null };

/** Fields shared by the create and edit forms. */
export function TaskFields({ people, d = {} }: { people: Person[]; d?: Defaults }) {
  const box = (name: string, selected: string[] = []) => (
    <div className="grid max-h-44 grid-cols-2 gap-1 overflow-auto rounded-md border border-border p-2 sm:grid-cols-3">
      {people.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} value={p.id} defaultChecked={selected.includes(p.id)} /> {p.name}</label>
      ))}
    </div>
  );
  return (
    <>
      <Field label="Title" htmlFor="title" className="sm:col-span-2"><Input id="title" name="title" required maxLength={200} defaultValue={d.title} /></Field>
      <Field label="Description" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" maxLength={4000} defaultValue={d.description ?? ""} /></Field>
      <Field label="Starts on" htmlFor="starts_on"><Input id="starts_on" name="starts_on" type="date" defaultValue={d.starts_on ?? ""} /></Field>
      <Field label="Due on" htmlFor="ends_on"><Input id="ends_on" name="ends_on" type="date" defaultValue={d.ends_on ?? ""} /></Field>
      <Field label="Repeat" htmlFor="repeat_rule" hint="When this one is done, the next is created"><Select id="repeat_rule" name="repeat_rule" defaultValue={d.repeat_rule ?? ""}>{REPEATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
      <Field label="Repeat until" htmlFor="repeat_until" hint="Optional"><Input id="repeat_until" name="repeat_until" type="date" defaultValue={d.repeat_until ?? ""} /></Field>
      <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Responsible (at least one)</legend>{box("responsible", d.responsible)}</fieldset>
      <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Also involved</legend>{box("participants", d.participants)}</fieldset>
    </>
  );
}
