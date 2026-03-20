export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ business_id: string }> }
) {
  const { business_id } = await params;
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.storage
    .from("comparisons")
    .download(`${business_id}/index.html`);

  if (error || !data) {
    return new NextResponse("Comparison not found", { status: 404 });
  }

  const html = await data.text();
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
