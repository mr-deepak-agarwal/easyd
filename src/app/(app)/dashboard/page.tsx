import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div>
      <h1 className="text-xl font-semibold text-brand">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">
        Signed in as {user.name}. The department charts and widgets arrive with module M2.
      </p>
    </div>
  );
}
