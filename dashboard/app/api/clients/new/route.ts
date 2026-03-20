export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();

  let body: {
    business_id?: string;
    domain?: string;
    plan?: string;
    monthly_fee?: number;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { business_id, domain, plan, monthly_fee, notes } = body;

  if (!business_id) {
    return NextResponse.json({ error: "business_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_sites")
    .insert({
      business_id,
      domain: domain ?? null,
      plan: plan ?? "basic",
      monthly_fee: monthly_fee ?? null,
      notes: notes ?? null,
      hosting_status: "pending",
      change_requests: [],
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[api/clients/new] insert error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, ok: true });
}
