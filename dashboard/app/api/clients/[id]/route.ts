export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only allow specific fields to be patched
  const allowedFields: Array<keyof typeof body> = [
    "ai_agent_config",
    "domain",
    "plan",
    "monthly_fee",
    "notes",
    "hosting_status",
    "live_at",
    "quote_form_action",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("client_sites")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[api/clients/[id]] patch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
