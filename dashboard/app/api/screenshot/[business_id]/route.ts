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
    .from("screenshots")
    .download(`${business_id}/desktop.png`);

  if (error || !data) {
    return new NextResponse("Screenshot not found", { status: 404 });
  }

  const buffer = await data.arrayBuffer();
  return new NextResponse(buffer, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
