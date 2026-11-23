import Link from "next/link";
import { requireUser } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/roles";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const groups = navForRole(user.role)
    .map((g) => ({ ...g, items: g.items.filter((i) => i.href !== "/dashboard") }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <h1 className="text-xl font-semibold text-brand">
        {greeting()}, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-muted">{ROLE_LABEL[user.role]} workspace. Jump to where you need to be.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <section key={g.label} className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
            <ul className="space-y-1">
              {g.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="block rounded-md px-2 py-1.5 text-sm hover:bg-brand-soft hover:text-brand">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
