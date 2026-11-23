import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { signedUrl } from "@/lib/storage";

export async function GET(request: NextRequest, ctx: RouteContext<"/hr/circulars/[id]/download">) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { id } = await ctx.params;
  const circularId = Number(id);
  if (!Number.isInteger(circularId)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.from("circulars").select("file_path, active").eq("id", circularId).maybeSingle();
  if (!data || !data.active) return new NextResponse("Not found", { status: 404 });
  const url = await signedUrl("circulars", data.file_path);
  if (!url) return new NextResponse("File not available", { status: 404 });
  return NextResponse.redirect(url);
}
