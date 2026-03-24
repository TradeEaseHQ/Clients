export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { error } = await supabase
    .from("outreach_drafts")
    .update({
      replied_at: new Date().toISOString(),
      status: "replied",
    })
    .eq("id", id)
    .eq("status", "sent"); // only mark as replied if currently sent

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
