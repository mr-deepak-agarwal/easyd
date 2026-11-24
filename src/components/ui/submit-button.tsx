"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  confirm?: string; // shows a browser confirmation before submitting
};

const styles = {
  primary: "bg-brand text-white hover:brightness-110",
  secondary: "border border-border bg-card text-foreground hover:bg-raised",
  danger: "bg-red-600 text-white hover:brightness-110",
  ghost: "text-brand hover:bg-brand-soft",
};

export function SubmitButton({ variant = "primary", confirm, className, children, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      className={cn("rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[.98] disabled:opacity-60", styles[variant], className)}
      {...rest}
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}
