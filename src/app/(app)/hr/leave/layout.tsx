import { requireUser } from "@/lib/session";
import { Tabs } from "@/components/ui/tabs";

export default async function LeaveLayout({ children }: LayoutProps<"/hr/leave">) {
  const user = await requireUser();
  const tabs = [{ label: "My Leave", href: "/hr/leave" }];
  if (["admin", "teamlead", "teamlead2"].includes(user.role)) tabs.push({ label: "Approvals", href: "/hr/leave/approvals" });
  if (user.role === "admin") tabs.push({ label: "Leave Quota", href: "/hr/leave/quota" });
  return (
    <div>
      {tabs.length > 1 && <Tabs items={tabs} />}
      {children}
    </div>
  );
}
