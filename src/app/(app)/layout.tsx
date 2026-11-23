import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/roles";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const groups = navForRole(user.role);
  return (
    <div className="flex h-screen print:block print:h-auto">
      <div className="print:hidden contents"><Sidebar groups={groups} /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 print:hidden md:px-6">
          <MobileNav groups={groups} />
          <Link
            href="/ask"
            className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted transition-colors hover:border-accent"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1 truncate">Ask Easy D anything</span>
            <Sparkles className="size-4 text-accent" aria-hidden />
          </Link>
          <div className="ml-auto">
            <UserMenu name={user.name} empid={user.empid} roleLabel={ROLE_LABEL[user.role]} logout={logout} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0 md:p-8">{children}</main>
      </div>
    </div>
  );
}
