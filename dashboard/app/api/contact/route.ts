export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Origin allowlist — only accept submissions from known demo/client domains
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    !origin ||
    origin.endsWith(".supabase.co") ||
    origin.endsWith(".vercel.app") ||
    origin.startsWith(process.env.NEXT_PUBLIC_APP_URL ?? "");

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { business_id, name, email, phone, home_size, service, frequency, message, _hp } = body;

  // Honeypot — silent drop
  if (_hp) return new NextResponse(null, { status: 200 });

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Mail not configured" }, { status: 500 });
  }

  // Look up where to send this lead
  let toEmail = process.env.CONTACT_FALLBACK_EMAIL ?? "ben@tradeeasehq.com";
  let businessName = "Demo Site";

  if (business_id) {
    const supabase = await createSupabaseServer();

    // Check client_sites first (live clients have a contact_email)
    const { data: site } = await supabase
      .from("client_sites")
      .select("contact_email, businesses(name, email, phone)")
      .eq("business_id", business_id)
      .maybeSingle();

    if (site?.contact_email) {
      toEmail = site.contact_email;
    } else if ((site?.businesses as { email?: string } | null)?.email) {
      toEmail = (site!.businesses as { email: string }).email;
    }

    if ((site?.businesses as { name?: string } | null)?.name) {
      businessName = (site!.businesses as { name: string }).name;
    }
  }

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    home_size ? `Home size: ${home_size}` : null,
    service ? `Service: ${service}` : null,
    frequency ? `Frequency: ${frequency}` : null,
    message ? `\nMessage:\n${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Trade Ease <${process.env.RESEND_FROM_EMAIL ?? "ben@mail.tradeeasehq.com"}>`,
      to: [toEmail],
      reply_to: email,
      subject: `New quote request — ${businessName}`,
      text: `You have a new quote request from your website.\n\n${lines}\n\n---\nSent via Trade Ease`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[contact] Resend error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
