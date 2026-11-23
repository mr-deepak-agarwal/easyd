"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { ENTITIES, CURRENCIES, SERIES, type Entity } from "@/lib/invoice";
import type { ActionState } from "@/lib/action-state";

export type InvoiceDefaults = {
  invoice_type: string; invoice_by: string; invoice_by_type: string; invoice_date: string; place_of_supply: string;
  recipient_name: string; recipient_address: string; recipient_pan: string; recipient_gst: string; recipient_state_code: string;
  delivery_name: string; delivery_address: string; delivery_pan: string; delivery_gst: string; delivery_state_code: string;
  advance: string; ope: string; currency_type: string;
  lines: { service_description: string; sac: string; taxable_value: string; rupee_value: string }[];
};

const SERIES_LABEL: Record<string, string> = { M: "Monthly (M)", Q: "Quarterly (Q)", Y: "Yearly (Y)", MISC: "One time (MISC)" };

export function InvoiceForm({ action, defaults, sacs, lockedNumber }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: InvoiceDefaults; sacs: { sac: string; description: string }[];
  lockedNumber?: boolean; // when editing, type / entity / series are fixed because the number is already issued
}) {
  const [type, setType] = useState(defaults.invoice_type);
  const [entity, setEntity] = useState(defaults.invoice_by);
  const [keys, setKeys] = useState<number[]>(defaults.lines.map((_, i) => i));
  const [next, setNext] = useState(defaults.lines.length);
  const exp = type === "Export";
  const hasSeries = ENTITIES[entity as Entity]?.hasSeries;

  return (
    <ActionForm action={action} className="space-y-5" resetOnSuccess={false}>
      <input type="hidden" name="rows" value={keys.join(",")} />
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-4">
        <Field label="Invoice type" htmlFor="invoice_type">
          <Select id="invoice_type" name="invoice_type" value={type} onChange={(e) => setType(e.target.value)} disabled={lockedNumber}>
            <option value="Proforma">Proforma</option><option value="Taxable">Tax invoice</option><option value="Export">Export (against LUT)</option>
          </Select>
          {lockedNumber && <input type="hidden" name="invoice_type" value={type} />}
        </Field>
        <Field label="Billed by" htmlFor="invoice_by">
          <Select id="invoice_by" name="invoice_by" value={entity} onChange={(e) => setEntity(e.target.value)} disabled={lockedNumber}>
            {Object.values(ENTITIES).map((en) => <option key={en.code} value={en.code}>{en.label}</option>)}
          </Select>
          {lockedNumber && <input type="hidden" name="invoice_by" value={entity} />}
        </Field>
        <Field label="Series" htmlFor="invoice_by_type" hint={hasSeries ? undefined : "Only for the Mumbai and Indore offices"}>
          <Select id="invoice_by_type" name="invoice_by_type" defaultValue={defaults.invoice_by_type} disabled={!hasSeries || lockedNumber}>
            <option value="">--</option>
            {SERIES.map((s) => <option key={s} value={s}>{SERIES_LABEL[s]}</option>)}
          </Select>
          {(lockedNumber && hasSeries) && <input type="hidden" name="invoice_by_type" value={defaults.invoice_by_type} />}
        </Field>
        <Field label="Invoice date" htmlFor="invoice_date"><Input id="invoice_date" name="invoice_date" type="date" defaultValue={defaults.invoice_date} required /></Field>
        {!exp && <Field label="Place of supply" htmlFor="place_of_supply" className="sm:col-span-2"><Input id="place_of_supply" name="place_of_supply" defaultValue={defaults.place_of_supply} maxLength={100} /></Field>}
        {exp && (
          <Field label="Currency" htmlFor="currency_type">
            <Select id="currency_type" name="currency_type" defaultValue={defaults.currency_type} required>
              <option value="">--Select--</option>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Party prefix="recipient" title="Billed to" d={defaults} exp={exp} />
        <Party prefix="delivery" title="Delivered to" d={defaults} exp={exp} />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Services</h2>
        <datalist id="sac-list">{sacs.map((s) => <option key={s.sac} value={s.sac}>{s.description}</option>)}</datalist>
        <div className="space-y-3">
          {keys.map((k, i) => {
            const d = defaults.lines[k] ?? { service_description: "", sac: "", taxable_value: "", rupee_value: "" };
            return (
              <div key={k} className="grid items-end gap-3 sm:grid-cols-[1fr_110px_140px_140px_auto]" data-line>
                <Field label={i === 0 ? "Description" : ""}><Input name={`l${k}_desc`} defaultValue={d.service_description} maxLength={1000} aria-label={`Description ${i + 1}`} /></Field>
                <Field label={i === 0 ? "SAC" : ""}><Input name={`l${k}_sac`} list="sac-list" defaultValue={d.sac} maxLength={20} aria-label={`SAC ${i + 1}`} /></Field>
                <Field label={i === 0 ? (exp ? "Amount (foreign)" : "Taxable value") : ""}><Input name={`l${k}_amt`} inputMode="decimal" defaultValue={d.taxable_value} aria-label={`Amount ${i + 1}`} /></Field>
                {exp ? <Field label={i === 0 ? "Value in Rs" : ""}><Input name={`l${k}_inr`} inputMode="decimal" defaultValue={d.rupee_value} aria-label={`Rupee value ${i + 1}`} /></Field> : <span />}
                <button type="button" className="rounded-md px-3 py-2 text-sm text-danger hover:bg-red-50 disabled:opacity-40" disabled={keys.length === 1}
                  onClick={() => setKeys(keys.filter((x) => x !== k))} aria-label={`Remove line ${i + 1}`}>Remove</button>
              </div>
            );
          })}
        </div>
        <button type="button" className="mt-3 text-sm text-brand hover:underline" onClick={() => { setKeys([...keys, next]); setNext(next + 1); }}>+ Add another line</button>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {!exp && <Field label="Less: advance received (Rs)" htmlFor="advance"><Input id="advance" name="advance" inputMode="decimal" defaultValue={defaults.advance} /></Field>}
          <Field label="Add: out of pocket expenses (OPE)" htmlFor="ope"><Input id="ope" name="ope" inputMode="decimal" defaultValue={defaults.ope} /></Field>
        </div>
      </section>
      <SubmitButton>Save invoice</SubmitButton>
    </ActionForm>
  );
}

function Party({ prefix, title, d, exp }: { prefix: "recipient" | "delivery"; title: string; d: InvoiceDefaults; exp: boolean }) {
  const v = (f: string) => (d as unknown as Record<string, string>)[`${prefix}_${f}`] ?? "";
  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
      <h2 className="col-span-full text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <Field label="Name" htmlFor={`${prefix}_name`} className="col-span-full"><Input id={`${prefix}_name`} name={`${prefix}_name`} defaultValue={v("name")} maxLength={200} required={prefix === "recipient"} /></Field>
      <Field label="Address" htmlFor={`${prefix}_address`} className="col-span-full"><Textarea id={`${prefix}_address`} name={`${prefix}_address`} defaultValue={v("address")} maxLength={500} /></Field>
      <Field label="PAN" htmlFor={`${prefix}_pan`}><Input id={`${prefix}_pan`} name={`${prefix}_pan`} defaultValue={v("pan")} maxLength={20} /></Field>
      <Field label={exp ? "Tax ID / GST" : "GSTIN"} htmlFor={`${prefix}_gst`}><Input id={`${prefix}_gst`} name={`${prefix}_gst`} defaultValue={v("gst")} maxLength={20} /></Field>
      {!exp && <Field label="State code" htmlFor={`${prefix}_state_code`} hint={prefix === "delivery" ? "Decides CGST+SGST or IGST" : undefined}><Input id={`${prefix}_state_code`} name={`${prefix}_state_code`} defaultValue={v("state_code")} maxLength={4} /></Field>}
    </section>
  );
}
