"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand p-4">
      <form action={action} className="w-full max-w-sm rounded-xl bg-card p-8 shadow-xl">
        <div className="mb-6">
          <div className="text-2xl font-semibold text-brand">Easy D</div>
          <p className="mt-1 text-sm text-muted">Welcome back. Please log in to your account.</p>
        </div>
        <label className="mb-1 block text-sm font-medium" htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" required
          className="mb-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand" />
        <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="mb-4 w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand" />
        {state.error && <p role="alert" className="mb-3 text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending}
          className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
