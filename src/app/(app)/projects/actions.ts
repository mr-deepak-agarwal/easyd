"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { uploadFile } from "@/lib/storage";
import type { ActionState } from "@/lib/action-state";

const text = (max: number) => z.string().trim().max(max);
const idField = (msg: string) => z.string().regex(/^\d+$/, msg).transform(Number);
const optionalId = z.string().transform((v) => (/^\d+$/.test(v) ? Number(v) : null));

const newProjectSchema = z.object({
  client_id: idField("Choose a client"),
  name: text(200).min(1, "Enter the project name"),
  description: text(2000).transform((v) => v || null),
  department_id: idField("Choose a department"),
  sub_department_id: optionalId,
  project_type: z.enum(["one time", "monthly", "quarterly", "yearly"]),
  recurring: z.string().optional().transform((v) => v === "on"),
  proposal_description: text(500).transform((v) => v || null),
});

/** Opens a project directly (without a lead). It starts as pending until admin or teamlead2 approves it. */
export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(MGMT_ROLES);
  const parsed = newProjectSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { proposal_description, ...d } = parsed.data;
  const supabase = await createClient();
  const now = new Date().toISOString();

  let proposalPath: string | null = null;
  const file = formData.get("proposal");
  if (file instanceof File && file.size > 0) {
    const up = await uploadFile("documents", "projects/new", file, 4 * 1024 * 1024);
    if ("error" in up) return { error: up.error };
    proposalPath = up.path;
  }
  const { data: project, error } = await supabase.from("projects").insert({
    ...d, status: "pending", percent_complete: 0, start_date: now.slice(0, 10), created_by: user.id, created_at: now,
  }).select("id").single();
  if (error || !project) return { error: "Could not create the project" };
  if (proposalPath) {
    await supabase.from("project_proposals").insert({ project_id: project.id, file_path: proposalPath, description: proposal_description, entry_by: user.id, entry_at: now });
  }
  revalidatePath("/projects");
  revalidatePath("/projects/pending");
  redirect("/projects/pending");
}

/** Approve or reject a pending project (admin and teamlead2, enforced in the database). */
export async function decideProject(projectId: number, approve: boolean): Promise<void> {
  await requireRole(["admin", "teamlead2"]);
  const supabase = await createClient();
  await supabase.rpc("decide_project", { p_project_id: projectId, p_approve: approve });
  revalidatePath("/projects/pending");
  revalidatePath("/projects");
}
