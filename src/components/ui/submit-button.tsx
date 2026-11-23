"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  confirm?: string; // shows a browser confirmation before submitting
};

const styles = {
  primary: "bg-brand text-white hover:opacity-90",
  secondary: "border border-border bg-white text-foreground hover:bg-background",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-brand hover:bg-brand-soft",
};

export function SubmitButton({ variant = "primary", confirm, className, children, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      className={cn("rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60", styles[variant], className)}
      {...rest}
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}
