import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ business_id: string }> }
) {
  const { business_id } = await params;
  const supabase = await createSupabaseServer();

  const { data: demo } = await supabase
    .from("demo_sites")
    .select("preview_url")
    .eq("business_id", business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!demo?.preview_url) {
    return new NextResponse("Demo not found", { status: 404 });
  }

  const res = await fetch(demo.preview_url);
  if (!res.ok) {
    return new NextResponse("Failed to fetch demo", { status: 502 });
  }

  const html = await res.text();
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
