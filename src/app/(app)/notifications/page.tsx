import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { timeAgo } from "@/lib/notify-core";
import { PageHeader, Card } from "@/components/ui/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { KIND_ICON } from "@/components/shell/kind-icons";
import { Bell } from "lucide-react";
import { markAllRead, setEmailPref } from "./actions";

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: items }, { data: prefs }] = await Promise.all([
    supabase.from("notifications").select("id, kind, title, body, href, created_at, read_at").order("id", { ascending: false }).limit(100),
    supabase.from("notification_prefs").select("email_enabled").eq("profile_id", user.id).maybeSingle(),
  ]);
  const emailOn = prefs?.email_enabled ?? true;
  const unread = (items ?? []).filter((n) => !n.read_at).length;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Notifications" description={unread ? `${unread} unread` : "You are all caught up"}>
        {unread > 0 && <form action={markAllRead}><button className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-raised">Mark all read</button></form>}
      </PageHeader>
      <Card title="Email">
        <ActionForm action={setEmailPref} className="flex flex-wrap items-center gap-4" resetOnSuccess={false}>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="email" defaultChecked={emailOn} className="size-4 accent-[var(--brand)]" />Send me a morning email with what needs my attention</label>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </ActionForm>
      </Card>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow)]">
        {items?.length ? items.map((n) => { const Icon = KIND_ICON[n.kind] ?? Bell; return (
          <li key={n.id} className={n.read_at ? "" : "bg-brand-soft/40"}>
            <Link href={n.href ?? "/notifications"} className="flex gap-3 px-4 py-3 hover:bg-raised">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon className="size-4" aria-hidden /></span>
              <span className="min-w-0 flex-1"><span className={`block text-sm ${n.read_at ? "" : "font-medium"}`}>{n.title}</span>{n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}</span>
              <span className="shrink-0 text-xs text-muted">{timeAgo(n.created_at)}</span>
            </Link>
          </li>); }) : <li className="px-4 py-12 text-center text-sm text-muted">Nothing yet. You will see task assignments, mentions, comments and reminders here.</li>}
      </ul>
    </div>
  );
}
