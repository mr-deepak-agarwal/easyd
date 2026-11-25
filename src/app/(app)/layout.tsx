import { requireUser } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/roles";
import { AppShell } from "@/components/shell/app-shell";
import { logout } from "@/app/login/actions";
import { ToastProvider } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const { count } = await (await createClient()).from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return (
    <ToastProvider>
    <AppShell unread={count ?? 0} groups={navForRole(user.role)} user={{ name: user.name, empid: user.empid, roleLabel: ROLE_LABEL[user.role] }} logout={logout}>
      {children}
    </AppShell>
    </ToastProvider>
  );
}
