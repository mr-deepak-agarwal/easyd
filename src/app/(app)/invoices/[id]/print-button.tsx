"use client";
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-raised">Print / save as PDF</button>;
}
