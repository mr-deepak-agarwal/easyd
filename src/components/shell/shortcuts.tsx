"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** "g" then a letter jumps to a page; people who live in the app stop reaching for the mouse. */
export const GO_KEYS: Record<string, { href: string; label: string }> = {
  d: { href: "/dashboard", label: "Dashboard" },
  t: { href: "/tasks", label: "Tasks" },
  l: { href: "/time-tracker", label: "Time tracker" },
  p: { href: "/projects", label: "Projects" },
  c: { href: "/calendar", label: "Calendar" },
  i: { href: "/invoices", label: "Invoices" },
  a: { href: "/ask", label: "Ask EasyD" },
  n: { href: "/notifications", label: "Notifications" },
};

const typing = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName));
};

export function useShortcuts({ allowed, openPalette, openHelp }: { allowed: Set<string>; openPalette: () => void; openHelp: () => void }) {
  const router = useRouter();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armed = useRef(false);
  useEffect(() => {
    const disarm = () => { armed.current = false; if (pending.current) clearTimeout(pending.current); };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector("[aria-modal=true]")) return;
      if (armed.current) {
        const dest = GO_KEYS[e.key.toLowerCase()]; disarm();
        if (dest && allowed.has(dest.href)) { e.preventDefault(); router.push(dest.href); }
        return;
      }
      if (e.key === "/") { e.preventDefault(); openPalette(); }
      else if (e.key === "?") { e.preventDefault(); openHelp(); }
      else if (e.key.toLowerCase() === "c" && allowed.has("/tasks")) { e.preventDefault(); router.push("/tasks?new=1"); }
      else if (e.key.toLowerCase() === "g") { armed.current = true; pending.current = setTimeout(disarm, 1200); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); disarm(); };
  }, [allowed, openPalette, openHelp, router]);
}

export function ShortcutHelp({ allowed, onClose }: { allowed: Set<string>; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const rows: [string, string][] = [
    ["Ctrl K  or  /", "Search and jump"], ["C", "New task"], ["?", "This list"],
    ...Object.entries(GO_KEYS).filter(([, v]) => allowed.has(v.href)).map(([k, v]): [string, string] => [`G then ${k.toUpperCase()}`, v.label]),
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl outline-none">
        <h2 className="mb-3 text-base font-semibold">Keyboard shortcuts</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map(([k, d]) => (<div key={k} className="contents"><dt><kbd className="rounded border border-border bg-raised px-1.5 py-0.5 text-xs">{k}</kbd></dt><dd className="text-muted">{d}</dd></div>))}
        </dl>
        <p className="mt-4 text-xs text-muted">Shortcuts pause while you type in a field.</p>
      </div>
    </div>
  );
}
