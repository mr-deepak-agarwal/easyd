import { logout } from "@/app/login/actions";

export default function AccountProblemPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-rail p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <h1 className="text-xl font-semibold">Your account is not ready</h1>
        <p className="mt-2 text-sm text-muted">You are signed in, but this login has no active staff profile in Easy D. Ask an admin to create your profile or to switch it back on, then log in again.</p>
        <form action={logout} className="mt-6"><button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110">Log out</button></form>
      </div>
    </main>
  );
}
