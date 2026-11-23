"use client";
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background">Print / save as PDF</button>;
}
