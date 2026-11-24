"use client";

import { useRef, useState, useTransition } from "react";
import type { DraftResult } from "@/lib/ai-core";

/**
 * Fills a text box with an AI draft. `collect` reads what the server needs from the surrounding form;
 * the person always edits and saves it themselves.
 */
export function DraftButton({ run, target, label = "Draft with AI" }: { run: (form: HTMLFormElement) => Promise<DraftResult>; target: string; label?: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button ref={ref} type="button" disabled={pending} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-raised disabled:opacity-50"
        onClick={() => {
          const form = ref.current?.closest("form"); if (!form) return;
          setMsg("");
          start(async () => {
            const r = await run(form);
            const box = form.elements.namedItem(target) as HTMLTextAreaElement | null;
            if (r.text && box) { box.value = r.text; box.dispatchEvent(new Event("input", { bubbles: true })); setMsg("Draft added. Please read and edit it before saving."); }
            else setMsg(r.error ?? "No draft was produced.");
          });
        }}>{pending ? "Drafting..." : label}</button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
