import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { signedUrl } from "@/lib/storage";

export async function GET(request: NextRequest, ctx: RouteContext<"/projects/[id]/files/[kind]/[fileId]">) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { id, kind, fileId } = await ctx.params;
  const projectId = Number(id), rowId = Number(fileId);
  if (!Number.isInteger(projectId) || !Number.isInteger(rowId) || (kind !== "documents" && kind !== "proposals")) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  // The user's own session reads the row, so row-level security decides who may download.
  const { data } = kind === "documents"
    ? await supabase.from("project_documents").select("file_path").eq("id", rowId).eq("project_id", projectId).maybeSingle()
    : await supabase.from("project_proposals").select("file_path").eq("id", rowId).eq("project_id", projectId).maybeSingle();
  if (!data?.file_path) return new NextResponse("Not found", { status: 404 });
  const url = await signedUrl("documents", data.file_path);
  return url ? NextResponse.redirect(url) : new NextResponse("File not available", { status: 404 });
}
