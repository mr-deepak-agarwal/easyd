"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadFile } from "@/lib/storage";
import { defaultEmpid, generatePassword } from "@/lib/staff";
import { ROLES } from "@/lib/roles";
import type { ActionState } from "@/lib/action-state";

const MAX_DOC = 2 * 1024 * 1024; // two files per request must stay under the 4.5 MB hosting limit
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optDate = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional());
const optText = z.preprocess(blank, z.string().trim().max(300).optional());

const schema = z.object({
  name: z.string().trim().min(2, "Enter the employee's name").max(100),
  empid: z.preprocess(blank, z.string().trim().toLowerCase().email("Login username must be an email address").optional()),
  password: z.preprocess(blank, z.string().min(8, "Password must be at least 8 characters").max(72).optional()),
  role: z.enum(ROLES),
  personalEmail: optText, contact: optText, address: optText, bank: optText,
  designation: optText, gender: optText, department: optText,
  salary: z.preprocess(blank, z.coerce.number().min(0, "Salary cannot be negative").max(100000000).optional()),
  dob: optDate, joiningDate: optDate,
});

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const empid = v.empid ?? defaultEmpid(v.name);
  if (!empid) return { error: "Could not work out a login username. Enter one." };
  const password = v.password ?? generatePassword();

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("empid", empid).maybeSingle();
  if (existing) return { error: `${empid} already exists. Enter a different login username.` };

  // Validate the files before creating anything.
  const cv = formData.get("cv"), qualification = formData.get("qualification");
  const files = [["cv", cv], ["qualification", qualification]] as const;

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: empid, password, email_confirm: true,
  });
  if (authError || !created.user) return { error: "Could not create the login account" };
  const userId = created.user.id;

  const undo = async (message: string): Promise<ActionState> => {
    await admin.auth.admin.deleteUser(userId); // cascades to the profile row
    return { error: message };
  };

  const paths: Record<string, string | null> = { cv: null, qualification: null };
  for (const [kind, file] of files) {
    if (file instanceof File && file.size > 0) {
      const up = await uploadFile("staff", userId, file, MAX_DOC);
      if ("error" in up) return undo(up.error);
      paths[kind] = up.path;
    }
  }

  const { error: profileError } = await admin.from("profiles").insert({ id: userId, empid, name: v.name, role: v.role });
  if (profileError) return undo("Could not save the employee");

  const { error: detailError } = await admin.from("employee_details").insert({
    empid, profile_id: userId, name: v.name, designation: v.designation ?? null, email: v.personalEmail ?? null,
    contact: v.contact ?? null, address: v.address ?? null, bank: v.bank ?? null, gender: v.gender ?? null,
    department: v.department ?? null, salary: v.salary ?? null, dob: v.dob ?? null, join_date: v.joiningDate ?? null,
    cv_path: paths.cv, docs_path: paths.qualification,
  });
  if (detailError) return undo("Could not save the employee details");

  revalidatePath("/admin/employees");
  revalidatePath("/hr/biodata");
  return { ok: `${v.name} added. Login: ${empid}   Password: ${password}   (shown once, please share it securely)` };
}
