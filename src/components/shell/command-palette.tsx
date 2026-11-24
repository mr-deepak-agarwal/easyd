"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, Sparkles } from "lucide-react";
import type { NavGroup } from "@/lib/nav";
import { iconFor } from "./icons";
import { cn } from "@/lib/utils";

type Entry = { key: string; label: string; hint: string; href: string; ask?: boolean; Icon: ReturnType<typeof iconFor> };

export function CommandPalette({ groups, onClose }: { groups: NavGroup[]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState(""), [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const all = useMemo<Entry[]>(() => groups.flatMap((g) => g.items.map((i) => ({ key: i.href, label: i.label, hint: g.label, href: i.href, Icon: iconFor(g.label) }))), [groups]);
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    const found = t ? all.filter((e) => `${e.label} ${e.hint}`.toLowerCase().includes(t)).slice(0, 8) : all.slice(0, 8);
    const asks: Entry[] = t.length >= 3 ? [{ key: "ask", label: `Ask EasyD: "${q.trim()}"`, hint: "AI", href: `/ask?q=${encodeURIComponent(q.trim().slice(0, 300))}`, ask: true, Icon: Sparkles }] : [];
    return [...found, ...asks];
  }, [q, all]);

  useEffect(() => { input.current?.focus(); }, []);
  const go = (e: Entry | undefined) => { if (!e) return; onClose(); router.push(e.href); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Search and jump" className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); go(hits[sel]); }
        }}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Jump to a page, or type a question to ask EasyD" aria-label="Search" role="combobox" aria-expanded aria-controls="palette-list"
            className="palette-input h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {hits.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No page matches. Keep typing to ask EasyD.</li>}
          {hits.map((e, i) => (
            <li key={e.key} role="option" aria-selected={i === sel}>
              <button type="button" onMouseEnter={() => setSel(i)} onClick={() => go(e)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", i === sel ? "bg-brand-soft text-brand" : "text-foreground")}>
                <e.Icon className={cn("size-4 shrink-0", e.ask ? "text-accent" : "text-muted")} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                <span className="text-xs text-muted">{e.hint}</span>
                {i === sel && <CornerDownLeft className="size-3.5 text-muted" aria-hidden />}
              </button>
            </li>))}
        </ul>
      </div>
    </div>
  );
}
