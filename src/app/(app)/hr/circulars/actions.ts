"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { uploadFile } from "@/lib/storage";
import { todayIST } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel rejects request bodies over 4.5 MB

export async function addCircular(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["admin"]);
  const title = z.string().trim().min(1, "Enter a title").max(100, "Title is too long").safeParse(formData.get("title"));
  if (!title.success) return { error: title.error.issues[0].message };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload" };

  const uploaded = await uploadFile("circulars", "circular", file, MAX_BYTES);
  if ("error" in uploaded) return { error: uploaded.error };

  const supabase = await createClient();
  const { error } = await supabase.from("circulars").insert({
    title: title.data, file_path: uploaded.path, entered_by: user.id, entered_on: todayIST(),
  });
  if (error) return { error: "Could not save the circular" };
  revalidatePath("/hr/circulars");
  return { ok: "Circular published" };
}

// Soft delete: the row and the file are kept for the record.
export async function removeCircular(id: number): Promise<void> {
  const user = await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("circulars").update({ active: false, deleted_by: user.id, deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/hr/circulars");
}
