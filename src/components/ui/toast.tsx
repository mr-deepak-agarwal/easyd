"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";

type ToastOptions = { undo?: () => void | Promise<void>; tone?: "ok" | "error" };
type Item = { id: number; message: string; undo?: () => void | Promise<void>; tone: "ok" | "error" };
type Ctx = { toast: (message: string, opts?: ToastOptions) => void };

const ToastContext = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

/** Small confirmations at the bottom of the screen. A toast with Undo stays longer so people can react. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id); if (t) clearTimeout(t); timers.current.delete(id);
    setItems((l) => l.filter((x) => x.id !== id));
  }, []);
  const toast = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = next.current++;
    setItems((l) => [...l.slice(-2), { id, message, undo: opts.undo, tone: opts.tone ?? "ok" }]);
    timers.current.set(id, setTimeout(() => dismiss(id), opts.undo ? 8000 : opts.tone === "error" ? 7000 : 4000));
  }, [dismiss]);
  useEffect(() => { const m = timers.current; return () => { m.forEach(clearTimeout); m.clear(); }; }, []);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 print:hidden">
        {items.map((t) => (
          <div key={t.id} className="toast-in pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card py-2.5 pl-4 pr-2 text-sm shadow-2xl">
            {t.tone === "error" ? <TriangleAlert className="size-4 shrink-0 text-danger" aria-hidden /> : <CheckCircle2 className="size-4 shrink-0 text-accent" aria-hidden />}
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.undo && <button type="button" onClick={async () => { dismiss(t.id); await t.undo!(); }} className="rounded-lg px-2.5 py-1 font-medium text-brand hover:bg-brand-soft">Undo</button>}
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-raised"><X className="size-4" aria-hidden /></button>
          </div>))}
      </div>
    </ToastContext.Provider>
  );
}
