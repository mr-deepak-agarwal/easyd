import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDigest } from "@/lib/notify-core";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function emailOf(admin: ReturnType<typeof createAdminClient>, id: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(id).catch(() => ({ data: null }));
  if (data?.user?.email) return data.user.email;
  const { data: d } = await admin.from("employee_details").select("email").eq("profile_id", id).maybeSingle();
  return d?.email ?? null;
}

/**
 * Daily job (Vercel Cron, 08:00 India time): creates due-date reminders, then emails each person one digest
 * of what they have not read yet. Protected by CRON_SECRET; Vercel sends it as a bearer token.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!same(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: reminders, error: rErr } = await admin.rpc("generate_due_notifications");
  if (rErr) return NextResponse.json({ error: "Could not create reminders" }, { status: 500 });

  const out = { reminders: reminders ?? 0, emailed: 0, skipped: 0, failed: 0, email: "off" as "off" | "on" };
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) return NextResponse.json(out);
  out.email = "on";

  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const since = new Date(Date.now() - 3 * 86400_000).toISOString();
  const [{ data: pending }, { data: off }] = await Promise.all([
    admin.from("notifications").select("id, profile_id, title, body, href, profiles!notifications_profile_id_fkey(name)").is("emailed_at", null).is("read_at", null).gte("created_at", since).order("id").limit(1000),
    admin.from("notification_prefs").select("profile_id").eq("email_enabled", false),
  ]);
  const optedOut = new Set((off ?? []).map((o) => o.profile_id));
  const byPerson = new Map<string, NonNullable<typeof pending>>();
  for (const n of pending ?? []) { if (optedOut.has(n.profile_id)) { out.skipped++; continue; } byPerson.set(n.profile_id, [...(byPerson.get(n.profile_id) ?? []), n]); }

  const resend = (process.env.RESEND_BASE_URL || "https://api.resend.com").replace(/\/$/, "");
  for (const [id, list] of [...byPerson].slice(0, 200)) {
    const to = await emailOf(admin, id);
    if (!to) { out.skipped++; continue; }
    const mail = buildDigest((list[0].profiles as { name: string } | null)?.name ?? "", list, base);
    try {
      const res = await fetch(`${resend}/emails`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to, subject: mail.subject, text: mail.text, html: mail.html }), signal: AbortSignal.timeout(20_000) });
      if (!res.ok) { out.failed++; continue; }
      await admin.from("notifications").update({ emailed_at: new Date().toISOString() }).in("id", list.map((n) => n.id));
      out.emailed++;
    } catch { out.failed++; }
  }
  return NextResponse.json(out);
}
