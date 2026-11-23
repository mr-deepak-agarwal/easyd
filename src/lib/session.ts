import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRole, type Role } from "@/lib/roles";

export type SessionUser = { id: string; empid: string; name: string; role: Role };

// Server-side source of truth for "who is this and what role do they have".
// Always verified against the database profile, never trusted from the browser.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, empid, name, role, active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile || !profile.active || !isRole(profile.role)) return null;
  return { id: profile.id, empid: profile.empid, name: profile.name, role: profile.role };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowed: readonly Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect("/dashboard");
  return user;
}
