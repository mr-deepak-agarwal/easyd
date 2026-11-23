"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { computeCosting, FACTOR_PRESETS } from "@/lib/costing";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";

type Grade = { id: number; grade: string; cost: number };
type Row = { key: number; gradeId: string; employees: string; hoursPerEmployee: string; days: string };

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
const num = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? 0 : Number(s));

/** React clears a form after its action finishes. This re-renders afterwards so the controlled fields show their values again. */
function Resync({ onDone }: { onDone: () => void }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  useEffect(() => { if (was.current && !pending) onDone(); was.current = pending; }, [pending, onDone]);
  return null;
}

/** Live cost calculator. The server recomputes everything on save, so this is only a preview. */
export function Calculator({ grades, overheadRate, target }: { grades: Grade[]; overheadRate: number; target: string }) {
  const [rows, setRows] = useState<Row[]>([{ key: 1, gradeId: "", employees: "1", hoursPerEmployee: "8", days: "1" }]);
  const [overheadHours, setOverheadHours] = useState("0");
  const [factor, setFactor] = useState("2");
  const [nextKey, setNextKey] = useState(2);
  const [, setTick] = useState(0);

  const valid = rows.filter((r) => r.gradeId);
  const rate = (id: string) => Number(grades.find((g) => String(g.id) === id)?.cost ?? 0);
  const result = useMemo(
    () => computeCosting(valid.map((r) => ({ rate: rate(r.gradeId), employees: num(r.employees), hoursPerEmployee: num(r.hoursPerEmployee), days: num(r.days) })),
      num(overheadHours), overheadRate, num(factor)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, overheadHours, factor, overheadRate],
  );
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-5">
      <Resync onDone={() => setTick((t) => t + 1)} />
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="overheadHours" value={num(overheadHours)} />
      <input type="hidden" name="factor" value={num(factor)} />
      <input type="hidden" name="lines" value={JSON.stringify(valid.map((r) => ({
        gradeId: Number(r.gradeId), employees: num(r.employees), hoursPerEmployee: num(r.hoursPerEmployee), days: num(r.days) })))} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-background text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Grade</th><th className="px-3 py-2">People</th><th className="px-3 py-2">Hours / person / day</th>
              <th className="px-3 py-2">Days</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-right">Cost</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const idx = valid.findIndex((v) => v.key === r.key);
              return (
                <tr key={r.key} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Select value={r.gradeId} onChange={(e) => update(r.key, { gradeId: e.target.value })} aria-label="Grade">
                      <option value="">Choose grade</option>
                      {grades.map((g) => <option key={g.id} value={g.id}>{g.grade} ({inr(g.cost)}/h)</option>)}
                    </Select>
                  </td>
                  <td className="px-3 py-2"><Input type="number" min={1} value={r.employees} onChange={(e) => update(r.key, { employees: e.target.value })} className="w-24" aria-label="People" /></td>
                  <td className="px-3 py-2"><Input type="number" min={0.25} step={0.25} value={r.hoursPerEmployee} onChange={(e) => update(r.key, { hoursPerEmployee: e.target.value })} className="w-28" aria-label="Hours per person per day" /></td>
                  <td className="px-3 py-2"><Input type="number" min={1} value={r.days} onChange={(e) => update(r.key, { days: e.target.value })} className="w-24" aria-label="Days" /></td>
                  <td className="px-3 py-2 text-right">{idx >= 0 ? result.lines[idx].hours : 0}</td>
                  <td className="px-3 py-2 text-right">{idx >= 0 ? inr(result.lines[idx].cost) : "-"}</td>
                  <td className="px-3 py-2">
                    {rows.length > 1 && <button type="button" className="text-sm text-danger hover:underline" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Remove</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="text-sm text-brand hover:underline"
        onClick={() => { setRows((rs) => [...rs, { key: nextKey, gradeId: "", employees: "1", hoursPerEmployee: "8", days: "1" }]); setNextKey((k) => k + 1); }}>
        + Add another grade
      </button>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={`Overhead hours (at ${inr(overheadRate)}/h)`} htmlFor="oh"><Input id="oh" type="number" min={0} value={overheadHours} onChange={(e) => setOverheadHours(e.target.value)} /></Field>
        <Field label="Multiplying factor" htmlFor="factor">
          <div className="flex gap-2">
            {FACTOR_PRESETS.map((f) => (
              <button type="button" key={f} onClick={() => setFactor(String(f))}
                className={`rounded-md border px-3 py-2 text-sm ${num(factor) === f ? "border-brand bg-brand text-white" : "border-border bg-white"}`}>x{f}</button>
            ))}
            <Input id="factor" type="number" min={0.1} step={0.1} value={factor} onChange={(e) => setFactor(e.target.value)} className="w-24" />
          </div>
        </Field>
      </div>

      <dl className="grid max-w-md grid-cols-2 gap-y-1 rounded-xl border border-border bg-card p-4 text-sm">
        <dt className="text-muted">Grade costs</dt><dd className="text-right">{inr(result.subtotal)}</dd>
        <dt className="text-muted">Overheads</dt><dd className="text-right">{inr(result.overheadCost)}</dd>
        <dt className="text-muted">Base cost</dt><dd className="text-right">{inr(result.base)}</dd>
        <dt className="font-semibold">Quoted total (x{num(factor)})</dt><dd className="text-right text-lg font-semibold text-brand" data-testid="total">{inr(result.total)}</dd>
      </dl>
      <SubmitButton disabled={valid.length === 0}>Save costing</SubmitButton>
    </div>
  );
}
