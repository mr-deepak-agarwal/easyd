"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { NON_CHARGEABLE } from "@/lib/time";

import { DraftButton } from "@/components/ai/draft-button";
import { tidyWork } from "./ai-actions";

export type TimeDefaults = { entry_date: string; kind: "chargeable" | "non"; project_id: string; category: string; work: string; hours: string; minutes: string };

export function TimeFields({ defaults, projects }: { defaults: TimeDefaults; projects: { id: number; label: string; mine?: boolean }[] }) {
  const [kind, setKind] = useState(defaults.kind);
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Field label="Date" htmlFor="entry_date"><Input id="entry_date" name="entry_date" type="date" defaultValue={defaults.entry_date} required /></Field>
      <fieldset className="sm:col-span-3">
        <legend className="mb-1 text-sm font-medium">Type of work</legend>
        <div className="flex gap-5 py-2 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="kind" value="chargeable" checked={kind === "chargeable"} onChange={() => setKind("chargeable")} /> Chargeable</label>
          <label className="flex items-center gap-2"><input type="radio" name="kind" value="non" checked={kind === "non"} onChange={() => setKind("non")} /> Non chargeable</label>
        </div>
      </fieldset>
      {kind === "chargeable" ? (
        <Field label="Project" htmlFor="project_id" className="sm:col-span-4">
          <Select id="project_id" name="project_id" defaultValue={defaults.project_id}>
            <option value="">Choose the project</option>
            {projects.some((p) => p.mine !== undefined) ? (<>
              <optgroup label="My projects">{projects.filter((p) => p.mine).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
              <optgroup label="Other projects (not on my team)">{projects.filter((p) => !p.mine).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
            </>) : projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
          {projects.some((p) => p.mine !== undefined) && <p className="mt-1 text-xs text-muted">Time on a project you are not assigned to is allowed, but it is flagged and lowers your appraisal score.</p>}
        </Field>
      ) : (
        <Field label="Category" htmlFor="category" className="sm:col-span-4">
          <Select id="category" name="category" defaultValue={defaults.category}>
            <option value="">Choose a category</option>
            {NON_CHARGEABLE.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Work accomplished" htmlFor="work" className="sm:col-span-4"><Textarea id="work" name="work" defaultValue={defaults.work} maxLength={2000} required />
        <div className="mt-1"><DraftButton target="work" label="Tidy my wording with AI" run={(f) => tidyWork(String((f.elements.namedItem("work") as HTMLTextAreaElement | null)?.value ?? ""))} /></div></Field>
      <Field label="Hours" htmlFor="hours"><Input id="hours" name="hours" inputMode="numeric" defaultValue={defaults.hours} /></Field>
      <Field label="Minutes" htmlFor="minutes"><Input id="minutes" name="minutes" inputMode="numeric" defaultValue={defaults.minutes} /></Field>
    </div>
  );
}
