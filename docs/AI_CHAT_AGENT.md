# AI Chat Agent — Design Spec

## Overview

A lightweight JavaScript widget embedded on client websites that answers visitor questions using Claude. Each client gets a system prompt configured to their specific business data. The backend is a shared API endpoint hosted by you.

---

## Architecture

```
Visitor browser
    ↓ chat message
Client site widget (JS, ~40KB)
    ↓ POST /api/chat with { client_id, session_id, message }
Your API (Next.js edge function or Python FastAPI)
    ↓ Load client config from Supabase
    ↓ Build system prompt
    ↓ Call Claude claude-sonnet-4-6 API (streaming)
    ↑ Stream response back to widget
Client site widget
    ↑ Display typed response
```

---

## Client Configuration (stored in Supabase `client_sites.ai_agent_config`)

```json
{
  "business_name": "Sparkle Home Cleaning",
  "owner_name": "Maria",
  "services": [
    "Standard house cleaning",
    "Deep cleaning",
    "Move-in/move-out cleaning",
    "Post-construction cleanup"
  ],
  "service_area": ["Austin", "Round Rock", "Cedar Park", "Pflugerville"],
  "hours": {
    "monday": "8am–6pm",
    "tuesday": "8am–6pm",
    "wednesday": "8am–6pm",
    "thursday": "8am–6pm",
    "friday": "8am–6pm",
    "saturday": "9am–3pm",
    "sunday": "Closed"
  },
  "pricing": {
    "standard_2bed": "$120–150",
    "standard_3bed": "$150–180",
    "deep_clean_modifier": "+$50–80",
    "disclaimer": "Final price depends on home condition and size."
  },
  "contact": {
    "phone": "512-555-0101",
    "booking_url": "https://sparklehome.com/book"
  },
  "tone": "friendly and professional",
  "escalation_trigger": "If the visitor wants to book or needs an exact price, direct them to call or use the booking link."
}
```

---

## System Prompt Template

```
You are a helpful assistant for {business_name}. You speak in a {tone} tone.

You can answer questions about:
- Services offered: {services}
- Service areas: {service_area}
- Hours: {hours}
- Rough pricing guidance: {pricing}
- How to book or get a quote: {contact}

Rules:
1. Only discuss this business. Do not compare to competitors or discuss unrelated topics.
2. If asked for an exact price, give the range from your pricing data and note final pricing depends on home details.
3. If the visitor wants to book or is ready to get a quote, give them the phone number and/or booking URL.
4. Keep responses short and conversational (2–4 sentences max).
5. If you don't know the answer, say so honestly and direct them to call.
6. Never make up information about the business.
```

---

## Widget Design

- Floating chat button (bottom-right corner) with business brand colors
- Opens a small chat panel (300×450px)
- Shows first message from assistant: "Hi! I'm {owner_name}'s assistant. How can I help today?"
- Streaming responses
- Session ID for conversation memory within a browser session (no cross-session memory needed for MVP)
- "Powered by AI" disclosure in footer

---

## Technical Notes

- Widget is a single vanilla JS file, no dependencies, injected via `<script>` tag
- API endpoint is a shared edge function — one per platform, not one per client
- Client is identified by `client_id` in the POST body (not secret — config is non-sensitive)
- Rate limit: 20 messages per session, 200 per day per client_id
- Cost estimate: ~1000 tokens per exchange × $0.003/1k = ~$0.003/exchange
  → 500 chats/month = ~$1.50 in Claude costs per client
- Suggested pricing: $39/month includes AI chat (very healthy margin)

---

## Escalation Patterns

When Claude should hand off to human contact:
- "I'd like to book a specific date/time"
- "I need a price for a very specific situation"
- "I have a complaint or issue"
- "I want to talk to someone"

Response on escalation: "For that, the best next step is to [call us at {phone}] or [book through our website at {booking_url}]. We'd love to help you directly!"

---

## MVP Limitations (Phase 3)

- No appointment booking capability
- No CRM integration (conversations not saved to client's systems)
- No multi-language support
- No voice
- Single shared conversation context (no memory between sessions)

These are all upgradeable for Phase 4+ upsells.
