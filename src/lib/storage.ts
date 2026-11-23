import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

export type UploadResult = { path: string } | { error: string };

function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-100);
}

/** Validates (type, size) and stores a file in a private bucket. Returns the object path. */
export async function uploadFile(bucket: string, folder: string, file: File, maxBytes: number): Promise<UploadResult> {
  if (file.size > maxBytes) return { error: `${file.name} is larger than ${Math.round(maxBytes / 1048576)} MB` };
  if (!ALLOWED.has(file.type)) return { error: `${file.name}: only PDF, Word, Excel or image files are allowed` };
  const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await createAdminClient().storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) return { error: `Could not upload ${file.name}` };
  return { path };
}

/** Short-lived download link. Only call after checking the user is allowed to see the file. */
export async function signedUrl(bucket: string, path: string, seconds = 60): Promise<string | null> {
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
