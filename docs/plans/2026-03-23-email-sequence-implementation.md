# Email Sequence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a two-touch email sequence with a no-link Email 1 (reply ask), a follow-up Email 2 (delivers comparison link), subdomain sending, warm-up counter, and a Follow-ups dashboard tab.

**Architecture:** Pipeline drafts both emails at generation time and saves them as two linked `outreach_drafts` rows. Email 1 goes through the existing review/approve/send flow. Email 2 sits in `follow_up_pending` status until visible in a new Follow-ups dashboard tab (shown 4+ days after Email 1 sent, no reply marked). Mark-as-Replied button suppresses Email 2. Warm-up counter on the Send Queue page shows daily cap and sent count.

**Tech Stack:** Python (Anthropic SDK, Supabase), Next.js 14 App Router, Tailwind CSS, Supabase (Postgres), Resend API.

---

## Task 0 (Manual): Subdomain DNS Setup in Resend

**No code required. Do this before running any code tasks.**

**Step 1: Add the sending domain in Resend**
1. Go to resend.com → Domains → Add Domain
2. Enter: `mail.tradeeasehq.com`
3. Copy the DNS records Resend gives you (SPF, DKIM, DMARC)

**Step 2: Add DNS records at your registrar**
Add all records Resend provides. They will look like:
- TXT record: `mail.tradeeasehq.com` → `v=spf1 include:amazonses.com ~all`
- CNAME records for DKIM (2–3 records)
- TXT record for DMARC: `_dmarc.mail.tradeeasehq.com` → `v=DMARC1; p=none; rua=mailto:ben@tradeeasehq.com`

**Step 3: Verify in Resend**
Wait 5–10 minutes, click Verify in Resend. All records should show green.

**Step 4: Set Reply-To**
In Resend, set the Reply-To address for this domain to `ben@tradeeasehq.com` so replies land in your main inbox.

**Step 5: Update .env and Vercel env vars**
```
RESEND_FROM_EMAIL=ben@mail.tradeeasehq.com
RESEND_FROM_NAME=Ben
```
Update both your local `.env` and Vercel dashboard environment variables.

---

## Task 1: Schema Migration + TypeScript Types

**Files:**
- Modify: `pipeline/db/schema.sql`
- Modify: `dashboard/lib/types.ts`

**Step 1: Add migration to schema.sql**

Append to the bottom of `pipeline/db/schema.sql` (after existing migrations):

```sql
-- ============================================================
-- MIGRATIONS — email sequence (2-touch outreach)
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT guards)
-- ============================================================
ALTER TABLE outreach_drafts
  ADD COLUMN IF NOT EXISTS sequence_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_draft_id UUID REFERENCES outreach_drafts(id);

-- app_config: key-value store for dashboard settings (warm-up calendar etc.)
CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed warm-up defaults (update subdomain_start_date to actual first-send date)
INSERT INTO app_config (key, value) VALUES
  ('outreach_subdomain_start_date', '"2026-03-24"'),
  ('outreach_daily_cap', '8')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_outreach_drafts_parent ON outreach_drafts(parent_draft_id);
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_sequence ON outreach_drafts(sequence_number);
```

**Step 2: Run migration in Supabase**
Open Supabase → SQL Editor, paste and run the migration block above.
Expected: "Success. No rows returned."

**Step 3: Update TypeScript types in `dashboard/lib/types.ts`**

Change `OutreachDraftStatus` to add `follow_up_pending`:
```typescript
export type OutreachDraftStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "sent"
  | "follow_up_pending"
  | "rejected"
  | "bounced"
  | "replied";
```

Add `sequence_number` and `parent_draft_id` to `OutreachDraft` interface (after `replied_at`):
```typescript
  sequence_number: number;
  parent_draft_id: string | null;
```

**Step 4: Commit**
```bash
git add pipeline/db/schema.sql dashboard/lib/types.ts
git commit -m "feat: add sequence_number, parent_draft_id to outreach_drafts + app_config table"
```

---

## Task 2: Update email_drafter.py — Draft Both Emails

**Files:**
- Modify: `pipeline/outreach/email_drafter.py`

The current `EmailDrafter.draft()` method drafts a single email with a link. We need a new `draft_sequence()` method that:
- Calls Claude to draft Email 1 (no link, specific weaknesses, reply ask)
- Generates Email 2 programmatically (short follow-up template, no Claude call needed)
- Returns both as a tuple

**Step 1: Replace `_DRAFT_EMAIL_TOOL` with `_DRAFT_EMAIL1_TOOL`**

Replace the existing `_DRAFT_EMAIL_TOOL` constant with:
```python
_DRAFT_EMAIL1_TOOL = {
    "name": "draft_email1",
    "description": "Output Email 1 of the outreach sequence — no link, specific problems called out, reply ask.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "Subject line — max 8 words, specific to the business, written like a real person.",
            },
            "body_text": {
                "type": "string",
                "description": "Plain-text email body. No links. No HTML. 60–80 words max.",
            },
        },
        "required": ["subject", "body_text"],
    },
}
```

**Step 2: Replace `_build_prompt` with `_build_email1_prompt`**

Replace the existing `_build_prompt` function with:
```python
def _build_email1_prompt(
    business: dict[str, Any],
    analysis: dict[str, Any],
) -> str:
    name = business.get("name", "your business")
    city = business.get("city", "your city")
    extracted = business.get("extracted_content") or {}
    owner_name = extracted.get("owner_name")

    weaknesses: list[str] = analysis.get("top_3_weaknesses") or []
    raw = analysis.get("raw_scores_json") or {}
    seo_gaps: dict = raw.get("seo_gaps") or {}
    pagespeed = analysis.get("pagespeed_score")

    # Build a plain-language problem list from analysis data
    problems: list[str] = []

    # Mobile / speed
    if pagespeed is not None and pagespeed < 60:
        problems.append(
            f"slow on mobile (loads in {pagespeed}/100 on Google's speed test) — "
            "most people searching for a cleaner are on their phone and will leave"
        )
    elif weaknesses and any("mobile" in w.lower() or "phone" in w.lower() for w in weaknesses):
        problems.append(
            "doesn't load well on mobile — most people searching for a cleaner are on their phone"
        )

    # SEO gaps
    if seo_gaps and not seo_gaps.get("schema_org"):
        problems.append(
            "not showing a star rating in Google search results — competitors with ratings look more credible"
        )
    if seo_gaps and not seo_gaps.get("meta_description"):
        problems.append(
            "missing a description in Google search results — just a blank snippet, which hurts click-throughs"
        )

    # Remaining weaknesses from scoring (deduplicated, plain language)
    for w in weaknesses[:2]:
        plain = w.strip()
        if plain and not any(plain.lower() in p for p in problems):
            problems.append(plain)

    # Cap at 3
    problems = problems[:3]

    if not problems:
        problems = ["some things that are likely costing you leads"]

    problem_list = "\n".join(f"- {p}" for p in problems)
    greeting = f"Hi {owner_name}," if owner_name else "Hi,"

    return f"""Write Email 1 of a two-touch cold outreach sequence from Ben to the owner of {name}, a cleaning business in {city}.

CONTEXT:
{greeting}

SPECIFIC PROBLEMS FOUND (translate to plain business language — no tech terms):
{problem_list}

EMAIL STRUCTURE — follow exactly:
1. "{greeting}" — then 1 short sentence saying you came across {name}
2. Name the 2–3 problems above in plain language. Each one gets 1 sentence. Connect each to missed business (lost calls, people leaving before requesting a quote).
3. Final line: "I put together something that shows how each of those could look fixed — want me to send it over?"
4. Sign off: "Ben" — nothing else. No domain. No title. No tagline.

RULES:
- NO links of any kind
- Plain text only — no HTML, no formatting
- 60–80 words total (excluding sign-off)
- Subject: specific to {name}, max 8 words, written like a real human (not "Quick question" or "I noticed your website")
- Write like a real person who actually looked at their site. Short sentences.
- Do NOT use: "I hope this finds you", "leverage", "seamlessly", "I wanted to reach out", "game-changer"
- Do NOT say "no pitch" — this IS a pitch
- Business impact only — "cost you real leads" not "slow load time"

Call the draft_email1 tool.
"""
```

**Step 3: Add `_build_email2` function (programmatic, no Claude)**

```python
def _build_email2(
    business: dict[str, Any],
    comparison_url: str,
) -> dict[str, Any]:
    """
    Generate Email 2 programmatically — short follow-up delivering the comparison link.
    No Claude call needed for this one.
    """
    name = business.get("name", "your business")
    extracted = business.get("extracted_content") or {}
    owner_name = extracted.get("owner_name")

    greeting = f"Hey {owner_name}," if owner_name else "Hey,"

    subject = f"The before/after I mentioned — {name}"

    body_text = (
        f"{greeting}\n\n"
        f"Following up on my last email. I put together a quick before/after for {name} "
        f"showing how those issues could look fixed: {comparison_url}\n\n"
        "Worth a look?\n\n"
        "Ben"
    )

    return {
        "subject": subject,
        "body_text": body_text,
        "body_html": None,
    }
```

**Step 4: Add `draft_sequence` method to `EmailDrafter` class**

Add this method to the `EmailDrafter` class (keep the existing `draft()` method for backwards compatibility during transition):

```python
def draft_sequence(
    self,
    business: dict[str, Any],
    analysis: dict[str, Any],
    comparison_url: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Draft both emails in the two-touch sequence.

    Returns (email1, email2) where each is a dict with keys:
      subject, body_text, body_html (html is None for both — plain text only)
    """
    # Email 1 — Claude-drafted, no link
    email1 = self._draft_email1(business, analysis)

    # Email 2 — programmatic template, comparison link
    email2 = _build_email2(business, comparison_url)

    return email1, email2

def _draft_email1(
    self,
    business: dict[str, Any],
    analysis: dict[str, Any],
) -> dict[str, Any]:
    prompt = _build_email1_prompt(business, analysis)

    try:
        client = _get_client()
        response = client.messages.create(
            model=settings.drafting_model,
            max_tokens=512,
            tools=[_DRAFT_EMAIL1_TOOL],
            tool_choice={"type": "tool", "name": "draft_email1"},
            messages=[{"role": "user", "content": prompt}],
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "draft_email1":
                result = block.input
                logger.info(
                    f"[email_drafter] Drafted Email 1 for {business.get('name')} "
                    f"— subject: {result.get('subject', '')[:60]}"
                )
                return {
                    "subject": result["subject"],
                    "body_text": result["body_text"],
                    "body_html": None,
                }

        raise ValueError("Claude did not return a draft_email1 tool call")

    except Exception as exc:
        logger.error(f"[email_drafter] Email 1 draft failed for {business.get('name')}: {exc}")
        raise
```

**Step 5: Commit**
```bash
git add pipeline/outreach/email_drafter.py
git commit -m "feat: add draft_sequence() to EmailDrafter — Email 1 no-link, Email 2 programmatic"
```

---

## Task 3: Update run_campaign.py — Save Both Drafts Linked

**Files:**
- Modify: `pipeline/run_campaign.py`

**Step 1: Find the outreach step** in `run_campaign.py` — it's the block starting with `if "outreach" in steps_list:` around line 289.

**Step 2: Replace the `drafter.draft()` call and `save_outreach_draft()` call** with the sequence version:

Find this section (approximately lines 313–338):
```python
draft = drafter.draft(biz, analysis, demo_email_url, comparison_email_url)
save_outreach_draft({
    "business_id": biz_id,
    "contact_id": contact_row["id"],
    "demo_site_id": demo.get("id"),
    "subject": draft["subject"],
    "body_html": draft["body_html"],
    "body_text": draft["body_text"],
    "comparison_url": comparison_url,
    "status": "draft",
})
update_business_status(biz_id, "outreach_drafted")
```

Replace with:
```python
email1, email2 = drafter.draft_sequence(biz, analysis, comparison_email_url)

# Save Email 1 — goes through normal review → approve → send flow
email1_row = save_outreach_draft({
    "business_id": biz_id,
    "contact_id": contact_row["id"],
    "demo_site_id": demo.get("id"),
    "subject": email1["subject"],
    "body_html": email1.get("body_html"),
    "body_text": email1["body_text"],
    "comparison_url": comparison_url,
    "status": "draft",
    "sequence_number": 1,
    "parent_draft_id": None,
})

# Save Email 2 — held in follow_up_pending until 4 days after Email 1 sent
save_outreach_draft({
    "business_id": biz_id,
    "contact_id": contact_row["id"],
    "demo_site_id": demo.get("id"),
    "subject": email2["subject"],
    "body_html": email2.get("body_html"),
    "body_text": email2["body_text"],
    "comparison_url": comparison_url,
    "status": "follow_up_pending",
    "sequence_number": 2,
    "parent_draft_id": email1_row["id"],
})

update_business_status(biz_id, "outreach_drafted")
logger.info(f"[outreach] Saved Email 1 + Email 2 (follow_up_pending) for {biz['name']}")
```

**Step 3: Verify `save_outreach_draft` in `pipeline/db/client.py` accepts the new fields**

Open `pipeline/db/client.py`, find `save_outreach_draft`. It's a simple `insert(data)` call — since it passes the full dict, the new fields (`sequence_number`, `parent_draft_id`) will be included automatically. No change needed.

**Step 4: Commit**
```bash
git add pipeline/run_campaign.py
git commit -m "feat: outreach step drafts and saves both Email 1 + Email 2 per business"
```

---

## Task 4: Mark as Replied — API Route + Button

**Files:**
- Create: `dashboard/app/api/outreach/[id]/mark-replied/route.ts`
- Modify: `dashboard/app/outreach/[draft_id]/DraftReviewActions.tsx`

**Step 1: Create `mark-replied` API route**

```typescript
// dashboard/app/api/outreach/[id]/mark-replied/route.ts
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
    .update({
      replied_at: new Date().toISOString(),
      status: "replied",
    })
    .eq("id", id)
    .eq("status", "sent"); // only mark as replied if currently sent

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 2: Add "Mark as Replied" button to `DraftReviewActions.tsx`**

In `DraftReviewActions.tsx`, add a `markingReplied` state and `handleMarkReplied` function alongside the other handlers:

```typescript
const [markingReplied, setMarkingReplied] = useState(false);

async function handleMarkReplied() {
  setMarkingReplied(true);
  try {
    const res = await fetch(`/api/outreach/${draft.id}/mark-replied`, { method: "POST" });
    if (!res.ok) throw new Error(await res.text());
    router.refresh();
  } catch (e: any) {
    setMessage({ type: "error", text: e.message || "Failed to mark as replied." });
    setMarkingReplied(false);
  }
}
```

Then find the `{draft.status === "sent" && (` block and replace it with:

```tsx
{draft.status === "sent" && (
  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
    <p className="font-medium mb-2">
      Sent {draft.sent_at ? `on ${new Date(draft.sent_at).toLocaleDateString()}` : ""}
    </p>
    <button
      onClick={handleMarkReplied}
      disabled={markingReplied}
      className="text-xs text-green-700 underline hover:no-underline disabled:opacity-50"
    >
      {markingReplied ? "Marking…" : "They replied — mark as replied"}
    </button>
  </div>
)}

{draft.status === "replied" && (
  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 font-medium text-center">
    Replied {draft.replied_at ? `on ${new Date(draft.replied_at).toLocaleDateString()}` : ""}
  </div>
)}
```

**Step 3: Commit**
```bash
git add dashboard/app/api/outreach/[id]/mark-replied/route.ts dashboard/app/outreach/[draft_id]/DraftReviewActions.tsx
git commit -m "feat: add Mark as Replied button + API route"
```

---

## Task 5: Build /outreach/followups Page

**Files:**
- Create: `dashboard/app/outreach/followups/page.tsx`
- Create: `dashboard/app/outreach/followups/FollowupSendButton.tsx`

**Step 1: Create `FollowupSendButton.tsx`**

This is a client component — nearly identical to `ApprovedSendButtons.tsx`:

```tsx
// dashboard/app/outreach/followups/FollowupSendButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  draftId: string;
  hasEmail: boolean;
}

export default function FollowupSendButton({ draftId, hasEmail }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSend() {
    if (!hasEmail) return;
    setState("sending");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/outreach/${draftId}/send`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setState("sent");
      setTimeout(() => router.refresh(), 800);
    } catch (e: any) {
      setErrorMsg(e.message || "Send failed");
      setState("error");
    }
  }

  if (!hasEmail) {
    return <span className="text-xs text-red-500">no email on file</span>;
  }

  if (state === "sent") {
    return <span className="text-xs text-green-600 font-semibold">Sent!</span>;
  }

  if (state === "error") {
    return (
      <span className="text-xs text-red-600" title={errorMsg}>
        Error — {errorMsg.slice(0, 40)}
      </span>
    );
  }

  return (
    <button
      onClick={handleSend}
      disabled={state === "sending"}
      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
    >
      {state === "sending" ? "Sending…" : "Send Follow-up"}
    </button>
  );
}
```

**Step 2: Create `page.tsx`**

Note: The send route at `/api/outreach/[id]/send` already handles status `follow_up_pending` incorrectly — it checks for `status === "approved"`. We need to update it (see Task 6). For now, write the page:

```tsx
// dashboard/app/outreach/followups/page.tsx
export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import type { OutreachDraft, Business, Contact } from "@/lib/types";
import Link from "next/link";
import FollowupSendButton from "./FollowupSendButton";

const FOLLOWUP_DELAY_DAYS = 4;

export default async function FollowupsPage() {
  const supabase = await createSupabaseServer();

  // Get Email 1s that were sent 4+ days ago with no reply
  const cutoff = new Date(
    Date.now() - FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: readyParents } = await supabase
    .from("outreach_drafts")
    .select("id")
    .eq("status", "sent")
    .eq("sequence_number", 1)
    .is("replied_at", null)
    .lt("sent_at", cutoff);

  const parentIds = (readyParents ?? []).map((p) => p.id);

  let followups: any[] = [];
  if (parentIds.length > 0) {
    const { data } = await supabase
      .from("outreach_drafts")
      .select("*, businesses(name, city, state), contacts(name, email)")
      .eq("sequence_number", 2)
      .eq("status", "follow_up_pending")
      .in("parent_draft_id", parentIds)
      .order("created_at", { ascending: false });
    followups = data ?? [];
  }

  // Also show already-sent follow-ups
  const { data: sentFollowups } = await supabase
    .from("outreach_drafts")
    .select("*, businesses(name, city, state), contacts(name, email)")
    .eq("sequence_number", 2)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-gray-500 mt-1">
            {followups.length} ready to send · Email 2s for leads who haven't replied
          </p>
        </div>
        <Link href="/outreach" className="text-sm text-gray-500 hover:text-gray-700">
          ← All Drafts
        </Link>
      </div>

      {followups.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center text-blue-700 mb-10">
          No follow-ups ready yet. They appear here {FOLLOWUP_DELAY_DAYS} days after Email 1 is sent to leads who haven't replied.
        </div>
      )}

      {followups.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ready to Send ({followups.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {followups.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/outreach/${d.id}`} className="hover:underline">
                        {d.businesses?.name ?? "—"}
                      </Link>
                      {d.businesses?.city && (
                        <span className="ml-1 text-xs text-gray-400">{d.businesses.city}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {d.subject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.contacts?.email ?? <span className="text-red-500">no email</span>}
                    </td>
                    <td className="px-4 py-3">
                      <FollowupSendButton
                        draftId={d.id}
                        hasEmail={!!d.contacts?.email}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(sentFollowups ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Already Sent ({sentFollowups!.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sentFollowups!.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/outreach/${d.id}`} className="hover:underline">
                        {d.businesses?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.contacts?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.sent_at ? new Date(d.sent_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add dashboard/app/outreach/followups/
git commit -m "feat: add /outreach/followups page — Email 2 send queue"
```

---

## Task 6: Update Send Route to Accept follow_up_pending

**Files:**
- Modify: `dashboard/app/api/outreach/[id]/send/route.ts`

The existing send route at line 28 checks `draft.status !== "approved"` and rejects anything else. Follow-up emails have status `follow_up_pending` and need to be allowed through.

**Step 1: Update the status check**

Find this block (lines 28–33):
```typescript
if (draft.status !== "approved") {
  return NextResponse.json(
    { error: `Draft status is "${draft.status}" — must be "approved" before sending` },
    { status: 400 }
  );
}
```

Replace with:
```typescript
const sendableStatuses = ["approved", "follow_up_pending"];
if (!sendableStatuses.includes(draft.status)) {
  return NextResponse.json(
    { error: `Draft status is "${draft.status}" — must be "approved" or "follow_up_pending" before sending` },
    { status: 400 }
  );
}
```

**Step 2: Commit**
```bash
git add dashboard/app/api/outreach/[id]/send/route.ts
git commit -m "feat: allow follow_up_pending drafts through the send route"
```

---

## Task 7: Warm-up Counter Banner on /outreach/approved

**Files:**
- Modify: `dashboard/app/outreach/approved/page.tsx`

**Step 1: Add warm-up data queries** to the top of `ApprovedOutreachPage` (before the drafts query):

```typescript
// Warm-up config
const { data: configRows } = await supabase
  .from("app_config")
  .select("key, value")
  .in("key", ["outreach_subdomain_start_date", "outreach_daily_cap"]);

const configMap = Object.fromEntries(
  (configRows ?? []).map((r) => [r.key, r.value])
);
const dailyCap: number = (configMap["outreach_daily_cap"] as number) ?? 8;
const startDateStr: string = (configMap["outreach_subdomain_start_date"] as string) ?? "";

// Count emails sent today
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const { count: sentTodayCount } = await supabase
  .from("outreach_drafts")
  .select("id", { count: "exact", head: true })
  .gte("sent_at", todayStart.toISOString());
const sentToday = sentTodayCount ?? 0;
const remaining = Math.max(0, dailyCap - sentToday);

// Calculate subdomain age
const subdomainAge = startDateStr
  ? Math.floor((Date.now() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24))
  : 0;
```

**Step 2: Add the banner** to the JSX, right after the `<div className="mb-6 flex items-center justify-between">` header block and before the sections:

```tsx
{/* Warm-up counter banner */}
<div className={`mb-6 rounded-xl border px-5 py-3 flex items-center gap-4 text-sm ${
  remaining === 0
    ? "bg-red-50 border-red-200 text-red-700"
    : remaining <= 3
    ? "bg-yellow-50 border-yellow-200 text-yellow-700"
    : "bg-gray-50 border-gray-200 text-gray-600"
}`}>
  <span>
    <strong>Today:</strong> {sentToday} of {dailyCap} sent · {remaining} remaining
  </span>
  <span className="text-gray-400">|</span>
  <span>Subdomain age: day {subdomainAge}</span>
  {remaining === 0 && (
    <>
      <span className="text-gray-400">|</span>
      <span className="font-medium">Daily cap reached — update in Supabase app_config to increase</span>
    </>
  )}
</div>
```

**Step 3: Commit**
```bash
git add dashboard/app/outreach/approved/page.tsx
git commit -m "feat: add warm-up counter banner to Send Queue page"
```

---

## Task 8: Update Nav

**Files:**
- Modify: `dashboard/app/layout.tsx`

**Step 1: Add Follow-ups to navLinks**

Find the `navLinks` array and add the Follow-ups entry after "Send Queue":

```typescript
const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/scores", label: "Scores" },
  { href: "/demos", label: "Demos" },
  { href: "/outreach", label: "Outreach" },
  { href: "/outreach/approved", label: "Send Queue" },
  { href: "/outreach/followups", label: "Follow-ups" },
  { href: "/clients", label: "Clients" },
];
```

**Step 2: Commit**
```bash
git add dashboard/app/layout.tsx
git commit -m "feat: add Follow-ups link to dashboard nav"
```

---

## Verification Checklist

Run these after all tasks are complete:

- [ ] **Subdomain verified**: `mail.tradeeasehq.com` shows green in Resend domains
- [ ] **Env vars updated**: `RESEND_FROM_EMAIL=ben@mail.tradeeasehq.com` and `RESEND_FROM_NAME=Ben` in both `.env` and Vercel
- [ ] **Schema migration ran**: `outreach_drafts` has `sequence_number` and `parent_draft_id` columns; `app_config` table exists with two rows
- [ ] **Pipeline test**: Run pipeline for 1 business (`--steps outreach` on an existing demo'd business), confirm 2 rows created in `outreach_drafts` — one `status=draft sequence_number=1`, one `status=follow_up_pending sequence_number=2` with `parent_draft_id` set
- [ ] **Email 1 content check**: Review the drafted Email 1 in dashboard — should have no link, specific problems named, ends with reply ask
- [ ] **Email 2 content check**: Review Email 2 draft — short, comparison link present, under 60 words
- [ ] **Send route test**: Try sending a `follow_up_pending` draft via the API — should succeed
- [ ] **Mark as Replied**: Send a test email, click "They replied" on the detail page, confirm status becomes `replied`
- [ ] **Follow-ups page**: Navigate to `/outreach/followups` — page loads, shows empty state or pending follow-ups
- [ ] **Warm-up counter**: Navigate to `/outreach/approved` — banner shows daily cap and sent count
- [ ] **Nav**: "Follow-ups" link appears in sidebar

---

## Post-Launch: Warm-up Schedule

Update `outreach_daily_cap` in Supabase `app_config` table manually as the subdomain ages:

| Subdomain age | Set daily_cap to |
|---|---|
| Days 1–3 | 8 |
| Days 4–7 | 15 |
| Days 8–11 | 25 |
| Days 12–15 | 40 |
| Day 16+ | 50+ |

To update: Supabase → Table Editor → `app_config` → edit the `outreach_daily_cap` row.

## Future: Automated Reply Detection (Phase 2)

When volume grows past 50/day, add a daily cron job that:
1. Fetches sent Email 1s where `replied_at IS NULL` using Gmail API
2. Checks if any threads have replies (match by `resend_message_id` → Gmail Message-ID header)
3. Calls `POST /api/outreach/[id]/mark-replied` for matches

The `replied_at` field already exists — no schema change needed when this ships.
