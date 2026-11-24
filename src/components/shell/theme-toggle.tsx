"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const subscribe = (cb: () => void) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => o.disconnect(); };
const get = () => document.documentElement.dataset.theme === "dark";

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, get, () => false);
  return (
    <button type="button" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"}
      onClick={() => { const t = dark ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("easyd-theme", t); } catch { /* private mode */ } }}
      className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-raised hover:text-foreground">
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
