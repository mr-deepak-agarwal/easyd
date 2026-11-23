import { Field, Input, Select, Textarea } from "@/components/ui/fields";

export type PersonOption = { id: string; name: string };

type Defaults = { name?: string; service?: string | null; comments?: string | null; source?: string | null; category?: string | null;
  cost_type?: string | null; lead_generator?: string | null; lead_handler?: string | null };

/** The lead part of the enquiry forms (shared by "new enquiry" and "add a lead to this client"). */
export function LeadFields({ people, d = {}, nameField = "name" }: { people: PersonOption[]; d?: Defaults; nameField?: string }) {
  return (
    <>
      <Field label="Lead / project name" htmlFor={nameField}><Input id={nameField} name={nameField} required maxLength={200} defaultValue={d.name} /></Field>
      <Field label="Service" htmlFor="service"><Input id="service" name="service" maxLength={500} defaultValue={d.service ?? ""} /></Field>
      <Field label="Source" htmlFor="source"><Input id="source" name="source" maxLength={200} defaultValue={d.source ?? ""} /></Field>
      <Field label="Category" htmlFor="category"><Input id="category" name="category" maxLength={200} defaultValue={d.category ?? ""} /></Field>
      <Field label="Cost type" htmlFor="cost_type">
        <Select id="cost_type" name="cost_type" defaultValue={d.cost_type ?? "chargeable"}>
          <option value="chargeable">Chargeable</option>
          <option value="nonchargeable">Non-chargeable</option>
        </Select>
      </Field>
      <Field label="Lead generator" htmlFor="lead_generator">
        <Select id="lead_generator" name="lead_generator" defaultValue={d.lead_generator ?? ""}>
          <option value="">-</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Lead handler" htmlFor="lead_handler">
        <Select id="lead_handler" name="lead_handler" defaultValue={d.lead_handler ?? ""}>
          <option value="">-</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Remarks" htmlFor="remarks" className="sm:col-span-2">
        <Textarea id="remarks" name={nameField === "name" ? "comments" : "remarks"} maxLength={2000} defaultValue={d.comments ?? ""} />
      </Field>
    </>
  );
}
