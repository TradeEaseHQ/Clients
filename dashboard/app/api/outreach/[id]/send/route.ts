export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextResponse } from "next/server";

const RESEND_SEND_URL = "https://api.resend.com/emails";

const CANSPAM_TEXT = `\n\nTrade Ease | __ADDRESS__ | Reply to opt out.`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  // Load draft
  const { data: draft, error: draftErr } = await supabase
    .from("outreach_drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (draftErr || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const sendableStatuses = ["approved", "follow_up_pending"];
  if (!sendableStatuses.includes(draft.status)) {
    return NextResponse.json(
      { error: `Draft status is "${draft.status}" — must be "approved" or "follow_up_pending" before sending` },
      { status: 400 }
    );
  }

  // Load contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", draft.business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!contact?.email) {
    return NextResponse.json(
      { error: "No contact email found for this business" },
      { status: 400 }
    );
  }

  const address = process.env.PHYSICAL_ADDRESS ?? "";
  const bodyText = (draft.body_text ?? "") + CANSPAM_TEXT.replace("__ADDRESS__", address);

  const fromName = process.env.RESEND_FROM_NAME ?? "Ben from Trade Ease";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "ben@tradeeasehq.com";

  const replyTo = process.env.RESEND_REPLY_TO ?? fromEmail;

  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: [contact.email],
    reply_to: replyTo,
    subject: draft.subject ?? "(no subject)",
    text: bodyText,
  };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const resendRes = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    return NextResponse.json(
      { error: `Resend API error ${resendRes.status}: ${errText.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const resendData = await resendRes.json();
  const messageId: string = resendData?.id ?? "";

  // Update draft
  await supabase
    .from("outreach_drafts")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_message_id: messageId,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, message_id: messageId });
}
