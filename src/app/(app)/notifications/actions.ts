"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

export type Note = { id: number; kind: string; title: string; body: string | null; href: string | null; created_at: string; read_at: string | null };

export async function getNotifications(): Promise<{ items: Note[]; unread: number }> {
  await requireUser();
  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("notifications").select("id, kind, title, body, href, created_at, read_at").order("id", { ascending: false }).limit(10),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return { items: data ?? [], unread: count ?? 0 };
}

export async function getUnreadCount(): Promise<number> {
  await requireUser();
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function markRead(id: number): Promise<void> {
  await requireUser();
  if (!Number.isInteger(id)) return;
  const supabase = await createClient();
  await supabase.rpc("mark_notification_read", { p_id: id });
}

export async function markAllRead(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
  revalidatePath("/notifications");
}

export async function setEmailPref(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const on = formData.get("email") === "on";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_email_notifications", { p_on: on });
  if (error) return { error: "Could not save your choice" };
  revalidatePath("/notifications");
  return { ok: on ? "Email digest is on" : "Email digest is off" };
}
