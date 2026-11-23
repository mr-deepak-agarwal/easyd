import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { MGMT_ROLES } from "@/lib/roles";
import { signedUrl } from "@/lib/storage";

export async function GET(request: NextRequest, ctx: RouteContext<"/crm/followups/[id]/download">) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!MGMT_ROLES.includes(user.role)) return new NextResponse("Not found", { status: 404 });
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.from("followups").select("file_path").eq("id", n).maybeSingle();
  if (!data?.file_path) return new NextResponse("Not found", { status: 404 });
  const url = await signedUrl("documents", data.file_path);
  if (!url) return new NextResponse("File not available", { status: 404 });
  return NextResponse.redirect(url);
}
