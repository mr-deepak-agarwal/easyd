import { cn } from "@/lib/utils";

const base = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted/70 focus:border-brand disabled:bg-raised disabled:text-muted";

export function Field({ label, htmlFor, hint, children, className }: {
  label: string; htmlFor?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(base, props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn(base, props.className)} />;
}
