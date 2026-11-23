import { requireUser } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/roles";
import { Sidebar } from "@/components/sidebar";
import Link from "next/link";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex h-screen print:block print:h-auto">
      <div className="print:hidden contents"><Sidebar groups={navForRole(user.role)} /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex print:hidden items-center justify-between border-b border-border bg-card px-6 py-3">
          <div className="text-sm text-muted">Hello, <span className="font-medium text-foreground">{user.name}</span></div>
          <div className="flex items-center gap-4 text-sm">
            <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">{user.empid} - {ROLE_LABEL[user.role]}</span>
            <Link href="/profile" className="text-muted hover:text-foreground">My account</Link>
            <form action={logout}>
              <button className="text-muted hover:text-foreground" type="submit">Logout</button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
