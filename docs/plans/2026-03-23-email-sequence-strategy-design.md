# Email Sequence Strategy Design
**Date:** 2026-03-23
**Status:** Approved, ready for implementation planning

---

## Context

Current outreach sends a single email with the comparison link included. All tested sends land in Gmail Promotions. Technical setup is perfect (10/10 mail-tester score, DKIM verified, plain text) — the issue is content classification. Gmail's ML treats cold emails with links as promotional regardless of technical quality.

**Goal:** Build a two-touch sequence that maximises Primary placement and reply rates by removing the link from Email 1, warming up a dedicated sending subdomain, and managing follow-ups through the dashboard.

---

## Design

### 1. Sending Identity — `mail.tradeeasehq.com`

Send cold outreach from `ben@mail.tradeeasehq.com`, not the main domain.

- Add `mail.tradeeasehq.com` as a second verified sender in Resend (~10 min, DNS records only)
- Set SPF, DKIM, DMARC on the subdomain
- Set `Reply-To: ben@tradeeasehq.com` so replies land in the main inbox — no second inbox to monitor
- Update `RESEND_FROM_EMAIL` env var to `ben@mail.tradeeasehq.com`
- Isolates cold outreach reputation from the main domain entirely

---

### 2. Email Copy

**Email 1 — No link. Reply ask. ~60-70 words.**

Purpose: get a reply, not a click. A reply moves you to Primary permanently for that person.

Structure:
1. Greeting — first name if known, omit if not
2. One sentence: you came across their business
3. 2–3 specific problems named in plain business language, each connected to lost leads:
   - Mobile: "most people searching for a cleaner are on their phone — yours takes too long to load and they leave"
   - SEO: "your business doesn't show up with a star rating in Google search, so you look less established than competitors who do"
   - CTA/usability: "there's no easy way to request a quote without calling — you lose people who want to book but won't pick up the phone"
   - Pull from `top_3_weaknesses` + `seo_gaps` from the analysis pipeline
4. Close: "I put together something that shows how each of those could look fixed — want me to send it over?"
5. Sign off: `Ben` — nothing else. No domain, no title, no tagline.

**Email 2 — Comparison link delivered. ~40-50 words. Sent 4-5 days after Email 1 if no reply.**

Structure:
1. "Hey [name]," — no opener, straight to it
2. One sentence: following up, here's what I put together
3. Inline comparison link in a sentence: "I put the before/after here: [link]"
4. "Worth a look?"
5. Sign off: `Ben`

**Rules (both emails):**
- Plain text only, no HTML
- No tracked links (Resend click tracking off)
- No "unsubscribe" language — footer: `Trade Ease | [address] | Reply to opt out.`
- From name: `Ben` (not "Ben from Trade Ease")
- Subject line: specific to the business, max 8 words, written like a real person

---

### 3. Sequence Architecture

**Pipeline changes:**
- Draft both emails at generation time per business
- Save as two rows in `outreach_drafts` with new fields:
  - `sequence_number` INT (1 or 2)
  - `parent_draft_id` UUID nullable (Email 2 points to Email 1)
  - `replied_at` TIMESTAMP nullable
- Email 1: flows through existing review → approve → send pipeline unchanged
- Email 2: saved with status `follow_up_pending`, not visible in main review queue

**Dashboard changes:**

1. **Existing `/outreach` flow** — unchanged. Email 1 only.

2. **New `/outreach/followups` tab** — shows Email 2 drafts where:
   - Parent (Email 1) was sent 4+ days ago
   - Parent `replied_at` is null
   - Email 2 not yet sent
   - Same review → send UX as today

3. **"Mark as Replied" button** on sent draft detail pages (`/outreach/[id]`) — sets `replied_at`, removes the Email 2 from follow-ups queue

4. **Nav update** — add "Follow-ups" link to outreach nav section

**Schema additions to `outreach_drafts`:**
```sql
ALTER TABLE outreach_drafts
  ADD COLUMN IF NOT EXISTS sequence_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_draft_id UUID REFERENCES outreach_drafts(id),
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
```

---

### 4. Warm-up Calendar

New subdomain = zero sending history. Ramp slowly to build clean reputation.

**Recommended daily caps for `mail.tradeeasehq.com`:**

| Days since first send | Daily cap |
|---|---|
| 1–3 | 5–8 |
| 4–7 | 10–15 |
| 8–11 | 20–25 |
| 12–15 | 30–40 |
| 16+ | 50+ (reassess) |

At the 15–30/day target, safe zone is reached by day 8.

**Dashboard implementation:**
- `sending_config` table: `subdomain_start_date`, `daily_cap`, `current_day_sent`
- Or simpler: a single config row in a `app_config` table
- Banner on `/outreach/approved`: *"Today: 4 of 15 sent · 11 remaining"*
- Advisory warning (not hard block) if cap is exceeded — operator-adjustable

---

### 5. Reply Tracking — Manual Now, Automated Later

**Now:** "Mark as Replied" button on sent draft detail page. One click per reply received. Trivial at 15–30/day volume.

**Future (Phase 2):** Gmail API polling — check inbox daily for threads whose `Message-ID` matches a sent draft's `resend_message_id`, auto-set `replied_at`. No dashboard change needed — `replied_at` field already exists.

---

## Implementation Order

1. Subdomain DNS setup in Resend (manual, ~10 min, done before any code)
2. Schema migration — add `sequence_number`, `parent_draft_id`, `replied_at`, `sending_config`
3. Update `email_drafter.py` — draft both emails, Email 1 no link, Email 2 short follow-up
4. Update `run_campaign.py` outreach step — save both drafts linked
5. Update send route — read `RESEND_FROM_EMAIL` (already env var, just update the value)
6. Add "Mark as Replied" button to `/outreach/[id]` detail page
7. Build `/outreach/followups` page + send flow
8. Add warm-up counter to `/outreach/approved`
9. Update nav

## Critical Files

**Modify:**
- `pipeline/outreach/email_drafter.py` — draft both emails
- `pipeline/run_campaign.py` — save both drafts, link them
- `pipeline/db/schema.sql` — schema additions
- `dashboard/app/outreach/[draft_id]/page.tsx` — Mark as Replied button
- `dashboard/app/outreach/approved/page.tsx` — warm-up counter banner
- `dashboard/app/layout.tsx` — add Follow-ups to nav

**Create:**
- `dashboard/app/outreach/followups/page.tsx`
- `dashboard/app/api/outreach/[id]/mark-replied/route.ts`
- `dashboard/app/api/outreach/[id]/send-followup/route.ts` (or reuse send route)

**Env vars to update:**
- `RESEND_FROM_EMAIL` → `ben@mail.tradeeasehq.com`
- `RESEND_FROM_NAME` → `Ben`
