export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  let body: { subject?: string; body_text?: string; body_html?: string; to_email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (body.subject !== undefined) updates.subject = body.subject;
  if (body.body_text !== undefined) updates.body_text = body.body_text;
  if (body.body_html !== undefined) updates.body_html = body.body_html;

  // Update contact email if provided (affects who the email is sent to)
  if (body.to_email !== undefined) {
    const { data: draft } = await supabase
      .from("outreach_drafts")
      .select("business_id")
      .eq("id", id)
      .single();
    if (draft?.business_id) {
      await supabase
        .from("contacts")
        .update({ email: body.to_email })
        .eq("business_id", draft.business_id);
    }
  }

  if (Object.keys(updates).length === 0 && body.to_email === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("outreach_drafts")
      .update(updates)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
