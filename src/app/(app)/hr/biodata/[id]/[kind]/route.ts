import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { signedUrl } from "@/lib/storage";

export async function GET(request: NextRequest, ctx: RouteContext<"/hr/biodata/[id]/[kind]">) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { id, kind } = await ctx.params;
  const empId = Number(id);
  if (!Number.isInteger(empId) || (kind !== "cv" && kind !== "qualification")) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  // RLS: only the employee themself or an admin can read this row.
  const { data } = await supabase.from("employee_details").select("cv_path, docs_path").eq("id", empId).maybeSingle();
  const path = kind === "cv" ? data?.cv_path : data?.docs_path;
  if (!path) return new NextResponse("Not found", { status: 404 });
  const url = await signedUrl("staff", path);
  if (!url) return new NextResponse("File not available", { status: 404 });
  return NextResponse.redirect(url);
}
