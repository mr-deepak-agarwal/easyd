"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { uploadFile } from "@/lib/storage";
import type { ActionState } from "@/lib/action-state";

const text = (max: number) => z.string().trim().max(max);
const nullable = (max: number) => text(max).transform((v) => v || null);
const date = z.string().transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null));
const raw = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
const first = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form";
const MAX_FILE = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB
const refresh = (id: number) => revalidatePath(`/projects/${id}`);
const NOT_ALLOWED = "You are not allowed to do that on this project";

const detailsSchema = z.object({
  start_date: date, end_date: date,
  num_hours: z.string().trim().transform((v) => (v === "" ? null : Number(v))).refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Enter hours as a number"),
  leader_id: z.string().transform((v) => (/^[0-9a-f-]{36}$/i.test(v) ? v : null)),
  description: nullable(2000), additional_work_required: nullable(2000),
  final_report: z.string().optional().transform((v) => v === "on"),
  final_payment: z.string().optional().transform((v) => v === "on"),
});

export async function updateDetails(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = detailsSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: first(parsed.error) };
  const d = parsed.data;
  if (d.start_date && d.end_date && d.end_date < d.start_date) return { error: "The end date is before the start date" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update(d).eq("id", id).select("id");
  if (error || !data?.length) return { error: NOT_ALLOWED };
  refresh(id);
  return { ok: "Project details saved" };
}

const teamSchema = z.object({
  member_id: z.string().regex(/^[0-9a-f-]{36}$/i, "Choose a team member"),
  member_type: z.enum(["Lead", "Associate"]),
  num_hours: z.string().trim().transform((v) => (v === "" ? null : Number(v))).refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Enter hours as a number"),
  start_date: date, end_date: date,
});

/** The owner of a milestone must be on the project's team. */
async function ownerOk(projectId: number, owner: string | null) {
  if (!owner) return true;
  const supabase = await createClient();
  const { data } = await supabase.from("project_team").select("member_id").eq("project_id", projectId).eq("member_id", owner).maybeSingle();
  return !!data;
}

export async function addTeamMember(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = teamSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: first(parsed.error) };
  const supabase = await createClient();
  const { data: person } = await supabase.from("profiles").select("name").eq("id", parsed.data.member_id).eq("active", true).maybeSingle();
  if (!person) return { error: "That person was not found" };
  const { error } = await supabase.from("project_team").insert({
    project_id: id, ...parsed.data, member_name: person.name, entry_by: user.id, entry_at: new Date().toISOString(),
  });
  if (error) return { error: error.code === "23505" ? `${person.name} is already on this project` : NOT_ALLOWED };
  refresh(id);
  return { ok: `${person.name} added` };
}

export async function removeTeamMember(id: number, rowId: number): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("project_team").delete().eq("id", rowId).eq("project_id", id);
  refresh(id);
}

const milestoneSchema = z.object({
  milestone: text(300).min(1, "Enter the milestone"),
  percentage: z.string().regex(/^\d{1,3}$/, "Enter the weight as a whole number").transform(Number).refine((n) => n >= 1 && n <= 100, "The weight must be between 1 and 100"),
  start_date: date, end_date: date,
  owner_id: z.string().trim().regex(/^([0-9a-f-]{36})?$/i, "Choose the owner from the list").transform((v) => v || null),
});

/** Milestone weights must add up to 100 or less, because finished milestones add up to the project's progress. */
async function weightLeft(projectId: number, excludeId?: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("project_milestones").select("id, percentage").eq("project_id", projectId);
  const used = (data ?? []).filter((m) => m.id !== excludeId).reduce((s, m) => s + m.percentage, 0);
  return 100 - used;
}

export async function addMilestone(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = milestoneSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: first(parsed.error) };
  if (!(await ownerOk(id, parsed.data.owner_id))) return { error: "The owner must be on this project's team" };
  const left = await weightLeft(id);
  if (parsed.data.percentage > left) return { error: `Only ${left}% is left to allocate across milestones` };
  const supabase = await createClient();
  const { error } = await supabase.from("project_milestones").insert({ project_id: id, ...parsed.data, created_by: user.id, created_at: new Date().toISOString() });
  if (error) return { error: NOT_ALLOWED };
  refresh(id);
  return { ok: "Milestone added" };
}

export async function editMilestone(id: number, milestoneId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = milestoneSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: first(parsed.error) };
  if (!(await ownerOk(id, parsed.data.owner_id))) return { error: "The owner must be on this project's team" };
  const left = await weightLeft(id, milestoneId);
  if (parsed.data.percentage > left) return { error: `Only ${left}% is left to allocate across milestones` };
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_milestones")
    .update({ ...parsed.data, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", milestoneId).eq("project_id", id).eq("complete", false).select("id");
  if (error || !data?.length) return { error: "Only an unfinished milestone can be changed" };
  refresh(id);
  return { ok: "Milestone saved" };
}

export async function deleteMilestone(id: number, milestoneId: number): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("project_milestones").delete().eq("id", milestoneId).eq("project_id", id).eq("complete", false);
  refresh(id);
}

export async function completeMilestone(id: number, milestoneId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const reason = text(500).safeParse(formData.get("reason") ?? "");
  if (!reason.success) return { error: "The note is too long" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_milestone", { p_milestone_id: milestoneId, p_reason: reason.data });
  if (error) return { error: error.message };
  refresh(id);
  return { ok: `Milestone complete. The project is now ${Number(data)}% done` };
}

export async function closeProject(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const reason = text(1000).min(1, "Enter a closing note").safeParse(formData.get("reason") ?? "");
  if (!reason.success) return { error: first(reason.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_project", { p_project_id: id, p_reason: reason.data });
  if (error) return { error: error.message };
  refresh(id);
  revalidatePath("/projects");
  return { ok: "Project closed" };
}

async function addFile(kind: "project_documents" | "project_proposals", id: number, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload" };
  const description = text(500).safeParse(formData.get("description") ?? "");
  if (!description.success) return { error: "The description is too long" };
  const supabase = await createClient();
  const { data: visible } = await supabase.from("projects").select("id").eq("id", id).maybeSingle();
  if (!visible) return { error: NOT_ALLOWED };
  const up = await uploadFile("documents", `projects/${id}`, file, MAX_FILE);
  if ("error" in up) return { error: up.error };
  const { error } = await supabase.from(kind).insert({ project_id: id, file_path: up.path, description: description.data || null, entry_by: user.id, entry_at: new Date().toISOString() });
  if (error) return { error: NOT_ALLOWED };
  refresh(id);
  return { ok: "File uploaded" };
}
export async function addDocument(id: number, _prev: ActionState, formData: FormData) { return addFile("project_documents", id, formData); }
export async function addProposal(id: number, _prev: ActionState, formData: FormData) { return addFile("project_proposals", id, formData); }

const meetingSchema = z.object({
  agenda: text(1000).min(1, "Enter the agenda"),
  meeting_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose the meeting date and time"),
  conclusion: nullable(2000),
});

export async function addMeeting(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = meetingSchema.safeParse(raw(formData));
  if (!parsed.success) return { error: first(parsed.error) };
  const members = formData.getAll("members").map(String).filter((m) => /^[0-9a-f-]{36}$/i.test(m));
  const supabase = await createClient();
  const { error } = await supabase.from("project_meetings").insert({
    project_id: id, members, agenda: parsed.data.agenda, conclusion: parsed.data.conclusion,
    meeting_at: `${parsed.data.meeting_at}:00+05:30`, created_by: user.id, created_at: new Date().toISOString(),
  });
  if (error) return { error: NOT_ALLOWED };
  refresh(id);
  return { ok: "Meeting saved" };
}

export async function postChat(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const message = text(2000).min(1, "Write a message").safeParse(formData.get("message") ?? "");
  if (!message.success) return { error: first(message.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("project_forum_chats").insert({ project_id: id, user_id: user.id, message: message.data });
  if (error) return { error: NOT_ALLOWED };
  refresh(id);
  return { ok: "" };
}
