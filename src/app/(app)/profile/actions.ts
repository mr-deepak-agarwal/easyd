"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  current: z.string().min(1, "Enter your current password"),
  next: z.string().min(8, "New password must be at least 8 characters").max(72),
  confirm: z.string(),
}).refine((v) => v.next === v.confirm, { message: "The new passwords do not match", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "Choose a password different from the current one", path: ["next"] });

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Verify the current password with a throwaway client so the user's own session is untouched.
  const check = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await check.auth.signInWithPassword({ email: user.empid, password: parsed.data.current });
  if (wrong) return { error: "Your current password is incorrect" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) return { error: "Could not change the password" };
  return { ok: "Your password was changed" };
}
