import { requireUser } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/roles";
import { AppShell } from "@/components/shell/app-shell";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <AppShell groups={navForRole(user.role)} user={{ name: user.name, empid: user.empid, roleLabel: ROLE_LABEL[user.role] }} logout={logout}>
      {children}
    </AppShell>
  );
}
