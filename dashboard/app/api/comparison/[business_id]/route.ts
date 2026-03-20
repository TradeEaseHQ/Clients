export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ business_id: string }> }
) {
  const { business_id } = await params;
  const supabase = await createSupabaseServer();

  const { data: draft } = await supabase
    .from("outreach_drafts")
    .select("comparison_url")
    .eq("business_id", business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!draft?.comparison_url) {
    return new NextResponse("Comparison not found", { status: 404 });
  }

  const res = await fetch(draft.comparison_url, { cache: "no-store" });
  if (!res.ok) {
    return new NextResponse("Failed to fetch comparison", { status: 502 });
  }

  const html = await res.text();
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
