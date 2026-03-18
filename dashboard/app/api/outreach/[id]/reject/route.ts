export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  let notes: string | undefined;
  try {
    const body = await req.json();
    notes = body?.notes;
  } catch {
    // notes is optional — body may be empty
  }

  const { error } = await supabase
    .from("outreach_drafts")
    .update({
      status: "rejected",
      rejection_notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
