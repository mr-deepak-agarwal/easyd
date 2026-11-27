"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { deleteView, saveView } from "./actions";

export type View = { id: number; name: string; query: string };

/** Saved filters for the person: click to apply, X to remove, "Save view" to keep the current filters under a name. */
export function SavedViews({ views, currentQuery }: { views: View[]; currentQuery: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (p: { error?: string; ok?: string }, fd: FormData) => {
    const r = await saveView(p, fd);
    if (r.ok) setOpen(false);
    return r;
  }, {});
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Saved views">
      {views.map((v) => (
        <span key={v.id} className={`inline-flex items-center rounded-full border text-sm ${v.query === currentQuery ? "border-brand bg-brand-soft text-brand" : "border-border bg-card"}`}>
          <Link href={v.query ? `/tasks?${v.query}` : "/tasks"} className="rounded-l-full py-1 pl-3 pr-1.5 hover:text-brand">{v.name}</Link>
          <button type="button" aria-label={`Remove view ${v.name}`} onClick={() => deleteView(v.id)} className="mr-1 grid size-5 place-items-center rounded-full text-muted hover:bg-raised"><X className="size-3" aria-hidden /></button>
        </span>))}
      {open ? (
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="query" value={currentQuery} />
          <input name="name" autoFocus required maxLength={40} aria-label="View name" placeholder="Name this view" className="w-40 rounded-lg border border-border bg-card px-2.5 py-1 text-sm" />
          <button disabled={pending} className="rounded-lg bg-brand px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Save</button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-raised">Cancel</button>
          {state.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted hover:border-brand hover:text-brand"><Bookmark className="size-3.5" aria-hidden />Save view</button>
      )}
    </div>
  );
}
