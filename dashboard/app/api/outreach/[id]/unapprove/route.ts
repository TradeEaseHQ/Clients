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
    .update({ status: "draft", approved_at: null })
    .eq("id", id)
    .eq("status", "approved"); // only unapprove if currently approved, never undo a sent email

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
