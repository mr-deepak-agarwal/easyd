import Link from "next/link";
import { requireUser } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/roles";
import { GROUP_TINT, NavIcon } from "@/components/nav-icons";

const TZ = "Asia/Kolkata";

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: TZ }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// What people open most; shown first when their role allows it.
const QUICK = ["/time-tracker", "/tasks", "/hr/leave", "/hr/attendance", "/ask"];

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const allGroups = navForRole(user.role);
  const groups = allGroups
    .filter((g) => g.label !== "Home")
    .map((g) => ({ ...g, items: g.items.filter((i) => i.href !== "/dashboard") }))
    .filter((g) => g.items.length > 0);
  const all = allGroups.flatMap((g) => g.items);
  const quick = QUICK.map((href) => all.find((i) => i.href === href)).filter((i) => !!i);
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(now);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting(now)}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted">{today}</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
          {user.empid} · {ROLE_LABEL[user.role]}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {quick.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:border-accent hover:text-brand"
          >
            <NavIcon href={i.href} className="size-4 text-accent" />
            {i.label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <section key={g.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <h2 className="px-2 pb-2 pt-1 text-sm font-semibold">{g.label}</h2>
            <ul>
              {g.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-background">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${GROUP_TINT[g.label] ?? GROUP_TINT.Admin}`}>
                      <NavIcon href={i.href} className="size-4" />
                    </span>
                    <span className="truncate">{i.label}</span>
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
