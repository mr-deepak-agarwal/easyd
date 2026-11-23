import { NAV } from "@/lib/nav";
import { requireUser } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

// Shown for sidebar links whose module is not available yet.
export default async function ModulePlaceholder({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const href = "/" + slug.join("/");
  const user = await requireUser();
  const item = NAV.flatMap((g) => g.items).find((i) => i.href === href);
  if (!item) notFound();
  if (!item.roles.includes(user.role)) redirect("/dashboard");
  return (
    <div>
      <h1 className="text-xl font-semibold text-brand">{item.label}</h1>
      <p className="mt-2 text-sm text-muted">This section is not available yet.</p>
    </div>
  );
}
