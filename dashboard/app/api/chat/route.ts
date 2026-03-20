export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// TODO: Install @upstash/ratelimit and @upstash/redis to enable rate limiting.
// Once installed, uncomment the block below and the rate-limit check in the handler.
// Required limits to implement:
//   - 10 messages per 60 seconds per IP (sliding window)
//   - 50 messages per hour per IP
//   - Minimum 1-second interval between messages from same IP
//
// import { Ratelimit } from "@upstash/ratelimit";
// import { Redis } from "@upstash/redis";
//
// const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null;
// const ratelimit = redis
//   ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "60 s") })
//   : null;

const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BusinessConfig {
  business_name?: string;
  city?: string;
  state?: string;
  services?: string;
  service_areas?: string;
  hours?: string;
  pricing_range?: string;
  phone?: string;
  escalation_trigger?: string;
}

function buildSystemPrompt(config: BusinessConfig): string {
  return `You are a friendly virtual assistant for ${config.business_name || "this cleaning business"}, a professional cleaning service in ${config.city || "the local area"}, ${config.state || ""}.

Services offered: ${config.services || "residential and commercial cleaning"}.
Service areas: ${config.service_areas || config.city || "local area"}.
Hours: ${config.hours || "Monday–Saturday, 8am–6pm"}.
Pricing: ${config.pricing_range || "We provide free quotes — contact us to get yours."}.
Phone: ${config.phone || "Call us for more info"}.

Instructions:
- Answer questions about services, availability, pricing, and the service area.
- Be warm, friendly, and concise (2-3 sentences max per reply).
- For pricing, explain that exact quotes depend on home size and services — encourage them to fill out the quote form or call.
- If asked something you don't know, say: "Great question — the best way to get that answered is to call us or fill out our quote form."
- Never make up specific prices. Never book appointments.
- If the user says "${config.escalation_trigger || "speak to someone"}", respond: "Of course! Give us a call at ${config.phone || "our number"} and we'll be happy to help."`;
}

export async function POST(req: NextRequest) {
  try {
    // Origin allowlist — block requests from untrusted origins to protect API credits
    const origin = req.headers.get("origin") ?? "";
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL ?? "",
      // Allow Supabase storage origins for demo sites
    ];
    const isAllowed =
      !origin || // same-origin requests (no Origin header)
      origin.endsWith(".supabase.co") ||
      origin.endsWith(".vercel.app") ||
      allowedOrigins.some((o) => o && origin.startsWith(o));

    if (!isAllowed) {
      return NextResponse.json({ reply: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { business_id, message, history, _hp } = body as {
      business_id?: string;
      message?: string;
      history?: unknown;
      _hp?: unknown;
    };

    // Honeypot — silently drop bot submissions
    if (_hp) return new NextResponse(null, { status: 200 });

    // Message length cap
    if (!message?.trim() || message.length > 500) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // TODO: Uncomment once @upstash/ratelimit is installed:
    // if (ratelimit) {
    //   const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    //   const { success } = await ratelimit.limit(ip);
    //   if (!success) {
    //     return NextResponse.json(
    //       { reply: "Too many messages — please slow down!" },
    //       { status: 429 }
    //     );
    //   }
    // }

    // Validate history — only accept "user"/"assistant" roles, cap content at 500 chars,
    // keep last 10 turns. Rejects any injected "system" roles or malformed entries.
    const validatedHistory = (Array.isArray(history) ? history : [])
      .filter(
        (h): h is ChatMessage =>
          typeof h === "object" &&
          h !== null &&
          (h.role === "user" || h.role === "assistant") &&
          typeof h.content === "string"
      )
      .map((h) => ({ role: h.role, content: h.content.slice(0, 500) }))
      .slice(-10);

    // Fetch business config — prefer client_sites.ai_agent_config, fall back to businesses table
    let config: BusinessConfig = {};

    if (business_id) {
      const supabase = await createSupabaseServer();

      // Try client_sites first (live site config)
      const { data: clientSite, error: siteErr } = await supabase
        .from("client_sites")
        .select("ai_agent_config")
        .eq("business_id", business_id)
        .maybeSingle();

      if (siteErr) console.error("[chat] client_sites query:", siteErr.message);

      if (clientSite?.ai_agent_config) {
        config = clientSite.ai_agent_config as BusinessConfig;
      } else {
        // Fall back to businesses table for demo mode
        const { data: business, error: bizErr } = await supabase
          .from("businesses")
          .select("name, city, state, phone, website")
          .eq("id", business_id)
          .maybeSingle();

        if (bizErr) console.error("[chat] businesses query:", bizErr.message);

        if (business) {
          config = {
            business_name: business.name,
            city: business.city,
            state: business.state,
            phone: business.phone,
          };
        }
      }
    }

    const systemPrompt = buildSystemPrompt(config);

    // Build messages array for Claude — include validated history then the new user message
    const messages: ChatMessage[] = [
      ...validatedHistory,
      { role: "user", content: message.trim() },
    ];

    // Call Claude Haiku via Anthropic API (fetch — no SDK installed)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.error("[chat] ANTHROPIC_API_KEY not configured");
      return NextResponse.json(
        { reply: "I'm having trouble right now — please call us directly!" },
        { status: 200 }
      );
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: 256,
        system: systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error(`[chat] Anthropic API error ${anthropicRes.status}: ${errText.slice(0, 200)}`);
      return NextResponse.json(
        { reply: "I'm having trouble right now — please call us directly!" },
        { status: 200 }
      );
    }

    const anthropicData = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const reply =
      anthropicData.content?.find((b) => b.type === "text")?.text?.trim() ??
      "I'm having trouble right now — please call us directly!";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json(
      { reply: "I'm having trouble right now — please call us directly!" },
      { status: 200 }
    );
  }
}
