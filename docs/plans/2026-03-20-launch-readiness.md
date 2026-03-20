# Launch Readiness Design — LeadScraper V1
**Date:** 2026-03-20
**Status:** Approved, ready for implementation planning

---

## Context

The pipeline is functional end-to-end but not ready for outreach. The demo sites (v2/v3) are decent but not impressive enough to sell against clients whose existing sites look reasonable. The post-sale infrastructure doesn't exist yet. There's no live AI chat, no client management system, no SEO in the demos, and no contract. Before sending a single outreach email, all of this needs to be in place — because closing a deal unprepared is worse than not closing it at all.

**Intended outcome:** A complete, professional system where (1) demos are beautiful and clearly superior, (2) the pitch includes tangible SEO and feature advantages shown on the comparison page, (3) if a deal closes there's a clear workflow to onboard, deploy, and maintain the client's site, (4) the client signs a contract before anything goes live, and (5) the codebase context system keeps Claude accurate as the project scales.

---

## Design

### 1. Template v4

**North star:** Indistinguishable from a real, polished live website. Business owner sees it and thinks "if my site looked like this, I'd close more jobs." Tried-and-true layout (high-end local service SaaS landing page style) — confident whitespace, large photography, one bold brand color, clear conversion flow.

**Layout (12 sections):**
1. Nav — logo (properly sized, never cropped), phone in top bar, no duplicate CTA on mobile/tablet
2. Hero — full-width photo with brand-color overlay, large display headline, tagline, "Get a Free Quote" CTA + phone link
3. Social proof bar — rating, review count, years in business — immediately under hero
4. Why choose [Business Name] — 3 columns, extracted USPs with icons
5. Services grid — cards with icons, from `services_enhanced`
6. About — photo + `about_text` / `trust_statement`
7. Reviews — large format, reviewer name always visible, stars prominent, city-personalized
8. How it works — 3 steps (Quote → Schedule → Enjoy), tight mobile spacing
9. Service areas — tag cloud, only if multiple areas
10. FAQ — accordion
11. Quote form — large, prominent, fields: name, email, phone, home size, service needed, frequency, message
12. Footer — business name, phone, address, Trade Ease demo credit

**Brand adaptation (stronger than v2/v3):**
- Hero overlay uses brand primary color at 70% opacity — entire hero is tinted their color
- CTA buttons, section accents, icon backgrounds all use brand color
- Logo displayed prominently in hero + nav
- Fallback palette: premium warm neutral if no brand colors extractable

**Photo strategy:**
- Primary: business photos from Google Places if quality acceptable (existing `photos.py` logic)
- Fallback: Unsplash Source API — free, no key required — niche-specific search terms:
  - Housekeeping: `"clean modern home interior"`, `"professional house cleaning"`, `"bright kitchen spotless"`, `"spotless bathroom"`
- `photos.py` updated to handle Unsplash fallback automatically

**Three-breakpoint design from day one:**

| Element | Mobile (<768px) | Tablet (768–1024px) | Desktop (>1024px) |
|---|---|---|---|
| Nav | Logo + hamburger, no CTA | Logo + links, no CTA | Logo + links + CTA |
| Logo | max-height 36px, contain | max-height 44px | max-height 52px |
| Hero | Stacked (copy above photo) | Split 50/50 | Split 60/40 |
| Services | 1 col | 2 col | 3 col |
| Rooms coverage | 2-col pill grid | 3-col pill grid | 4-col pill grid |
| Steps | Vertical, tight padding | Horizontal 3-col | Horizontal 3-col |
| Reviews | Full-width, name visible | 2 col | 3 col |
| Quote form | Single col, full-width | Single col, max 560px | 2-col grid |
| About | Stacked | Side by side | Side by side |

**Tested at:** iPhone SE (375px), iPhone 14 (390px), iPad (768px), iPad Pro (1024px), Desktop (1280px)

**SEO built in, not displayed:**
- Schema.org `LocalBusiness` JSON-LD in `<head>` — name, phone, address, rating, review count, service area, `@type: "HouseCleaning"`
- `<meta name="description">` — tagline + city/state, 150–160 chars
- `<title>` — `[Business Name] — Professional House Cleaning in [City], [State]`
- Open Graph tags
- `<link rel="canonical">` set to demo URL (updated to live domain post-sale)
- Viewport meta tag

**Template files:** `templates/housekeeping-v4/index.html`, `styles.css`, `script.js`, `template_spec.json`

---

### 2. SEO Strategy

**Pipeline analysis additions (`pipeline/analysis/` — existing step):**
After HTML extraction, run lightweight SEO gap check on client's site HTML. No external API. Check for:
1. Meta description — present and non-empty?
2. Schema.org JSON-LD — any present?
3. Open Graph tags?
4. Viewport meta tag?
5. `<h1>` exists?
6. PageSpeed mobile score — already collected

Result stored as `seo_gaps: []` array in `website_analyses` table (new column or inside `raw_scores_json`).

**Comparison page additions (`pipeline/outreach/comparison_builder.py`):**
Add SEO checklist section below visual screenshots:

```
                      Their Site    Your New Site
Meta description          ✗              ✓
Schema.org markup         ✗              ✓
Mobile-optimized          ✓              ✓
Open Graph tags           ✗              ✓
PageSpeed (mobile)        42             94
Heading structure         ✓              ✓
```

Framed as "here's what your new site includes" — positive, not an attack on their current site.

---

### 3. Live AI Chat Backend

**Architecture:**
- Widget: floating "Chat With Us" button in v4 template (already exists as mockup)
- Backend: Next.js API route `POST /api/chat` — takes `{ message, business_id, history[] }` → fetches business config from `client_sites.ai_agent_config` → sends to Claude API with system prompt → streams response
- System prompt built from config: business name, services, service areas, hours, pricing range (e.g. "starting at $120"), escalation trigger ("speak to someone" → provide phone/email)
- Config stored in `client_sites.ai_agent_config` JSONB (column already exists in schema)
- Demo mode: widget calls same API with demo config (so the demo is a live preview, not a mockup)

**Admin config (`dashboard/app/clients/[id]/page.tsx`):**
When onboarding a client, fill in their chat config: services list, service areas, hours, pricing range, escalation phrase, contact fallback. One form, saved to Supabase.

**Cost:** Claude Haiku for chat responses — extremely cheap per message (~$0.0003/1k tokens). Fine to absorb in the base package price at this volume.

**Spam protection (required before launch):**
- IP-based rate limiting: max 10 messages per 60 seconds, 50 per hour per IP — enforced in the `/api/chat` route using Upstash Redis (free tier, Vercel-native integration)
- Message length cap: 500 characters — reject anything longer with a 400
- Minimum interval enforcement: reject requests arriving less than 1 second apart from the same IP
- Honeypot field in the chat form: a hidden input that bots fill in but real users don't — if populated, silently drop the request without calling the API
- Abuse pattern: if same IP sends 5+ identical messages, block for 1 hour
- Hard monthly spend cap: set a `max_spend` alert in the Anthropic console so any runaway usage triggers an alert before it becomes a real cost

---

### 4. Post-Sale Workflow

**Onboarding form:** Tally (free tier). Sent to client after deal closes. Fields: confirm business info, brand colors, photos to use, services, service areas, hours, any content changes from demo. Responses stored manually (copy into dashboard override fields) — not auto-integrated at MVP.

**New dashboard section: `/clients`**

Pages:
- `/clients` — table: business name, domain, plan, status (pending/live/suspended), monthly fee, go-live date
- `/clients/new` — create client record, link to Tally form, enter domain
- `/clients/[id]` — client detail: current site preview iframe, onboarding form responses, change request log, chat config editor, "Finalize & Deploy" button, "Redeploy" button

**Vercel deploy flow:**
1. You click "Finalize & Deploy" in dashboard
2. API route: re-renders v4 template with any onboarding overrides → deploys to Vercel via Vercel API → attaches custom domain → marks `client_sites.hosting_status = live`
3. Client receives automated email: "Your site is live. Here's how to point your domain: [3-step DNS instructions]"
4. Vercel handles SSL automatically

**Domain handling — two-tier approach:**
Most clients will not know how to add a CNAME record. Offer both paths:

1. **Self-serve (preferred):** Send a one-page email with registrar-specific instructions (GoDaddy, Namecheap, Google Domains, Squarespace — the 4 most common). Add CNAME `www` → `cname.vercel-dns.com`. Most technical clients can do this in 5 minutes.

2. **We manage (if they can't/won't):** Client can either (a) grant you temporary registrar access, or (b) transfer their DNS zone to Cloudflare (free) and point nameservers there — then you manage the DNS record from the Cloudflare dashboard with no access to their domain registration. **Cloudflare transfer is the better option** — it's free, client still owns the domain, you just manage DNS records. Send them a one-page Cloudflare nameserver transfer guide. Once DNS is on Cloudflare you can point records for all your clients from one dashboard. This scales well.

Both options: Vercel handles SSL automatically once DNS propagates.

**Change request flow:**
1. Client fills out Tally "Change Request" form (separate form from onboarding)
2. Dashboard notification appears in `/clients/[id]`
3. You review, apply overrides, click "Apply & Redeploy"
4. Vercel redeploys, client gets confirmation email
5. Same-day turnaround target

**What's deferred to Phase 2/3:** Real review syncing, client self-service portal, review automation, analytics dashboard.

**Critical files:**
- `pipeline/db/schema.sql` — add any missing columns to `client_sites`
- `dashboard/app/clients/` — new directory, all new files
- `dashboard/app/api/clients/[id]/deploy/route.ts` — new Vercel deploy API route

---

### 5. Contract (Service Agreement Template)

**Format:** PDF with fillable signature field. Client signs via Adobe Reader/Preview/PDF24 and emails back. No paid tool needed.

**Key clauses:**
- **Scope** — website (v4), SEO optimization, AI chat, hosting on Vercel, change requests (reasonable scope)
- **Not included** — paid ads, social media, review automation, booking integration (Phase 2 upsells)
- **Pricing** — monthly fee, billing date, 30-day grace on failed payment → suspension (not deletion)
- **IP ownership** — Trade Ease owns site and code during relationship. Client owns their domain always. On cancellation: client receives full HTML export.
- **Cancellation** — 30-day written notice either party. Last month's payment non-refundable. Site stays live through paid period then goes offline.
- **Change requests** — covered under plan for reasonable updates. Full redesigns quoted separately.
- **Limitation of liability** — not liable for lost business, SEO ranking changes, or AI chat responses.
- **AI chat disclosure** — widget is AI-powered, business owner responsible for accuracy of configured info.

**Storage:** PDF template saved in `/docs/contract/service-agreement-template.pdf` (and `.docx` source for editing).

---

### 6. Context & Memory System

**`CLAUDE.md` at repo root** — auto-loaded every session. Contents:
- Project purpose (one sentence)
- Load-bearing file map (what file does what)
- Architectural decisions + reasons (adapter pattern, CSS inlining, never auto-send, v4 is the active template)
- Active campaign state
- Common traps (e.g., "editing v1/v2/v3 templates has no effect on new demos — pipeline uses v4")
- Feature area → files to read map (e.g., "touching AI chat? read: api/chat/route.ts, client_sites schema, ai_agent_config")

**Tighter memory files** — split current dense memory into focused files:
- `memory/project_architecture.md` — stack, adapters, data flow
- `memory/active_campaigns.md` — current city/niche/status
- `memory/pipeline_gotchas.md` — known traps and non-obvious behaviors
- `memory/product_decisions.md` — pricing, features, what's in/out of scope

Each file stays under 30 lines. MEMORY.md index stays lean.

**Living memory rule:** Memory files must be updated whenever a key decision changes — new template version, pricing change, new city/niche, architectural change, new gotcha discovered. At the end of any session where a significant decision was made, the relevant memory file gets updated before closing. This is not optional — stale memory is worse than no memory because it causes confident wrong answers.

---

### 7. Lead Qualification & Scoring Filters

**Problem:** The current scoring rubric measures website quality but not whether a business is actually a good prospect. Building demos for businesses that won't convert wastes pipeline resources and dilutes outreach quality.

**Two-layer qualification:**

**Layer 1 — Hard filters (skip entirely, never build a demo):**
- No phone number extractable — can't follow up regardless of interest
- Business name contains franchise/chain signals: "Molly Maid", "Merry Maids", "Two Maids", "The Maids", "Maid Brigade", "Jan-Pro", "ServiceMaster" — franchise owners are contractually bound by corporate marketing, they cannot change their website
- Category clearly off-niche: commercial janitorial, industrial cleaning — completely different buyer, different sales cycle, wrong pitch

**Layer 1b — Soft deprioritization (build demo, but lower priority + adjusted pitch):**
- Google review count < 3 — could be a legitimately great new business, not a hard no. Deprioritize: −20 quality points. Still builds a demo if other signals are strong.
- Website score ≥ 75 — site is already solid but still a valid target. Assign to `feature_pitch` tier. Email pitch: "Your current site is already solid — here's what we built for you that takes it further. If you'd prefer to keep your existing design, we're also open to simply adding AI chat + SEO as a standalone layer." Two offers in one email: (a) full v4 upgrade, (b) feature add-on. AI chat is platform-agnostic (embeddable JS snippet). SEO/mobile improvements come with whichever route they choose. No quality score penalty — these businesses are legitimate prospects.

**Layer 2 — Quality scoring additions (factor into priority_tier):**
Add these signals to the scoring rubric to improve targeting:

| Signal | Points | Rationale |
|---|---|---|
| review_count 10–50 | +5 | Active but not huge chain |
| review_count 50+ | +3 | Active, slightly more established |
| review_count < 3 | disqualify | Not proven |
| has_phone | required | Can't follow up without it |
| years_in_business 2–10 | +5 | Established but growth-minded |
| website exists but scores poorly | +5 | Already invested in web presence, more receptive |
| no_website | −5 | Lower priority — less web-savvy |
| pagespeed_mobile < 50 | +5 | Clear technical problem we can fix |
| missing_schema_markup | +3 | Clear SEO gap we can point to |

**Result:** A business with 35 reviews, a phone number, a 3-year history, and a slow mobile site is a much higher-value target than a business with 1 review and no phone — even if their website scores similarly on the visual rubric.

**Implementation:** Add these signals to `pipeline/analysis/scorer.py` as a `lead_quality_score` (0–100) computed alongside the website score. Filter: only build demos for businesses where `lead_quality_score >= 40`. Store in `website_analyses.raw_scores_json` under key `lead_quality`.

---

## Implementation Phases (Execution Order)

### Phase 0 — Context system (do first, improves everything after)
1. Write `CLAUDE.md` at repo root
2. Restructure memory files

### Phase 1 — Template v4 (core of the pitch)
3. Build `templates/housekeeping-v4/` — index.html, styles.css, script.js, template_spec.json
4. Update `pipeline/generation/photos.py` — Unsplash fallback
5. Register v4 in templates table / `template_engine.py`
6. Test render: `python -m pipeline.run_campaign --city Austin --state TX --steps demo`

### Phase 1b — Lead Qualification (run before demo step)
6b. Add `lead_quality_score` to `pipeline/analysis/scorer.py` — hard filters + quality signals
6c. Update `run_campaign.py` demo step to skip businesses where `lead_quality_score < 40`

### Phase 2 — SEO
7. Update `pipeline/analysis/scorer.py` or add `seo_checker.py` — SEO gap analysis on client HTML
8. Update `pipeline/outreach/comparison_builder.py` — add SEO checklist section
9. Verify SEO tags render correctly in v4 template output

### Phase 3 — AI Chat backend
10. Add `dashboard/app/api/chat/route.ts` — Claude API integration
11. Update v4 template chat widget to call live API (pass `business_id` or `demo_id`)
12. Add chat config editor to dashboard (can be part of Phase 4 clients section)

### Phase 4 — Post-sale dashboard
13. Add `dashboard/app/clients/` pages — list, new, detail
14. Add `dashboard/app/api/clients/[id]/deploy/route.ts` — Vercel API integration
15. Update `pipeline/db/schema.sql` if any columns missing from `client_sites`
16. Set up Tally forms (onboarding + change request) — instructions only, no code

### Phase 5 — Contract
17. Write service agreement as Markdown → export to PDF
18. Save to `docs/contract/`

### Phase 6 — Regenerate Austin demos
19. `python scripts/reset_demos.py --city Austin --state TX`
20. `python -m pipeline.run_campaign --city Austin --state TX --steps demo`
21. Verify v4 renders correctly, mobile/tablet looks good, AI chat widget connects to backend

---

## Critical Files

**Modify:**
- `pipeline/generation/template_engine.py` — register v4, ensure CSS/JS inlining works for v4
- `pipeline/generation/photos.py` — Unsplash fallback
- `pipeline/outreach/comparison_builder.py` — SEO checklist section
- `pipeline/analysis/` — SEO gap checker (new file or extend existing scorer)
- `pipeline/db/schema.sql` — any missing client_sites columns
- `dashboard/app/layout.tsx` — add Clients to nav

**Create:**
- `templates/housekeeping-v4/` (4 files)
- `dashboard/app/clients/` (3 pages)
- `dashboard/app/api/chat/route.ts`
- `dashboard/app/api/clients/[id]/deploy/route.ts`
- `CLAUDE.md`
- `docs/contract/service-agreement-template.md`
- Memory files (restructure existing)

**Do not touch:**
- `templates/housekeeping-v1/`, `v2/`, `v3/` — leave as-is, deprecated
- `pipeline/outreach/resend_sender.py` — never auto-send, leave untouched

---

## Verification (Design)

1. **v4 template:** Render a demo for an Austin lead, open in browser, check all 3 breakpoints (375px, 768px, 1280px). Logo not cropped. No duplicate CTA on mobile. Review names visible. Steps section tight on mobile.
2. **SEO:** View source of rendered demo — confirm JSON-LD block present, meta description populated, title correct.
3. **Comparison page:** Generate comparison for a lead, verify SEO checklist appears alongside screenshots.
4. **AI chat:** Open demo site, click chat widget, send a message, confirm Claude responds with business-specific context.
5. **Clients dashboard:** Create a test client record, click "Finalize & Deploy," confirm Vercel API call succeeds and domain attachment works.
6. **End-to-end:** One Austin lead — ingest → analyze (with SEO gap check) → generate v4 demo → draft outreach → review comparison page. All steps clean.

---

---

# Launch Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build everything needed before outreach — v4 template, SEO pipeline, live AI chat, post-sale dashboard, contract, and context system — so no deal can catch the system unprepared.

**Architecture:** Six sequential phases. Each phase is independently committable. Phase 0 improves Claude's accuracy for all subsequent phases. Phases 1–3 make the demo itself excellent. Phases 4–5 make the post-sale workflow operational. Phase 6 regenerates all Austin demos using the new template.

**Tech Stack:** Python (Jinja2, Playwright, Claude API via anthropic SDK), Next.js 14 App Router, Tailwind CSS, Supabase (Postgres + Storage), Vercel API, Resend, Unsplash Source (no API key), Claude Haiku for chat responses.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `pipeline/generation/template_engine.py` | `render(template_id, data)` — Jinja2 + spec validation + asset inlining |
| `pipeline/generation/photos.py` | `get_demo_photos(seed)` — curated Unsplash URL selection |
| `pipeline/outreach/comparison_builder.py` | `build_comparison(business, analysis, demo_url)` — before/after HTML |
| `pipeline/analysis/scorer.py` | Website scoring via Claude vision |
| `pipeline/db/schema.sql` | Source of truth for all table definitions |
| `pipeline/db/client.py` | Typed Supabase helpers — always use these, never raw calls |
| `pipeline/run_campaign.py` | Main CLI orchestrator |
| `dashboard/app/layout.tsx` | Root layout with nav |
| `dashboard/app/api/outreach/[id]/send/route.ts` | Pattern for all API routes |
| `dashboard/app/outreach/[draft_id]/page.tsx` | Pattern for all detail pages |
| `templates/housekeeping-v2/template_spec.json` | Pattern for template_spec.json |
| `templates/housekeeping-v2/script.js` | Pattern for script.js (FAQ, chat, scrollspy, animations) |

---

## Phase 0 — Context System

### Task 1: Write CLAUDE.md

**Files:**
- Create: `CLAUDE.md` (repo root)

**Step 1: Create the file**

```markdown
# LeadScraper V1 — Claude Context

## What This Is
Automated lead-gen + demo-site engine for local service businesses. Pipeline finds leads
(Google Places API), scores their websites (Claude vision), generates personalized demo
sites, drafts outreach emails. Human reviews and manually sends. Starting niche: housekeeping.

## Active Campaign
- City: Austin, TX | Niche: housekeeping | Template: housekeeping-v4

## Load-Bearing Files
| Area | File |
|------|------|
| Pipeline orchestrator | pipeline/run_campaign.py |
| Template renderer | pipeline/generation/template_engine.py |
| Photo selection | pipeline/generation/photos.py |
| Content AI upgrader | pipeline/generation/content_upgrader.py |
| SEO gap checker | pipeline/analysis/seo_checker.py |
| Comparison page | pipeline/outreach/comparison_builder.py |
| DB schema (source of truth) | pipeline/db/schema.sql |
| DB helpers (always use these) | pipeline/db/client.py |
| Dashboard root layout + nav | dashboard/app/layout.tsx |
| API route pattern | dashboard/app/api/outreach/[id]/send/route.ts |
| Chat API | dashboard/app/api/chat/route.ts |
| Clients dashboard | dashboard/app/clients/ |

## Active Templates
- **housekeeping-v4** — current default, used for all new demos
- v1/v2/v3 — deprecated, do not edit

## Critical Rules
- NEVER auto-send email — always human approval via dashboard
- NEVER scrape Google directly — LeadSourceAdapter handles source switching
- CSS and JS are INLINED at render time by template_engine.py — editing styles.css
  in a deployed demo has no effect. Edit the template source files, then re-render.
- template_engine.render() just needs the directory to exist — no "registration" needed
- Always use pipeline/db/client.py helpers for Supabase — never raw calls

## Env Vars (set in .env and Vercel)
SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY,
RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME, PHYSICAL_ADDRESS,
ADMIN_SESSION_SECRET, VERCEL_API_TOKEN, VERCEL_TEAM_ID (optional)

## Feature Area → Files Map
- **AI chat:** dashboard/app/api/chat/route.ts + client_sites.ai_agent_config in schema
- **Demos:** pipeline/generation/ (template_engine, content_upgrader, storage_deploy, photos)
- **Scoring:** pipeline/analysis/ (scorer, content_extractor, seo_checker)
- **Outreach:** pipeline/outreach/ (email_drafter, comparison_builder, contact_extractor)
- **Post-sale:** dashboard/app/clients/ + dashboard/app/api/clients/[id]/deploy/route.ts
```

**Step 2: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md context file for AI session accuracy"
```

---

### Task 2: Restructure memory files

**Files:**
- Create: `.claude/projects/-Users-benwitt-LeadScraper-V1/memory/project_architecture.md`
- Create: `.claude/projects/-Users-benwitt-LeadScraper-V1/memory/pipeline_gotchas.md`
- Create: `.claude/projects/-Users-benwitt-LeadScraper-V1/memory/active_campaigns.md`
- Create: `.claude/projects/-Users-benwitt-LeadScraper-V1/memory/product_decisions.md`
- Modify: `.claude/projects/-Users-benwitt-LeadScraper-V1/memory/MEMORY.md`

**Step 1: Create project_architecture.md**

```markdown
---
name: project_architecture
description: Stack, adapter pattern, data flow, key architectural decisions
type: project
---

Stack: Python pipeline + Next.js 14 dashboard + Supabase + Vercel + Resend + Claude API.
Adapter pattern throughout: LeadSourceAdapter, AIModelAdapter, DemoDeploymentAdapter.
CSS/JS inlined at render time — only index.html uploaded to storage.
DB helpers in pipeline/db/client.py — never use raw Supabase calls.
Dashboard deployed to Vercel — git push to main triggers redeploy.
```

**Step 2: Create pipeline_gotchas.md**

```markdown
---
name: pipeline_gotchas
description: Non-obvious behaviors and traps in the pipeline that cause wasted debugging
type: project
---

- Editing v1/v2/v3 template files has no effect on demos — pipeline uses v4 only.
- CSS/JS edits to template source require re-running the demo step to take effect.
- reset_demos.py must null outreach_drafts.demo_site_id before deleting demo_sites (FK constraint).
- template_engine.py uses StrictUndefined — every Jinja2 variable must be in data dict or have a fallback in spec.
- Google Places API: use $300 GCP credit, then flip to self-scraper. Never pay.
- Contact email: if coverage drops below 40%, consider Apollo/Hunter.
- Comparison page uploads to Supabase Storage — requires storage bucket 'comparisons' to be public.
```

**Step 3: Create active_campaigns.md**

```markdown
---
name: active_campaigns
description: Current city/niche/status for lead gen campaigns
type: project
---

Active: Austin, TX — housekeeping — pipeline run through outreach drafting.
Next step: regenerate demos with v4 template, then begin outreach.
```

**Step 4: Create product_decisions.md**

```markdown
---
name: product_decisions
description: Core product/pricing decisions locked in — don't relitigate these
type: project
---

- Selling: complete online presence bundle (site + AI chat + SEO + hosting), NOT just a website.
- Pricing: ~$149–199/mo base package. AI chat included at launch.
- No booking widget — housekeeping requires quote-first (price depends on home size/services).
- Primary CTA is always "Get a Free Quote" leading to the contact form.
- NEVER auto-send email — human approval required every time.
- Demo pitch angle: "your site is decent but missing X" for candidate-tier sites.
- Post-sale: Vercel + custom domains. Client keeps registrar control. We add CNAME.
- Change requests: Tally form → dashboard review → one-click redeploy.
- Contract: PDF service agreement, signed before go-live, no paid e-sign tool needed.
- Phase 2/3 upsells: review automation, client portal, real review sync, analytics.
```

**Step 5: Update MEMORY.md index** — replace the dense block with lean pointers to the new files, keeping total under 200 lines.

**Step 6: Commit**
```bash
git add .claude/
git commit -m "docs: restructure memory into focused topic files"
```

---

## Phase 1 — Template v4

### Task 3: Create template directory and template_spec.json

**Files:**
- Create: `templates/housekeeping-v4/template_spec.json`

**Step 1: Create the spec file** — copy structure from v2 spec, update template_id, add new fields for v4:

```json
{
  "template_id": "housekeeping-v4",
  "niche": "housekeeping",
  "version": "1.0",
  "description": "Premium v4 — full-bleed hero, brand-adaptive, mobile-first three-breakpoint layout",
  "fields": {
    "business_name":   { "required": true,  "type": "string",  "source": "businesses.name" },
    "phone":           { "required": true,  "type": "string",  "source": "businesses.phone" },
    "city":            { "required": true,  "type": "string",  "source": "businesses.city" },
    "state":           { "required": true,  "type": "string",  "source": "businesses.state" },
    "tagline":         { "required": false, "type": "string",  "source": "ai_generated",    "fallback": "Professional cleaning you can trust." },
    "about_text":      { "required": false, "type": "text",    "source": "ai_generated",    "fallback": "We take pride in delivering exceptional results every visit." },
    "trust_statement": { "required": false, "type": "string",  "source": "ai_generated",    "fallback": "Your home deserves the best care." },
    "service_area_text":{ "required": false,"type": "string",  "source": "ai_generated",    "fallback": "" },
    "services_enhanced":{ "required": false,"type": "list",    "source": "ai_generated",    "fallback": [{"name": "Standard Cleaning", "description": "Top-to-bottom clean for every room.", "icon": "🧹"}, {"name": "Deep Cleaning", "description": "Detailed clean of every surface and corner.", "icon": "✨"}, {"name": "Move-In/Out Cleaning", "description": "Thorough clean for moves and transitions.", "icon": "📦"}] },
    "faq_items":       { "required": false, "type": "list",    "source": "ai_generated",    "fallback": [{"question": "How do I get a quote?", "answer": "Fill out our quick form and we'll respond within 2 hours."}, {"question": "Are you insured?", "answer": "Yes — fully bonded and insured for your peace of mind."}] },
    "service_areas":   { "required": false, "type": "list",    "source": "extracted_content.service_areas", "fallback": [] },
    "rating":          { "required": false, "type": "decimal", "source": "businesses.rating" },
    "review_count":    { "required": false, "type": "integer", "source": "businesses.review_count", "fallback": 0 },
    "years_in_business":{ "required": false,"type": "integer", "source": "extracted_content.years_in_business" },
    "owner_name":      { "required": false, "type": "string",  "source": "extracted_content.owner_name" },
    "address":         { "required": false, "type": "string",  "source": "businesses.address" },
    "logo_url":        { "required": false, "type": "string",  "source": "generated" },
    "hero_photo_url":  { "required": false, "type": "string",  "source": "generated",       "fallback": "" },
    "about_photo_url": { "required": false, "type": "string",  "source": "generated",       "fallback": "" },
    "brand_css_vars":  { "required": false, "type": "string",  "source": "generated",       "fallback": "" },
    "website_url":     { "required": false, "type": "string",  "source": "businesses.website_url" },
    "booking_url":     { "required": false, "type": "string",  "source": "static",          "fallback": "#contact" },
    "business_id":     { "required": false, "type": "string",  "source": "businesses.id",   "fallback": "" },
    "demo_banner_text":{ "required": false, "type": "string",  "source": "static",          "fallback": "Demo site" }
  }
}
```

**Step 2: Commit**
```bash
git add templates/housekeeping-v4/template_spec.json
git commit -m "feat: add housekeeping-v4 template spec"
```

---

### Task 4: Build styles.css

**Files:**
- Create: `templates/housekeeping-v4/styles.css`

**Step 1: Write the CSS file** with these sections in order:

1. **CSS custom properties** — brand colors (with premium warm defaults), typography scale, spacing, shadows, transitions
2. **Reset + base** — box-sizing, margin/padding reset, smooth scroll, body font
3. **Typography** — display font (Playfair Display from Google Fonts for headings), Inter for body
4. **Demo banner** — full-width top bar, small text
5. **Nav** — sticky, white bg with subtle border-bottom, logo sizing (max-height with object-fit: contain), links, CTA button
6. **Hero** — full-viewport-height, background image with brand color overlay (70% opacity), centered content, large display heading, subhead, CTA stack
7. **Social proof bar** — dark background (or brand color), rating + review count + years displayed inline
8. **Section defaults** — generous vertical padding (100px desktop), container max-width
9. **USP columns** — 3-col grid, icon + heading + text
10. **Services grid** — 3-col cards with icon, name, description
11. **About split** — 50/50 image + text
12. **Reviews** — 3-col grid, large quote text, reviewer name (always visible in bold), star row, avatar circle (brand color bg with initial letter)
13. **Steps** — horizontal 3-col, numbered circles in brand color
14. **Service areas** — tag cloud with pill elements
15. **FAQ** — accordion, clean border-bottom rows
16. **Quote form** — 2-col grid, full-width on mobile, submit button full-width brand color
17. **Footer** — dark background
18. **Chat widget** — floating button bottom-right, panel with header/body/input
19. **Scroll progress bar** — fixed top line
20. **Animations** — `.animate-in` base (opacity 0, translateY 24px), `.visible` (opacity 1, translateY 0)

**Mobile-first breakpoints:**
```css
/* Mobile base styles — no @media needed, default IS mobile */

/* Tablet */
@media (min-width: 768px) {
  /* hero: side-by-side, services: 2-col, steps: horizontal, etc. */
}

/* Desktop */
@media (min-width: 1024px) {
  /* services: 3-col, full padding, larger typography */
}
```

**Key mobile rules (must be explicit):**
```css
/* Mobile: nav */
.nav-cta { display: none; }  /* no duplicate CTA button */
.nav-hamburger { display: flex; }
.nav-links { display: none; }
.nav-links.open { display: flex; flex-direction: column; }
.nav-logo img { max-height: 36px; width: auto; object-fit: contain; }

/* Mobile: rooms/coverage grid */
.rooms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

/* Mobile: steps */
.steps { flex-direction: column; gap: 24px; }
.step { padding: 20px; }

/* Mobile: reviews — name always visible */
.review-author { display: block; font-weight: 600; margin-top: 12px; }

/* Mobile: form */
.form-grid { grid-template-columns: 1fr; }
.form-group.span2 { grid-column: 1; }

/* Tablet overrides */
@media (min-width: 768px) {
  .nav-cta { display: none; } /* still hidden on tablet */
  .nav-hamburger { display: none; }
  .nav-links { display: flex; }
  .nav-logo img { max-height: 44px; }
}

/* Desktop overrides */
@media (min-width: 1024px) {
  .nav-cta { display: flex; } /* CTA only on desktop */
  .nav-logo img { max-height: 52px; }
  .form-grid { grid-template-columns: 1fr 1fr; }
  .form-group.span2 { grid-column: 1 / -1; }
}
```

**Step 2: Commit**
```bash
git add templates/housekeeping-v4/styles.css
git commit -m "feat: add housekeeping-v4 styles — mobile-first, 3-breakpoint, brand-adaptive"
```

---

### Task 5: Build index.html

**Files:**
- Create: `templates/housekeeping-v4/index.html`

**Step 1: Write the HTML** with these 12 sections:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ business_name }} — Professional House Cleaning in {{ city }}, {{ state }}</title>
  <meta name="description" content="{{ tagline }} Serving {{ city }}, {{ state }}. Call {{ phone }}.">
  <!-- Open Graph -->
  <meta property="og:title" content="{{ business_name }} — House Cleaning in {{ city }}, {{ state }}">
  <meta property="og:description" content="{{ tagline }}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  {% if brand_css_vars %}<style>:root { {{ brand_css_vars | safe }} }</style>{% endif %}
  <!-- Schema.org LocalBusiness JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "HouseCleaning",
    "name": "{{ business_name }}",
    "telephone": "{{ phone }}",
    {% if address %}"address": { "@type": "PostalAddress", "streetAddress": "{{ address }}", "addressLocality": "{{ city }}", "addressRegion": "{{ state }}" },{% endif %}
    "areaServed": "{{ city }}, {{ state }}",
    {% if rating and review_count > 0 %}
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "{{ rating }}", "reviewCount": "{{ review_count }}" },
    {% endif %}
    "url": "{{ website_url | default('') }}"
  }
  </script>
</head>
<body data-business-id="{{ business_id }}">
<div id="scroll-progress"></div>

<!-- Demo Banner -->
<div class="demo-banner">
  ✦ Demo site for {{ business_name }} by Trade Ease{% if website_url %} — <a href="{{ website_url }}" target="_blank" rel="noopener">View current site →</a>{% endif %}
</div>

<!-- Nav -->
<nav class="nav" id="main-nav">
  <div class="nav-inner">
    <a href="#" class="nav-logo">
      {% if logo_url %}<img src="{{ logo_url }}" alt="{{ business_name }} logo" onerror="this.style.display='none'">{% endif %}
      <span class="nav-brand-name">{{ business_name }}</span>
    </a>
    <div class="nav-links" id="nav-links">
      <a href="#services" class="nav-link">Services</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#reviews" class="nav-link">Reviews</a>
      <a href="#contact" class="nav-link">Contact</a>
    </div>
    <a href="#contact" class="nav-cta btn btn-primary">Get a Free Quote</a>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- Hero -->
<section class="hero" {% if hero_photo_url %}style="--hero-photo: url('{{ hero_photo_url }}')"{% endif %}>
  <div class="hero-overlay"></div>
  <div class="hero-content">
    {% if rating and review_count > 0 %}
    <div class="hero-stars">★★★★★ <strong>{{ rating }}</strong> · {{ review_count }} reviews</div>
    {% endif %}
    {% if logo_url %}
    <img src="{{ logo_url }}" alt="{{ business_name }}" class="hero-logo" onerror="this.style.display='none'">
    {% endif %}
    <h1>{{ city }}'s Most<br><em>Trusted</em> Cleaning</h1>
    <p class="hero-sub">{{ tagline }}</p>
    <div class="hero-actions">
      <a href="#contact" class="btn btn-primary btn-lg">Get a Free Quote →</a>
      <a href="tel:{{ phone }}" class="btn btn-ghost btn-lg">{{ phone }}</a>
    </div>
    <div class="hero-trust-row">
      <span>✓ Fully Insured</span>
      <span>✓ Background Checked</span>
      <span>✓ Satisfaction Guaranteed</span>
    </div>
  </div>
</section>

<!-- Social Proof Bar -->
<div class="proof-bar">
  <div class="proof-inner">
    {% if rating and review_count > 0 %}
    <div class="proof-item"><strong>{{ rating }} ★</strong> on Google</div>
    <div class="proof-divider"></div>
    <div class="proof-item"><strong>{{ review_count }}+</strong> Happy Clients</div>
    <div class="proof-divider"></div>
    {% endif %}
    {% if years_in_business %}
    <div class="proof-item"><strong>{{ years_in_business }}+</strong> Years Serving {{ city }}</div>
    <div class="proof-divider"></div>
    {% endif %}
    <div class="proof-item">✓ Fully Bonded &amp; Insured</div>
    <div class="proof-divider"></div>
    <div class="proof-item">✓ Eco-Friendly Products</div>
  </div>
</div>

<!-- Services -->
<section class="section" id="services">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">What We Offer</span>
      <h2>Professional Cleaning Services</h2>
      <p class="section-sub">Every clean performed by trained, background-checked professionals.</p>
    </div>
    <div class="services-grid">
      {% for svc in services_enhanced %}
      <div class="service-card animate-in">
        <div class="service-icon">{{ svc.icon | default("🧹") }}</div>
        <h3>{{ svc.name }}</h3>
        <p>{{ svc.description }}</p>
      </div>
      {% endfor %}
    </div>
  </div>
</section>

<!-- What We Clean -->
<section class="section section-alt">
  <div class="container">
    <div class="about-split">
      <div class="about-split-text">
        <span class="eyebrow">Room by Room</span>
        <h2>Every Corner, Every Time</h2>
        <p>Nothing is overlooked, nothing is rushed. Every room gets the full treatment.</p>
        <div class="rooms-grid">
          <span class="room-pill">Kitchen</span>
          <span class="room-pill">Bathrooms</span>
          <span class="room-pill">Bedrooms</span>
          <span class="room-pill">Living Room</span>
          <span class="room-pill">Windows &amp; Sills</span>
          <span class="room-pill">Laundry Room</span>
          <span class="room-pill">Entryways</span>
          <span class="room-pill">Common Areas</span>
        </div>
      </div>
      {% if hero_photo_url %}
      <div class="about-split-img">
        <img src="{{ hero_photo_url }}" alt="Clean home interior" loading="lazy">
      </div>
      {% endif %}
    </div>
  </div>
</section>

<!-- About -->
<section class="section" id="about">
  <div class="container">
    <div class="about-split">
      <div class="about-split-img">
        {% if about_photo_url %}
        <img src="{{ about_photo_url }}" alt="{{ business_name }} team" loading="lazy">
        {% else %}
        <div class="about-img-placeholder">🧹</div>
        {% endif %}
      </div>
      <div class="about-split-text">
        <span class="eyebrow">About Us</span>
        <h2>{{ business_name }}</h2>
        <p class="about-quote">{{ trust_statement }}</p>
        <p>{{ about_text }}</p>
        <div class="pill-row">
          <span class="pill">Fully Bonded &amp; Insured</span>
          <span class="pill">Background Checked</span>
          <span class="pill">Satisfaction Guarantee</span>
          {% if years_in_business %}<span class="pill">{{ years_in_business }}+ Years</span>{% endif %}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Reviews -->
<section class="section section-alt" id="reviews">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">What Clients Say</span>
      <h2>Loved Across {{ city }}</h2>
    </div>
    {% if rating and review_count > 0 %}
    <div class="reviews-summary">
      <div class="reviews-big-num">{{ rating }}</div>
      <div>
        <div class="reviews-stars">★★★★★</div>
        <div class="reviews-meta">{{ review_count }} Google Reviews</div>
      </div>
      <p class="reviews-note">Real reviews from Google will appear on your live site.</p>
    </div>
    {% endif %}
    <div class="reviews-grid">
      <div class="review-card animate-in">
        <div class="review-avatar">S</div>
        <div class="review-stars">★★★★★</div>
        <p class="review-text">"The most thorough cleaning I've ever had. My house genuinely sparkles — I'll be booking every month."</p>
        <div class="review-author"><strong>Sarah M.</strong> · {{ city }}, {{ state }}</div>
      </div>
      <div class="review-card animate-in">
        <div class="review-avatar">J</div>
        <div class="review-stars">★★★★★</div>
        <p class="review-text">"Reliable, professional, and genuinely wonderful. They show up on time and always go above and beyond."</p>
        <div class="review-author"><strong>James T.</strong> · {{ city }}, {{ state }}</div>
      </div>
      <div class="review-card animate-in">
        <div class="review-avatar">L</div>
        <div class="review-stars">★★★★★</div>
        <p class="review-text">"Booked for a move-out clean and got my full deposit back. The best in {{ city }}."</p>
        <div class="review-author"><strong>Linda K.</strong> · {{ city }}, {{ state }}</div>
      </div>
    </div>
  </div>
</section>

<!-- How It Works -->
<section class="section">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">Simple Process</span>
      <h2>From Quote to Clean in 3 Steps</h2>
    </div>
    <div class="steps">
      <div class="step animate-in">
        <div class="step-num">1</div>
        <h3>Get a Free Quote</h3>
        <p>Fill out our quick form or call us. You'll hear back within hours with a clear, no-pressure quote.</p>
      </div>
      <div class="step animate-in">
        <div class="step-num">2</div>
        <h3>We Show Up Ready</h3>
        <p>Our team arrives on time, fully equipped. You don't lift a finger — we handle everything.</p>
      </div>
      <div class="step animate-in">
        <div class="step-num">3</div>
        <h3>Walk In to Spotless</h3>
        <p>Come home to a deeply clean space. Not satisfied? We come back and make it right — free.</p>
      </div>
    </div>
  </div>
</section>

<!-- Service Areas -->
{% if service_areas and service_areas | length > 1 %}
<section class="section section-alt" id="area">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">Where We Work</span>
      <h2>Serving {{ city }} &amp; Surrounding Areas</h2>
      {% if service_area_text %}<p class="section-sub">{{ service_area_text }}</p>{% endif %}
    </div>
    <div class="area-tags">
      {% for area in service_areas %}<span class="area-tag">{{ area }}</span>{% endfor %}
    </div>
  </div>
</section>
{% endif %}

<!-- FAQ -->
<section class="section">
  <div class="container">
    <div class="faq-wrap">
      <div class="section-header">
        <span class="eyebrow">FAQ</span>
        <h2>Common Questions</h2>
      </div>
      <div class="faq-list">
        {% for item in faq_items %}
        <div class="faq-item">
          <button class="faq-q">{{ item.question }}<span class="faq-icon">+</span></button>
          <div class="faq-a">{{ item.answer }}</div>
        </div>
        {% endfor %}
      </div>
    </div>
  </div>
</section>

<!-- Contact / Quote Form -->
<section class="section section-alt" id="contact">
  <div class="container">
    <div class="contact-wrap">
      <div class="section-header">
        <span class="eyebrow">Get Started</span>
        <h2>Request Your Free Quote</h2>
        <p class="section-sub">We'll respond within a few hours. No commitment, no pressure.</p>
      </div>
      <form id="quote-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Your Name</label>
            <input type="text" placeholder="Jane Smith" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" placeholder="jane@email.com" required>
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" placeholder="(555) 000-0000">
          </div>
          <div class="form-group">
            <label>Home Size</label>
            <select>
              <option value="">Select…</option>
              <option>Studio / 1 Bedroom</option>
              <option>2 Bedrooms</option>
              <option>3 Bedrooms</option>
              <option>4+ Bedrooms</option>
            </select>
          </div>
          <div class="form-group">
            <label>Service Needed</label>
            <select>
              <option value="">Select…</option>
              {% for svc in services_enhanced %}<option>{{ svc.name }}</option>{% endfor %}
              <option>Not sure — let's talk</option>
            </select>
          </div>
          <div class="form-group">
            <label>How Often?</label>
            <select>
              <option value="">Select…</option>
              <option>One-time clean</option>
              <option>Weekly</option>
              <option>Bi-weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div class="form-group span2">
            <label>Message (optional)</label>
            <textarea placeholder="Tell us about your home, special requests, or questions…"></textarea>
          </div>
          <div class="form-group span2">
            <button type="submit" class="btn btn-primary btn-full">Send My Request →</button>
            <p class="form-note">Typically responds within 2 hours. No spam, ever.</p>
          </div>
        </div>
      </form>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">{{ business_name }}</div>
    <a href="tel:{{ phone }}" class="footer-phone">{{ phone }}</a>
    {% if address %}<div class="footer-address">{{ address }}</div>{% endif %}
    <div class="footer-address">{{ city }}, {{ state }}</div>
    <div class="footer-copy">© {{ business_name }}. Demo created by <a href="https://tradeeasehq.com">Trade Ease</a>. Not the live website.</div>
  </div>
</footer>

<!-- Chat Widget -->
<button class="chat-btn" id="chat-btn">Chat With Us</button>
<div class="chat-panel" id="chat-panel">
  <div class="chat-header">
    <span>{{ business_name }}</span>
    <button class="chat-close" id="chat-close">✕</button>
  </div>
  <div class="chat-body" id="chat-body">
    <div class="chat-note">Virtual Assistant — live feature preview</div>
    <div class="chat-bubble bot">Hi! I'm the virtual assistant for {{ business_name }}. How can I help you today?</div>
  </div>
  <div class="chat-footer">
    <input type="text" id="chat-input" placeholder="Ask me anything…" autocomplete="off">
    <button class="chat-send" id="chat-send">→</button>
  </div>
</div>

<link rel="stylesheet" href="styles.css">
<script src="script.js"></script>
<script>
  // Dynamic nav top based on banner height
  function updateNavTop() {
    var banner = document.querySelector('.demo-banner');
    var nav = document.getElementById('main-nav');
    if (banner && nav) nav.style.top = banner.offsetHeight + 'px';
  }
  updateNavTop();
  window.addEventListener('resize', updateNavTop);
</script>
</body>
</html>
```

**Step 2: Commit**
```bash
git add templates/housekeeping-v4/index.html
git commit -m "feat: add housekeeping-v4 index.html — 12-section premium layout with SEO, brand-adaptive"
```

---

### Task 6: Build script.js

**Files:**
- Create: `templates/housekeeping-v4/script.js`

**Step 1: Write script.js** — same modules as v2 but updated for v4 class names, plus live chat API call:

```javascript
// FAQ Accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// Scroll Progress Bar
const progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  if (progressBar) progressBar.style.width = pct + '%';
});

// Hamburger Menu
const hamburger = document.getElementById('nav-hamburger');
const navLinks = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// Animate on scroll
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));

// Chat Widget
const chatBtn = document.getElementById('chat-btn');
const chatPanel = document.getElementById('chat-panel');
const chatClose = document.getElementById('chat-close');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatBody = document.getElementById('chat-body');
const businessId = document.body.dataset.businessId || '';

if (chatBtn) chatBtn.addEventListener('click', () => chatPanel.classList.add('open'));
if (chatClose) chatClose.addEventListener('click', () => chatPanel.classList.remove('open'));

const chatHistory = [];

async function sendMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = '';

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = msg;
  chatBody.appendChild(userBubble);
  chatBody.scrollTop = chatBody.scrollHeight;
  chatHistory.push({ role: 'user', content: msg });

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'chat-bubble bot typing';
  typing.textContent = '…';
  chatBody.appendChild(typing);
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, message: msg, history: chatHistory.slice(-6) }),
    });
    const data = await res.json();
    typing.remove();

    const botBubble = document.createElement('div');
    botBubble.className = 'chat-bubble bot';
    botBubble.textContent = data.reply || "I'm not sure about that — please give us a call!";
    chatBody.appendChild(botBubble);
    chatHistory.push({ role: 'assistant', content: botBubble.textContent });
    chatBody.scrollTop = chatBody.scrollHeight;
  } catch {
    typing.remove();
    const errBubble = document.createElement('div');
    errBubble.className = 'chat-bubble bot';
    errBubble.textContent = "Sorry, something went wrong. Please call us directly!";
    chatBody.appendChild(errBubble);
  }
}

if (chatSend) chatSend.addEventListener('click', sendMessage);
if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

// Quote form submit (demo — no actual submission)
const form = document.getElementById('quote-form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.textContent = '✓ Request Received!';
    btn.disabled = true;
  });
}
```

**Step 2: Commit**
```bash
git add templates/housekeeping-v4/script.js
git commit -m "feat: add housekeeping-v4 script.js — FAQ, chat API call, hamburger, animations"
```

---

### Task 7: Update photos.py with Unsplash API fallback

**Files:**
- Modify: `pipeline/generation/photos.py`

**Step 1: Add Unsplash Source URL builder** — Unsplash Source (source.unsplash.com) requires no API key and supports keyword search:

```python
def get_unsplash_photo(query: str, width: int = 1400, height: int = 900, seed: str = "") -> str:
    """
    Build an Unsplash Source URL for a keyword search.
    Free, no API key required. Deterministic with seed.
    Example: https://source.unsplash.com/featured/1400x900?clean+home+interior&sig=abc
    """
    import urllib.parse
    encoded = urllib.parse.quote_plus(query)
    return f"https://source.unsplash.com/featured/{width}x{height}?{encoded}&sig={seed}"
```

**Step 2: Update `get_demo_photos`** — if business has no acceptable photo from Google, use Unsplash:

```python
NICHE_HERO_QUERIES = {
    "housekeeping": "clean modern home interior bright",
    "landscaping": "beautiful garden lawn landscaping",
    "plumbing": "modern bathroom renovation clean",
}

NICHE_ABOUT_QUERIES = {
    "housekeeping": "professional cleaning service team",
    "landscaping": "landscaper garden professional",
    "plumbing": "professional plumber at work",
}

def get_demo_photos(seed: str | None = None, niche: str = "housekeeping",
                    provided_hero: str | None = None, provided_about: str | None = None) -> dict:
    rng = random.Random(seed)

    # Use provided photos if available (from Google Places etc.)
    if provided_hero:
        hero = provided_hero
    else:
        # Try curated library first, fall back to Unsplash search
        if niche == "housekeeping" and HERO_PHOTOS:
            hero = rng.choice(HERO_PHOTOS)
        else:
            query = NICHE_HERO_QUERIES.get(niche, "clean home interior professional")
            hero = get_unsplash_photo(query, 1400, 900, seed or "")

    if provided_about:
        about = provided_about
    else:
        if niche == "housekeeping" and ABOUT_PHOTOS:
            about = rng.choice(ABOUT_PHOTOS)
        else:
            query = NICHE_ABOUT_QUERIES.get(niche, "professional service team")
            about = get_unsplash_photo(query, 800, 1000, (seed or "") + "_about")

    return {"hero_photo_url": hero, "about_photo_url": about}
```

**Step 3: Commit**
```bash
git add pipeline/generation/photos.py
git commit -m "feat: add Unsplash Source fallback to photos.py, niche-aware queries"
```

---

### Task 8: Test v4 render

**Step 1: Run demo generation for one Austin business**
```bash
cd /Users/benwitt/LeadScraper_V1
python -c "
from pipeline.generation.template_engine import render
from pipeline.generation.photos import get_demo_photos
import json

photos = get_demo_photos(seed='test-123')
data = {
    'business_name': 'Austin Sparkle Co',
    'phone': '(512) 555-0123',
    'city': 'Austin',
    'state': 'TX',
    'tagline': 'Professional cleaning you can count on.',
    'about_text': 'We have been serving Austin families for years.',
    'trust_statement': 'Your home is safe with us.',
    'services_enhanced': [{'name': 'Standard Clean', 'description': 'Full home clean.', 'icon': '🧹'}],
    'faq_items': [{'question': 'Are you insured?', 'answer': 'Yes, fully bonded and insured.'}],
    'service_areas': ['Austin', 'Round Rock', 'Cedar Park'],
    'rating': 4.9,
    'review_count': 87,
    'years_in_business': 8,
    'brand_css_vars': '--brand: #2563eb; --brand-dark: #1d4ed8;',
    'business_id': 'test-123',
    **photos,
}
html = render('housekeeping-v4', data)
open('/tmp/v4_test.html', 'w').write(html)
print(f'OK — {len(html):,} chars')
"
```

**Step 2: Open in browser and inspect at 3 breakpoints**
```bash
open /tmp/v4_test.html
```
Check: logo not cropped, hero full-bleed, review names visible, no duplicate CTA on mobile, steps stack vertically on mobile, rooms grid is 2-col on mobile.

**Step 3: Check SEO tags in source**
```bash
grep -A5 'application/ld+json' /tmp/v4_test.html
grep 'meta name="description"' /tmp/v4_test.html
```
Expected: JSON-LD block with business data, meta description populated.

**Step 4: Commit if clean**
```bash
git commit -m "test: verify v4 template renders correctly" --allow-empty
```

---

## Phase 1b — Lead Qualification

### Task 8b: Add lead_quality_score to scorer

**Files:**
- Modify: `pipeline/analysis/scorer.py`
- Modify: `pipeline/run_campaign.py`

**Step 1: Add `compute_lead_quality` function to scorer.py**

```python
FRANCHISE_SIGNALS = [
    "molly maid", "merry maids", "two maids", "the maids", "maid brigade",
    "jan-pro", "servicemaster", "coverall", "anago", "jani-king",
]

def compute_lead_quality(business: dict, analysis: dict) -> dict:
    """
    Score a business's value as an outreach target (0–100).
    Returns dict with score, disqualified flag, and reasons.
    """
    name = (business.get("name") or "").lower()
    review_count = business.get("review_count") or 0
    phone = business.get("phone") or ""
    years = (business.get("extracted_content") or {}).get("years_in_business") or 0
    website_url = business.get("website_url") or ""
    pagespeed = analysis.get("pagespeed_score") or 100
    total_score = analysis.get("total_score") or 0
    raw = analysis.get("raw_scores_json") or {}
    seo = raw.get("seo_gaps") or {}

    # Hard disqualifiers
    disqualified = False
    disqualify_reason = ""

    if not phone:
        disqualified = True
        disqualify_reason = "no phone number"
    elif any(sig in name for sig in FRANCHISE_SIGNALS):
        disqualified = True
        disqualify_reason = "franchise/chain business"

    if disqualified:
        return {"score": 0, "disqualified": True, "reason": disqualify_reason, "pitch_tier": None}

    # Soft signals — adjust score, don't disqualify
    pitch_tier = "standard"  # vs "feature_only" for 75+ sites

    if total_score >= 75:
        pitch_tier = "feature_only"  # two-offer pitch: full upgrade OR feature add-on
        # No score penalty — still a legitimate, valid prospect

    if disqualified:
        return {"score": 0, "disqualified": True, "reason": disqualify_reason}

    # Quality scoring
    score = 50  # baseline

    if review_count < 3:
        score -= 20  # deprioritize, not disqualify — could still be a real quality business
    elif 10 <= review_count <= 50:
        score += 15
    elif review_count > 50:
        score += 8
    elif review_count >= 3:
        score += 5

    if website_url:
        score += 10  # has a site, already web-invested

    if 2 <= years <= 10:
        score += 10
    elif years > 10:
        score += 5

    if pagespeed < 50:
        score += 10  # clear technical gap we can fix
    elif pagespeed < 70:
        score += 5

    if not seo.get("schema_org"):
        score += 5
    if not seo.get("meta_description"):
        score += 5

    return {
        "score": min(max(score, 0), 100),
        "disqualified": False,
        "reason": "",
        "pitch_tier": pitch_tier,  # "standard" or "feature_only"
    }
```

**Step 2: Wire into run_campaign.py demo step** — after analysis is stored, call `compute_lead_quality`. Skip demo generation if disqualified or score < 40. Store `pitch_tier` so the email drafter uses the right angle ("your site needs improvement" vs "your site is solid but missing these features"):

```python
from pipeline.analysis.scorer import compute_lead_quality

# After analysis step, before demo generation:
lq = compute_lead_quality(business, analysis)
# Store in raw_scores_json
raw = analysis.get("raw_scores_json") or {}
raw["lead_quality"] = lq
db.update_analysis_seo(business_id, raw)  # reuse existing helper

if lq["disqualified"] or lq["score"] < 40:
    logger.info(f"[qualify] Skipping {business['name']}: {lq['reason'] or 'low quality score'}")
    continue
```

**Step 3: Commit**
```bash
git add pipeline/analysis/scorer.py pipeline/run_campaign.py
git commit -m "feat: add lead quality scoring — hard filters + quality signals to skip low-value targets"
```

---

## Phase 2 — SEO Pipeline

### Task 9: Add SEO gap checker

**Files:**
- Create: `pipeline/analysis/seo_checker.py`
- Modify: `pipeline/analysis/playwright_runner.py` or `pipeline/run_campaign.py` (to call it)

**Step 1: Write seo_checker.py**

```python
"""
Lightweight SEO gap analysis on a client's site HTML.
No external API — pure HTML parsing.
Results stored in website_analyses.raw_scores_json under key 'seo_gaps'.
"""
from __future__ import annotations
import re
from typing import Any


SEO_CHECKS = [
    ("meta_description", "Meta description"),
    ("schema_org",       "Schema.org markup"),
    ("open_graph",       "Open Graph tags"),
    ("viewport_meta",    "Mobile viewport tag"),
    ("h1_exists",        "Page heading (H1)"),
]


def check_seo_gaps(html: str, pagespeed_score: int | None = None) -> dict[str, Any]:
    """
    Analyse raw HTML for common SEO gaps.
    Returns dict with boolean results and a summary list.
    """
    h = html.lower()

    results = {
        "meta_description": bool(re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'][^"\']{10,}', h)),
        "schema_org":       "application/ld+json" in h or 'itemtype' in h,
        "open_graph":       'property="og:' in h or "property='og:" in h,
        "viewport_meta":    'name="viewport"' in h or "name='viewport'" in h,
        "h1_exists":        bool(re.search(r'<h1[\s>]', h)),
    }

    if pagespeed_score is not None:
        results["pagespeed_mobile"] = pagespeed_score

    gaps = [label for key, label in SEO_CHECKS if not results.get(key, False)]
    results["gaps"] = gaps          # list of human-readable missing items
    results["score"] = len(SEO_CHECKS) - len(gaps)  # out of 5
    return results
```

**Step 2: Wire into the analysis step** — in `pipeline/run_campaign.py`, after storing `website_analyses`, call `check_seo_gaps` and merge results into `raw_scores_json`:

Find the section in `run_campaign.py` where `website_analyses` is inserted. After the insert, add:
```python
from pipeline.analysis.seo_checker import check_seo_gaps
# ...
seo_data = check_seo_gaps(page_html or "", pagespeed_score)
# Merge into raw_scores_json
raw_scores = analysis.get("raw_scores_json") or {}
raw_scores["seo_gaps"] = seo_data
db.update_analysis_seo(business_id, raw_scores)  # add this helper to db/client.py
```

Add to `pipeline/db/client.py`:
```python
def update_analysis_seo(self, business_id: str, raw_scores_json: dict) -> None:
    self.client.table("website_analyses")\
        .update({"raw_scores_json": raw_scores_json})\
        .eq("business_id", business_id)\
        .execute()
```

**Step 3: Commit**
```bash
git add pipeline/analysis/seo_checker.py pipeline/db/client.py pipeline/run_campaign.py
git commit -m "feat: add SEO gap checker to analysis pipeline, store in raw_scores_json"
```

---

### Task 10: Update comparison page with SEO checklist

**Files:**
- Modify: `pipeline/outreach/comparison_builder.py`

**Step 1: Read the current build_comparison function** to understand where to add the SEO section.

**Step 2: Add SEO checklist HTML block** — insert after the screenshots comparison grid, before the footer CTA. The `analysis` dict passed to `build_comparison` now contains `raw_scores_json.seo_gaps`:

```python
def _seo_checklist_html(analysis: dict, esc) -> str:
    raw = analysis.get("raw_scores_json") or {}
    seo = raw.get("seo_gaps", {})
    if not seo:
        return ""

    checks = [
        ("meta_description", "Meta description"),
        ("schema_org",       "Schema.org markup"),
        ("open_graph",       "Open Graph tags"),
        ("viewport_meta",    "Mobile viewport"),
        ("h1_exists",        "Page heading (H1)"),
    ]

    their_score = seo.get("score", 0)
    our_score = len(checks)  # v4 has all of these
    pagespeed = seo.get("pagespeed_mobile")

    rows = ""
    for key, label in checks:
        has_it = seo.get(key, False)
        their_icon = "✓" if has_it else "✗"
        their_color = "#22c55e" if has_it else "#ef4444"
        rows += f"""
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">{esc(label)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:center;color:{their_color};font-weight:600;">{their_icon}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:center;color:#22c55e;font-weight:600;">✓</td>
        </tr>"""

    if pagespeed is not None:
        rows += f"""
        <tr>
          <td style="padding:10px 16px;">Google PageSpeed (mobile)</td>
          <td style="padding:10px 16px;text-align:center;color:{'#22c55e' if pagespeed >= 75 else '#ef4444'};font-weight:600;">{pagespeed}</td>
          <td style="padding:10px 16px;text-align:center;color:#22c55e;font-weight:600;">90+</td>
        </tr>"""

    return f"""
    <div style="margin:48px auto;max-width:700px;">
      <h3 style="text-align:center;font-size:22px;margin-bottom:8px;">SEO &amp; Technical Checklist</h3>
      <p style="text-align:center;color:#666;margin-bottom:24px;">Their site: <strong>{their_score}/{len(checks)}</strong> basics · Your new site: <strong>{our_score}/{len(checks)}</strong></p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:12px 16px;text-align:left;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#666;">Item</th>
            <th style="padding:12px 16px;text-align:center;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#666;">Current Site</th>
            <th style="padding:12px 16px;text-align:center;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#666;">Your New Site</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>"""
```

Call `_seo_checklist_html(analysis, _esc)` in the main HTML generation and insert before the footer CTA.

**Step 3: Commit**
```bash
git add pipeline/outreach/comparison_builder.py
git commit -m "feat: add SEO checklist to comparison page"
```

---

## Phase 3 — Live AI Chat Backend

### Task 11: Add /api/chat route

**Files:**
- Create: `dashboard/app/api/chat/route.ts`

**Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { business_id, message, history = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    // Fetch business config from client_sites (live clients) or businesses table (demos)
    let config: Record<string, string> = {};
    if (business_id) {
      const { data: clientSite } = await supabase
        .from("client_sites")
        .select("ai_agent_config")
        .eq("business_id", business_id)
        .single();

      if (clientSite?.ai_agent_config) {
        config = clientSite.ai_agent_config;
      } else {
        // Fall back to businesses table for demo context
        const { data: biz } = await supabase
          .from("businesses")
          .select("name, phone, city, state, extracted_content")
          .eq("id", business_id)
          .single();
        if (biz) {
          config = {
            business_name: biz.name,
            phone: biz.phone,
            city: biz.city,
            state: biz.state,
            services: biz.extracted_content?.services?.join(", ") || "professional cleaning services",
            service_areas: biz.city,
            hours: "Monday–Saturday, 8am–6pm",
            pricing_range: "Call for a free quote",
          };
        }
      }
    }

    const systemPrompt = `You are a friendly virtual assistant for ${config.business_name || "this cleaning business"}, a professional cleaning service in ${config.city || "the local area"}, ${config.state || ""}.

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
- Escalation phrase: if the user says "${config.escalation_trigger || "speak to someone"}", respond: "Of course! Give us a call at ${config.phone || "our number"} and we'll be happy to help."`;

    const messages = [
      ...history.slice(-6).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json(
      { reply: "I'm having trouble right now — please call us directly!" },
      { status: 200 } // Return 200 so the widget doesn't show an error
    );
  }
}
```

**Step 2: Add rate limiting using Upstash Redis** — install `@upstash/ratelimit` and `@upstash/redis` (both free tier on Vercel). Add to the top of the route handler:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 messages per 60s per IP
});

// Inside POST handler, before calling Anthropic:
const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
const { success } = await ratelimit.limit(ip);
if (!success) {
  return NextResponse.json({ reply: "Too many messages — please slow down!" }, { status: 429 });
}

// Message length cap
if (message.length > 500) {
  return NextResponse.json({ reply: "Message too long." }, { status: 400 });
}

// Honeypot check — if client sends { _hp: "anything" }, it's a bot
const { _hp } = await req.json(); // read alongside message
if (_hp) return new NextResponse(null, { status: 200 }); // silent drop
```

Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars (from Upstash dashboard, free tier).

In `index.html` chat form area, add hidden honeypot field (not visible to users, sent by script):
```javascript
// In sendMessage(), add to fetch body:
body: JSON.stringify({ business_id, message, history: chatHistory.slice(-6), _hp: "" })
// Real users send _hp: "" — bots fill it in
```

**Step 3: Add ANTHROPIC_API_KEY to Vercel env vars** (if not already set).

**Step 4: Test locally**
```bash
cd dashboard
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"business_id": "", "message": "Do you clean apartments?", "history": []}'
```
Expected: JSON with `{ "reply": "..." }` — a relevant response about apartment cleaning.

**Step 4: Commit**
```bash
git add dashboard/app/api/chat/route.ts
git commit -m "feat: add live AI chat API route using Claude Haiku"
```

---

### Task 12: Verify chat widget connects from demo site

**Step 1:** The v4 script.js already calls `/api/chat` with `business_id` from `data-business-id` on `<body>`. The template already injects `business_id` into that attribute.

**Step 2:** For demos hosted on Supabase Storage, the API call to `/api/chat` won't work because the HTML is served from storage.supabase.co, not the Next.js dashboard. Fix: inject the dashboard base URL into the template as a variable.

Modify `templates/housekeeping-v4/script.js` chat fetch call:
```javascript
const CHAT_API = document.body.dataset.chatApi || '/api/chat';
// ...
const res = await fetch(CHAT_API, { ... });
```

Add `chat_api_url` field to `template_spec.json` (optional, fallback: `"/api/chat"`).

In `pipeline/generation/template_engine.py` or the calling code (content_upgrader/run_campaign), inject:
```python
data["chat_api_url"] = f"{os.getenv('DASHBOARD_URL', '')}/api/chat"
```

Add `DASHBOARD_URL=https://your-dashboard.vercel.app` to `.env` and Vercel env vars.

In `index.html` `<body>` tag:
```html
<body data-business-id="{{ business_id }}" data-chat-api="{{ chat_api_url }}">
```

**Step 3: Commit**
```bash
git add templates/housekeeping-v4/index.html templates/housekeeping-v4/script.js
git commit -m "feat: wire v4 chat widget to dashboard API via data-chat-api attribute"
```

---

## Phase 4 — Post-Sale Dashboard

### Task 13: Add client_sites schema columns if missing

**Files:**
- Modify: `pipeline/db/schema.sql`

**Step 1: Check current client_sites table** in `pipeline/db/schema.sql`. Confirm these columns exist; add any missing:

```sql
ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB,
  ADD COLUMN IF NOT EXISTS change_requests JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vercel_project_id TEXT,
  ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
```

Run this migration in Supabase SQL editor.

**Step 2: Commit schema update**
```bash
git add pipeline/db/schema.sql
git commit -m "feat: add onboarding_data, change_requests, vercel fields to client_sites"
```

---

### Task 14: Build /clients dashboard pages

**Files:**
- Create: `dashboard/app/clients/page.tsx`
- Create: `dashboard/app/clients/new/page.tsx`
- Create: `dashboard/app/clients/[id]/page.tsx`
- Modify: `dashboard/app/layout.tsx` — add "Clients" to navLinks

**Step 1: Update layout.tsx navLinks**

```typescript
const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/scores", label: "Scores" },
  { href: "/demos", label: "Demos" },
  { href: "/outreach", label: "Outreach" },
  { href: "/outreach/approved", label: "Send Queue" },
  { href: "/clients", label: "Clients" },  // ADD THIS
];
```

**Step 2: Write clients/page.tsx** — list of all client_sites with status badges, follow the pattern from `app/leads/page.tsx`:

```typescript
export const dynamic = "force-dynamic";
// Fetch from client_sites joined to businesses
// Table columns: Business Name, Domain, Plan, Status (badge), Monthly Fee, Go-Live Date, Actions
// Status badge colors: pending=yellow, live=green, suspended=red
```

**Step 3: Write clients/new/page.tsx** — form to create a new client record:
- Select business (dropdown from businesses where status='converted' or any)
- Enter domain (e.g. austincleanpro.com)
- Select plan (basic | pro | ai_agent)
- Enter monthly fee
- Link to Tally onboarding form (static URL, just displayed as a copyable link)
- On submit: POST to `/api/clients/new`

**Step 4: Write clients/[id]/page.tsx** — client detail page:
- Business name, domain, plan, status
- Current site preview iframe (using `vercel_deployment_url` if live)
- Onboarding data display (from `onboarding_data` JSON)
- Chat config editor (form for `ai_agent_config` fields: services, hours, pricing_range, service_areas, escalation_trigger, phone)
- Change request log (from `change_requests` JSON array)
- **"Finalize & Deploy"** button (calls `/api/clients/[id]/deploy`)
- **"Redeploy"** button (calls same endpoint)

**Step 5: Commit**
```bash
git add dashboard/app/clients/ dashboard/app/layout.tsx
git commit -m "feat: add clients dashboard pages — list, new, detail with deploy button"
```

---

### Task 15: Build Vercel deploy API route

**Files:**
- Create: `dashboard/app/api/clients/[id]/deploy/route.ts`
- Create: `dashboard/app/api/clients/new/route.ts`

**Step 1: Write the deploy route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN!;
const VERCEL_TEAM = process.env.VERCEL_TEAM_ID; // optional

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Fetch client site + business
  const { data: clientSite, error } = await supabase
    .from("client_sites")
    .select("*, businesses(name, id)")
    .eq("id", id)
    .single();

  if (error || !clientSite) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // 2. Fetch the generated HTML for this business's demo
  const { data: demoSite } = await supabase
    .from("demo_sites")
    .select("generated_html, storage_path")
    .eq("business_id", clientSite.business_id)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!demoSite?.generated_html) {
    return NextResponse.json({ error: "No generated demo HTML found" }, { status: 400 });
  }

  const projectName = `tradeease-${clientSite.businesses.name
    .toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40)}`;

  // 3. Create or update Vercel deployment
  const teamQuery = VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : "";

  const deployRes = await fetch(`https://api.vercel.com/v13/deployments${teamQuery}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      files: [
        {
          file: "index.html",
          data: Buffer.from(demoSite.generated_html).toString("base64"),
          encoding: "base64",
        },
      ],
      projectSettings: { framework: null },
    }),
  });

  if (!deployRes.ok) {
    const err = await deployRes.text();
    return NextResponse.json({ error: `Vercel deploy failed: ${err}` }, { status: 500 });
  }

  const deployment = await deployRes.json();
  const deploymentUrl = `https://${deployment.url}`;

  // 4. Attach custom domain if provided
  if (clientSite.domain) {
    const domainRes = await fetch(
      `https://api.vercel.com/v10/projects/${deployment.projectId}/domains${teamQuery}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: clientSite.domain }),
      }
    );
    // Domain attachment may fail if DNS not yet configured — that's OK, log it
    if (!domainRes.ok) {
      console.warn(`[deploy] Domain attachment pending for ${clientSite.domain} — DNS not yet configured`);
    }
  }

  // 5. Update client_sites record
  await supabase.from("client_sites").update({
    hosting_status: "live",
    vercel_project_id: deployment.projectId,
    vercel_deployment_url: deploymentUrl,
    live_at: new Date().toISOString(),
  }).eq("id", id);

  return NextResponse.json({
    ok: true,
    deployment_url: deploymentUrl,
    domain: clientSite.domain,
    dns_instructions: clientSite.domain ? `Add a CNAME record pointing ${clientSite.domain} to cname.vercel-dns.com` : null,
  });
}
```

**Step 2: Add VERCEL_API_TOKEN and VERCEL_TEAM_ID to .env and Vercel dashboard env vars.**

**Step 3: Commit**
```bash
git add dashboard/app/api/clients/
git commit -m "feat: add Vercel deploy API route for post-sale client site deployment"
```

---

## Phase 5 — Contract

### Task 16: Write service agreement template

**Files:**
- Create: `docs/contract/service-agreement-template.md`

**Step 1: Write the document** with these sections:

```markdown
# Website Services Agreement
**Trade Ease** ("Provider") and **[CLIENT BUSINESS NAME]** ("Client")
Date: ___________

## 1. Services Included
Monthly fee covers: (a) custom website hosted on Vercel with Client's domain,
(b) local SEO optimization, (c) AI virtual assistant widget, (d) quote request form,
(e) mobile-optimized design, (f) reasonable change requests (text, photos, services, hours).

## 2. Services Not Included
Paid advertising, social media management, review automation, booking integration,
and full redesigns outside the current template are not included and will be quoted separately.

## 3. Fees and Billing
Monthly fee: $______. Billed on the __ of each month. 30-day grace period on failed payment,
then site suspended (not deleted). Site reinstated immediately upon payment.

## 4. Intellectual Property
Provider owns all website code and design during the active relationship.
Client owns their domain name at all times — Provider never takes custody of registrar credentials.
Upon cancellation, Client receives a full HTML export of their site within 5 business days.

## 5. Cancellation
Either party may cancel with 30 days written notice (email accepted).
Last month's fee is non-refundable. Site remains live through the end of the paid period.

## 6. Change Requests
Covered under the monthly fee for reasonable updates (text, photos, hours, services).
Full redesigns, new pages, or custom development are scoped and quoted separately.
Target turnaround: same business day.

## 7. AI Virtual Assistant Disclosure
The chat widget on Client's site is powered by artificial intelligence.
Responses are generated automatically and may occasionally be inaccurate.
Client is responsible for ensuring the configured business information is correct.
Provider is not liable for any loss arising from AI chat responses.

## 8. Limitation of Liability
Provider is not liable for loss of business, revenue, or Google search rankings.
SEO optimization improves technical quality but does not guarantee specific ranking outcomes.
Maximum liability is limited to fees paid in the prior 30 days.

## 9. Governing Law
This agreement is governed by the laws of the State of Wyoming.

---
**Provider:** Trade Ease (Ben Witt)  Signature: ___________ Date: ___
**Client:** ___________________  Signature: ___________ Date: ___
```

**Step 2: Commit**
```bash
git add docs/contract/
git commit -m "docs: add service agreement template"
```

---

## Phase 6 — Regenerate Austin Demos

### Task 17: Reset and regenerate all Austin demos with v4

**Step 1: Reset demos**
```bash
python scripts/reset_demos.py --city "Austin" --state TX
```
Expected: prints number of demos deleted, outreach_drafts nulled.

**Step 2: Run demo generation with v4**

First, confirm `run_campaign.py` or the demo step selects `housekeeping-v4` as the default template. Check the template selection logic — it likely queries the `templates` table in Supabase for `niche=housekeeping, is_active=true`. If so:

Run in Supabase SQL editor:
```sql
-- Deactivate old templates
UPDATE templates SET is_active = false WHERE niche = 'housekeeping';
-- Insert v4 (or update if exists)
INSERT INTO templates (niche, name, template_path, is_active)
VALUES ('housekeeping', 'housekeeping-v4', 'housekeeping-v4', true)
ON CONFLICT (template_path) DO UPDATE SET is_active = true;
```

Then run:
```bash
python -m pipeline.run_campaign --city "Austin" --state TX --steps demo
```

**Step 3: Spot check 3 demos**
Open 3 demo URLs from Supabase Storage in browser. Check at mobile width:
- Hero full-bleed with brand color overlay ✓
- Logo properly sized ✓
- Review names visible ✓
- No duplicate CTA on mobile ✓
- Chat widget visible and sends messages ✓

**Step 4: Re-run outreach draft step for regenerated demos**
```bash
python -m pipeline.run_campaign --city "Austin" --state TX --steps outreach
```

**Step 5: Final commit**
```bash
git add .
git commit -m "feat: regenerate Austin demos with v4 template — launch ready"
```

---

## Verification Checklist

Run these checks before sending any outreach:

- [ ] Open 3 demo sites, resize to 375px — no layout breaks
- [ ] Open same demos at 768px (tablet) — no layout breaks
- [ ] View source of any demo — JSON-LD present, meta description populated
- [ ] Click chat widget — sends message, gets relevant response from Claude
- [ ] Open comparison page — SEO checklist table visible with their gaps
- [ ] Dashboard `/clients` page loads
- [ ] Create a test client record, click "Finalize & Deploy" — gets a Vercel URL back
- [ ] Service agreement PDF exists at `docs/contract/`
- [ ] CLAUDE.md exists at repo root and is accurate
- [ ] Memory files updated to reflect v4 as active template, AI chat as included feature, lead quality threshold of 40
- [ ] Lead quality filter tested: run scorer on a known franchise name (e.g. "Molly Maid Austin") — confirm it returns `disqualified: true`
- [ ] Spam protection tested: send 11 rapid chat messages from same IP — confirm 429 response on 11th
- [ ] DNS options documented in onboarding email template (`docs/onboarding/dns-instructions.md`)

