"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractMentions } from "@/lib/notify-core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i);
const date = z.string().transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null));
const taskSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  description: z.string().trim().max(4000).transform((v) => v || null),
  starts_on: date, ends_on: date,
});

function parse(formData: FormData) {
  const fields = taskSchema.safeParse({
    title: formData.get("title") ?? "", description: formData.get("description") ?? "",
    starts_on: formData.get("starts_on") ?? "", ends_on: formData.get("ends_on") ?? "",
  });
  if (!fields.success) return { error: fields.error.issues[0].message } as const;
  if (fields.data.starts_on && fields.data.ends_on && fields.data.ends_on < fields.data.starts_on) return { error: "The end date is before the start date" } as const;
  const responsible = new Set(formData.getAll("responsible").map(String).filter((v) => uuid.safeParse(v).success));
  const others = new Set(formData.getAll("participants").map(String).filter((v) => uuid.safeParse(v).success));
  if (responsible.size === 0) return { error: "Choose at least one responsible person" } as const;
  const people = [...responsible].map((id) => ({ profile_id: id, is_responsible: true }))
    .concat([...others].filter((id) => !responsible.has(id)).map((id) => ({ profile_id: id, is_responsible: false })));
  return { fields: fields.data, people } as const;
}

/** Creates a general task (projectId null) or a project task. */
export async function createTask(projectId: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { data: task, error } = await supabase.from("tasks").insert({
    ...parsed.fields, project_id: projectId, status: "created", created_by: user.id, created_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !task) return { error: "Could not create the task" };
  const { error: pErr } = await supabase.from("task_participants").insert(parsed.people.map((p) => ({ task_id: task.id, ...p })));
  if (pErr) {
    await supabase.from("tasks").delete().eq("id", task.id);
    return { error: "Could not add the people to the task" };
  }
  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  redirect(`/tasks/${task.id}`);
}

export async function updateTask(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update({ ...parsed.fields, edited_by: user.id, edited_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "You are not allowed to change this task" };
  // Replace the people list: add the new ones first, then remove the ones taken off, so a failure never leaves the task empty.
  const wanted = new Map(parsed.people.map((p) => [p.profile_id, p.is_responsible]));
  const { error: upErr } = await supabase.from("task_participants").upsert(parsed.people.map((p) => ({ task_id: id, ...p })), { onConflict: "task_id,profile_id" });
  if (upErr) return { error: "Could not update the people on the task" };
  const { data: current } = await supabase.from("task_participants").select("profile_id").eq("task_id", id);
  const drop = (current ?? []).map((c) => c.profile_id).filter((pid) => !wanted.has(pid));
  if (drop.length) await supabase.from("task_participants").delete().eq("task_id", id).in("profile_id", drop);
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/tasks");
  return { ok: "Task saved" };
}

export async function setTaskStatus(id: number, done: boolean): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("tasks").update({ status: done ? "completed" : "created", completed_at: done ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/tasks");
}

export async function addComment(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const comment = z.string().trim().min(1, "Write a comment").max(2000).safeParse(formData.get("comment") ?? "");
  if (!comment.success) return { error: comment.error.issues[0].message };
  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id, name").eq("active", true);
  const mentions = extractMentions(comment.data, people ?? []).filter((m) => m !== user.id);
  const { error } = await supabase.from("task_comments").insert({ task_id: id, user_id: user.id, comment: comment.data, created_at: new Date().toISOString(), mentions });
  if (error) return { error: "You cannot comment on this task" };
  revalidatePath(`/tasks/${id}`);
  return { ok: "" };
}
