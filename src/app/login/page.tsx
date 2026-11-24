"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-rail p-4">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full bg-white/[0.05]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-52 -right-32 size-[40rem] rounded-full bg-white/[0.04]" />
      <form action={action} className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand text-[15px] font-semibold text-white">ED</span>
          <div><div className="text-xl font-semibold leading-tight">Easy D</div><p className="text-sm text-muted">Log in to your workspace</p></div>
        </div>
        <label className="mb-1 block text-sm font-medium" htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" required
          className="mb-4 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand" />
        <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="mb-5 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand" />
        {state.error && <p role="alert" className="mb-3 text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 active:scale-[.98] disabled:opacity-60">
          {pending ? "Signing in..." : "Log in"}
        </button>
      </form>
    </main>
  );
}
