# LeadScraper V1 — Executable Build Plan
**Target: 2-week MVP. No slack. Everything needed to go live.**

---

## Tonight (Before Anything Else)

- [x] Buy domain on Porkbun (~$10) — purchased 'tradeeasehq.com'
- [x] Sign up for Google Workspace Business Starter ($8/mo) — use new domain
- [x] Add DNS records in Porkbun (Google gives you copy-paste values during Workspace setup):
  - [x] MX records (used new single smtp.google.com)
  - [x] SPF TXT record: `v=spf1 include:_spf.google.com include:amazonses.com ~all`
  - [x] DKIM TXT record (generate in Google Workspace Admin → Apps → Gmail → Authenticate email)
  - [x] DMARC TXT record: `v=DMARC1; p=none; rua=mailto:ben@[yourdomain].com`
- [x] Create Resend account → Settings → Domains → Add Domain → add their 3 DNS records → Verify
- [ ] Send 5 real emails to real people you know from your new inbox (day 1 of warm-up)

---

## Tomorrow Morning (Before Coding — ~1.5 hrs)

- [ ] **Form Wyoming LLC** via Northwest Registered Agent (northwestregisteredagent.com)
  - Cost: $39 service fee + $100 Wyoming state fee = ~$139 total
  - Wyoming has no state income tax, strong privacy, cheap annual fee ($60/year after year 1)
  - You don't need to live in Wyoming — it's a legal entity, not a location
  - Fill out: LLC name (e.g. "Trade Ease LLC"), registered agent (Northwest is your agent), your name as organizer
  - Takes ~5 minutes to file, approved in 1-3 business days
  - After approval: get your EIN from IRS.gov (free, takes 5 minutes online) — needed for Stripe
- [ ] **Get a contract template** via Bonsai (bonsai.io) or copy from AIGA standard form:
  - Key clauses to have: scope, payment terms, 30-day cancellation, IP ownership, liability cap, demo IP clause
  - Set up DocuSign or HelloSign (Dropbox Sign) for e-signatures — free tier is fine at low volume
  - You don't need to send this until your first client is ready to sign — just have it ready
- [ ] Update Stripe account with LLC name + EIN once LLC is approved (can do later this week)

---

## Pre-Requisites (Complete Before Day 1 of Coding)

- [x] Approve PRODUCT_SPEC.md
- [x] Domain bought + DNS configured (see Tonight section)
- [x] Create Supabase project (free tier at supabase.com)
- [x] Create Vercel account + link GitHub repo (need to add files to Repo)
- [x] Create Anthropic account → get API key (claude-sonnet-4-6 + claude-haiku-4-5 access)
- [x] Resend account + domain verified (see Tonight section)
- [x] Enable Google Cloud project → PageSpeed Insights API (free, no billing if under quota)
- [x] Enable Google Cloud project → Places API (for lead sourcing) — get API key
- [x] Install: Python 3.11+, Node.js 20+, `uv` (Python package manager)

---

## FILE STRUCTURE

```
LeadScraper_V1/
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── BUILD_PLAN.md
│   ├── AI_CHAT_AGENT.md
│   └── TEMPLATE_SPEC.md
├── pipeline/                   ← Python pipeline
│   ├── pyproject.toml
│   ├── .env.example
│   ├── config.py               ← Pydantic settings
│   ├── db/
│   │   ├── schema.sql
│   │   └── client.py           ← Supabase helpers
│   ├── ingestion/
│   │   ├── base.py             ← LeadSourceAdapter ABC
│   │   ├── google_places.py    ← Google Places API source
│   │   ├── self_scraper.py     ← Playwright Google Maps fallback
│   │   └── deduplication.py
│   ├── analysis/
│   │   ├── playwright_runner.py   ← Screenshots + HTML
│   │   ├── pagespeed.py           ← PSI API
│   │   ├── scorer.py              ← Claude vision scoring
│   │   ├── scoring_prompt.py      ← Rubric prompt (extracted for iteration)
│   │   └── content_extractor.py   ← Claude haiku content extraction
│   ├── generation/
│   │   ├── template_engine.py     ← Jinja2 renderer
│   │   ├── content_upgrader.py    ← Claude sonnet rewrites their copy
│   │   └── storage_deploy.py      ← Upload to Supabase Storage
│   ├── outreach/
│   │   ├── contact_extractor.py   ← Parse site/listing for emails
│   │   ├── email_drafter.py       ← Claude email generation
│   │   └── comparison_builder.py  ← Before/after HTML page
│   ├── delivery/
│   │   └── resend_sender.py       ← Email send (manual trigger only)
│   └── run_campaign.py            ← Main CLI orchestrator
├── dashboard/                  ← Next.js admin
│   ├── package.json
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            ← Home: counts + status summary
│   │   ├── campaigns/
│   │   │   └── page.tsx        ← Create + list campaigns
│   │   ├── leads/
│   │   │   ├── page.tsx        ← Lead table with filters
│   │   │   └── [id]/page.tsx   ← Business detail
│   │   ├── scores/
│   │   │   ├── page.tsx        ← Score table sortable by tier/score
│   │   │   └── [business_id]/page.tsx  ← Score breakdown + screenshots
│   │   ├── demos/
│   │   │   ├── page.tsx        ← Demo grid
│   │   │   └── [business_id]/page.tsx  ← Demo iframe + injection data
│   │   ├── outreach/
│   │   │   ├── page.tsx        ← Full queue with filters by status
│   │   │   ├── [draft_id]/page.tsx  ← Review: email + demo + approve
│   │   │   └── approved/page.tsx   ← Approved → Send Now triggers
│   │   └── api/
│   │       ├── campaigns/route.ts
│   │       ├── outreach/[id]/approve/route.ts
│   │       ├── outreach/[id]/send/route.ts
│   │       └── webhooks/resend/route.ts
│   ├── components/
│   │   ├── LeadTable.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── DemoPreview.tsx       ← Iframe with demo site
│   │   ├── EmailPreview.tsx      ← Rendered HTML email preview
│   │   ├── ComparisonViewer.tsx  ← Before/after side by side
│   │   └── ApprovalQueue.tsx
│   └── lib/
│       ├── supabase.ts           ← Server + browser clients
│       └── types.ts              ← Shared TypeScript types (match DB schema)
└── templates/
    └── housekeeping-v1/
        ├── index.html            ← Jinja2 template
        ├── styles.css
        ├── script.js
        └── template_spec.json
```

---

## WEEK 1: PIPELINE (Days 1-7)

### Day 1: Foundation

**Python project:**
- `pipeline/pyproject.toml` — deps:
  ```
  playwright, supabase, anthropic, jinja2, httpx, pydantic,
  pydantic-settings, pillow, python-dotenv, beautifulsoup4, lxml
  ```
- `pipeline/.env.example` — document ALL env vars (see bottom of this file)
- `pipeline/config.py` — Pydantic `Settings` from `.env`, with field for `LEAD_SOURCE` (`google_places` | `self_scrape`)

**Supabase schema:**
- `pipeline/db/schema.sql` — deploy full schema from PRODUCT_SPEC.md (add `extracted_content JSONB` to `businesses` table)
- `pipeline/db/client.py` — typed Supabase helpers:
  - `upsert_business(data)`, `update_business_status(id, status)`
  - `save_website_analysis(data)`, `save_demo_site(data)`, `save_outreach_draft(data)`
  - `get_businesses_for_analysis()` — returns businesses with status=new and a website_url
  - `get_businesses_for_demo()` — returns scored businesses with priority_tier != skip_remake
  - `get_businesses_for_outreach()` — returns businesses with demo generated
  - `get_drafts_pending_review()` — returns outreach_drafts with status=draft

**Next.js dashboard scaffold:**
- `dashboard/` — `npx create-next-app@14 --typescript --tailwind --app`
- `dashboard/lib/supabase.ts` — server + browser clients (use `@supabase/ssr`)
- `dashboard/app/layout.tsx` — sidebar nav: Dashboard | Leads | Scores | Demos | Outreach
- `dashboard/app/page.tsx` — stat cards: Total Leads, Scored, Demos Generated, Pending Approval, Sent
- Deploy to Vercel, connect Supabase env vars, verify login works

---

### Day 2: Lead Ingestion

**Adapter pattern — this is the modularity foundation:**

`pipeline/ingestion/base.py`:
```python
from abc import ABC, abstractmethod
from typing import List
from models import BusinessRaw  # Pydantic model

class LeadSourceAdapter(ABC):
    @abstractmethod
    def fetch(self, query: str, limit: int) -> List[BusinessRaw]:
        """Fetch raw business listings. Return standardized BusinessRaw objects."""
        pass
```

`pipeline/ingestion/google_places.py` — Implements `LeadSourceAdapter`:
- POST to `https://places.googleapis.com/v1/places:searchText`
- Headers: `X-Goog-Api-Key`, `X-Goog-FieldMask: places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.formattedAddress,places.rating,places.userRatingCount,places.primaryType`
- Paginate through results (nextPageToken)
- Map to `BusinessRaw` Pydantic model

`pipeline/ingestion/self_scraper.py` — Implements `LeadSourceAdapter`:
- Playwright navigates to `https://www.google.com/maps/search/{query}`
- Stealth mode: randomized delays (2-4s), non-default user agent
- Extracts business cards from DOM (name, phone, website, address, rating, review count)
- Falls back gracefully if blocked: logs warning, returns what was captured

`pipeline/ingestion/deduplication.py`:
- Query Supabase for existing `google_place_id` values
- Return only truly new records (set difference)
- Log: `[ingestion] X new leads, Y already in database`

`pipeline/run_campaign.py` — CLI:
```
python run_campaign.py --city "Austin" --state TX --niche housekeeping --limit 100 --source google_places
```
1. Create `campaigns` record
2. Call adapter based on `--source` or `LEAD_SOURCE` config
3. Deduplicate
4. Upsert new businesses
5. Print summary

**Dashboard:** `dashboard/app/leads/page.tsx` — table: name, city, rating, status, website link, score tier (once scored), created_at

---

### Day 3: Website Analysis — Playwright

`pipeline/analysis/playwright_runner.py`:

```python
class WebsiteAnalyzer:
    async def analyze(self, business_id: str, url: str) -> AnalysisCapture:
        # 1. Launch headless Chromium (stealth: non-Playwright user-agent)
        # 2. Navigate to URL (timeout=20s, wait=networkidle)
        # 3. Desktop: viewport 1280x800 → screenshot as PNG → base64 encode
        # 4. Upload screenshot to Supabase Storage: screenshots/{business_id}/desktop.png
        # 5. Mobile: viewport 390x844 → screenshot → upload mobile.png
        # 6. Extract HTML: document.documentElement.outerHTML, truncate to 50k chars
        #    (keep <head> fully, body first 40k chars)
        # 7. Extract with regex: phone numbers, email addresses
        # 8. Find contact page link (href containing /contact, /about, /reach)
        # 9. Return AnalysisCapture dataclass
```

Error handling:
- Site unreachable / 404 → store error, set status=`analysis_failed`, continue
- Redirect to Facebook/Instagram → note as `social_only`, score as `high_priority` (no website)
- SSL certificate error → accept insecure, capture anyway, note in analysis

`pipeline/analysis/pagespeed.py`:
```python
def get_mobile_score(url: str) -> int:
    # GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy=mobile&key={key}
    # Return: performance_score (0-100)
    # Map to rubric score: floor(score / 20) → 0-5
```

---

### Day 4: Scoring + Content Extraction

`pipeline/analysis/scoring_prompt.py` — The rubric prompt as a standalone string constant.
(Extracted so you can iterate on the prompt without touching scorer logic.)

`pipeline/analysis/scorer.py`:
```python
class WebsiteScorer:
    def score(self, capture: AnalysisCapture, pagespeed_score: int) -> ScoringResult:
        # Build message: screenshot as image content + HTML excerpt as text
        # Call Claude claude-sonnet-4-6 with structured output (tool_use schema)
        # Parse response into ScoringResult Pydantic model
        # Override speed_score with pagespeed-derived value
        # Validate: all scores within range, sum correct
        # Assign priority_tier based on total
        # Store in website_analyses table
        # Update business status
```

`ScoringResult` fields: `visual_score, mobile_score, trust_score, cta_score, service_clarity_score, contact_friction_score, speed_score, review_usage_score, quote_flow_score, professionalism_score, total_score, priority_tier, notes, top_3_weaknesses`

`pipeline/analysis/content_extractor.py`:
```python
class ContentExtractor:
    def extract(self, business_id: str, html: str) -> ExtractedContent:
        # Call Claude claude-haiku-4-5 (cheap) with HTML
        # Prompt: extract structured data —
        #   services_offered: list of strings
        #   service_areas: list of cities/neighborhoods mentioned
        #   years_in_business: int or null
        #   trust_signals: list (bonded, insured, background_checked, satisfaction_guarantee, etc.)
        #   unique_selling_points: list
        #   owner_name: string or null
        #   tone: friendly | professional | formal | family_run
        # Return ExtractedContent, store in businesses.extracted_content JSONB
```

**Dashboard:** `dashboard/app/scores/page.tsx` — sortable table by score, filter by tier. `dashboard/app/scores/[business_id]/page.tsx` — screenshot thumbnails + rubric score breakdown + weaknesses list + AI notes.

---

### Days 5-6: Housekeeping Template V1

`templates/housekeeping-v1/index.html` — Full Jinja2 template.

**Design principles (conversion-backed):**
- Hero: full-width, business name dominant, tagline, phone number in large text, two CTA buttons ("Get Free Quote" + "Call Now")
- Trust bar immediately below hero: ⭐ rating + review count, years in business, bonded+insured badges
- Services section: 3-column card grid, each with icon, name, 2-line description
- How It Works: 3-step process (Book → We Clean → You Enjoy). Reduces anxiety.
- About section: owner-friendly, warm tone, photo placeholder
- Reviews section: 3 testimonial cards (real rating shown, placeholder names: "Sarah M., Austin TX"). Labeled "Based on X Google reviews" — not fake reviews.
- Service area section: list of cities/neighborhoods
- FAQ section: 6 questions (Do you bring supplies? Are you insured? What if I'm not satisfied?)
- AI Chat Widget (MOCKUP): floating button bottom-right, clicking opens a static chat-style overlay labeled "AI Assistant Demo — Try asking: 'Do you service my area?'" This shows the feature without requiring Phase 2 backend.
- Booking CTA: "Book Online" button linking to `{{booking_url}}` (defaults to `#contact` for demo, real Calendly link post-sale)
- Contact form: name, email, phone, service type (dropdown), message, "Get My Free Quote" submit
- Footer: phone, address, copyright, "Demo created by Trade Ease"
- **Demo banner**: sticky top bar in orange: "⚠️ Demo Site — Created for {{business_name}} by Trade Ease. [View their current site →]"

`templates/housekeeping-v1/styles.css` — Mobile-first. Clean. CSS variables for brand color (defaulting to a professional teal/green). Accessible font sizes. No heavy frameworks.

`templates/housekeeping-v1/template_spec.json` — Field map with all Jinja2 variables, types, sources, and fallbacks. See TEMPLATE_SPEC.md.

---

### Day 7: Demo Generator

`pipeline/generation/content_upgrader.py`:
```python
class ContentUpgrader:
    def upgrade(self, business: Business, extracted: ExtractedContent) -> UpgradedContent:
        # Call Claude claude-sonnet-4-6 with:
        #   - business name, city, rating, review_count
        #   - extracted: services, areas, USPs, years, tone, owner_name
        # Generate:
        #   tagline: string (10-12 words, benefit-focused, their real USPs)
        #   about_text: string (120 words, warm, reflects their tone + actual facts)
        #   services_enhanced: list of {name, description} (their real services, better descriptions)
        #   trust_statement: string (uses their real signals if extracted, else sensible default)
        #   service_area_text: string (natural sentence from their areas list)
        # Return UpgradedContent
```

`pipeline/generation/template_engine.py`:
```python
def render(template_id: str, data: dict) -> str:
    # Load template from templates/{template_id}/
    # Load template_spec.json to validate required fields
    # Apply Jinja2 rendering with data dict
    # Return rendered HTML string
```

`pipeline/generation/storage_deploy.py`:
```python
def upload_demo(business_id: str, html: str) -> str:
    # Upload to Supabase Storage: demos/{business_id}/index.html
    # Set content-type: text/html
    # Return public URL
```

`run_campaign.py` updated to call the full chain: ingest → analyze → score → extract → generate → store

---

## WEEK 2: OUTREACH + DASHBOARD (Days 8-14)

### Day 8: Contact Extraction + Email Drafting

`pipeline/outreach/contact_extractor.py`:
```python
class ContactExtractor:
    def extract(self, business: Business, html: str) -> Contact | None:
        # 1. Already have phone from Google listing — always stored
        # 2. Regex email search in full HTML text: mailto: links + pattern match
        # 3. If no email in main page: follow /contact, /about links, repeat regex
        # 4. If owner_name in extracted_content, use it
        # 5. Source = 'website' or 'google_listing'
        # 6. Confidence = 'high' (if found directly) | 'low' (if inferred)
        # 7. Store in contacts table
        # 8. If no email found: store contact with email=null, phone=business.phone
```

`pipeline/outreach/email_drafter.py`:
```python
class EmailDrafter:
    def draft(self, business: Business, analysis: WebsiteAnalysis,
              demo_url: str, comparison_url: str) -> OutreachDraft:
        # Call Claude claude-sonnet-4-6 with:
        #   - business name, owner_name (if known), city
        #   - top_3_weaknesses (from scoring)
        #   - demo_url, comparison_url
        #   - their current website URL
        # Generate:
        #   subject: string (personalized, non-generic, non-spammy)
        #   body_html: string (150-200 words, first-person, specific to their site)
        #   body_text: string (plain text version)
        # Store as outreach_drafts with status=draft
        # Log: Draft created for {name}
```

Email tone principles (baked into prompt):
- Written as one person to another, not an agency blast
- Reference ONE specific thing observed on their site (from top_3_weaknesses)
- Lead with value: "I built a demo of your site that loads in 1.2 seconds and has a booking button"
- End with soft CTA: "Took about an hour — here's the link if you're curious"
- 150 words max. Short wins.

---

### Day 9: Comparison Page Builder

`pipeline/outreach/comparison_builder.py`:
```python
def build_comparison(business: Business, analysis: WebsiteAnalysis,
                     demo_url: str) -> str:
    # Generate static HTML comparison page:
    #   - Page title: "{{business_name}} — Your Current Site vs. What It Could Be"
    #   - Left panel: their desktop screenshot + score badge + 3 weakness bullets
    #   - Right panel: demo site in iframe (or screenshot)
    #   - Below: 5-bullet "What we improved" list (from top_3_weaknesses + added features)
    #   - CTA: "Want this site? Reply to our email."
    #   - Demo banner (same as on demo site)
    # Upload to Supabase Storage: comparisons/{business_id}/index.html
    # Return public URL
```

---

### Days 10-11: Admin Dashboard (Minimal but Functional)

**Goal: All key views working. Polish is secondary. Speed is primary.**

`dashboard/app/leads/page.tsx`:
- Table: name, city, rating, status badge (color-coded), website (external link), created_at
- Filter: by status, city, niche
- Click row → detail view

`dashboard/app/scores/page.tsx`:
- Table: name, total_score, tier badge (skip/candidate/high_priority), top weakness, created_at
- Sort: by score (default descending)
- Tier filter

`dashboard/app/scores/[business_id]/page.tsx`:
- Two side-by-side screenshot thumbnails (desktop / mobile)
- Rubric score breakdown (horizontal bar chart — can be simple CSS, no chart library needed)
- AI notes + top 3 weaknesses
- Extracted content summary (services, areas)
- "Generate Demo" button if not yet generated

`dashboard/app/demos/page.tsx`:
- Grid: demo thumbnail (screenshot of generated site), business name, tier, status
- Filter: by status

`dashboard/app/demos/[business_id]/page.tsx`:
- Iframe: the generated demo site (from Supabase Storage URL)
- Panel: injection data JSON (what was used to fill template)
- Link: comparison page
- Status: ready / generating / error

`dashboard/app/outreach/page.tsx` — THE KEY SCREEN:
- Table: business name, email subject (truncated), status badge, contact email (if found), created_at
- Filter: by status (draft, pending_review, approved, sent)
- Click row → full review

`dashboard/app/outreach/[draft_id]/page.tsx`:
- LEFT: Rendered email preview (HTML in iframe)
- RIGHT TOP: Demo site iframe
- RIGHT BOTTOM: Comparison page link
- BOTTOM: Text editor for subject + body (pre-filled with draft)
- Buttons: **Approve** (→ status=approved) | **Reject** (→ status=rejected, modal for notes) | **Save Edit** (→ updates draft)

`dashboard/app/outreach/approved/page.tsx`:
- List: approved drafts with to_email, subject, business name
- Each row: **Send Now** button
- On click: POST to `/api/outreach/[id]/send` → calls Resend → updates status=sent

---

### Day 12: Resend Integration + CAN-SPAM

`pipeline/delivery/resend_sender.py`:
```python
def send_approved_draft(draft_id: str) -> str:
    # Load draft from Supabase (must be status=approved)
    # Load contact for to_email
    # Load business for from_name context
    # Append CAN-SPAM footer to body_html and body_text:
    #   - Physical address (from PHYSICAL_ADDRESS env var)
    #   - "To unsubscribe, reply with 'unsubscribe' in the subject."
    # Call Resend API: POST /emails
    # Update draft: status=sent, sent_at=now(), resend_message_id=response.id
    # Return message_id
```

`dashboard/app/api/outreach/[id]/send/route.ts`:
- Calls Python script via subprocess OR calls Resend directly from Next.js (simpler for MVP)
- For MVP: call Resend directly from Next.js API route using `resend` npm package
- This avoids needing a running Python server — pipeline Python is CLI only for MVP

`dashboard/app/api/webhooks/resend/route.ts`:
- Verify webhook signature (Resend provides this)
- On `email.opened`: update `opened_at`
- On `email.clicked`: update `clicked_at`

---

### Day 13: Integration Test on Real Data

Run the full pipeline on 20 real housekeeping businesses in one city:
```bash
python pipeline/run_campaign.py --city "Denver" --state CO --niche housekeeping --limit 20
```

Check for:
- [ ] All 20 leads imported correctly
- [ ] Sites with no website → status=no_site, tier=high_priority
- [ ] Sites with SSL errors → handled gracefully
- [ ] Facebook/Instagram redirects → handled gracefully
- [ ] Content extraction working (services, areas in extracted_content JSON)
- [ ] Demo sites generated with real content (not generic placeholders)
- [ ] Email drafts look personal, reference specific weaknesses
- [ ] Comparison pages load correctly
- [ ] Dashboard shows all data correctly
- [ ] Approve an email → send it → verify receipt

---

### Day 14: Buffer + First Real Outreach

- Fix any bugs from Day 13
- Review all generated emails — edit any that feel generic
- Send first 5 real outreach emails manually
- Note: domain warm-up should be at ~day 14 of sending; keep initial sends to 10-15/day max
- Create first real campaign with 50+ businesses
- Done: MVP complete

---

## ENVIRONMENT VARIABLES CHECKLIST

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (pipeline only — never expose to frontend)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  (dashboard frontend)

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google APIs
GOOGLE_PLACES_API_KEY=AIza...    (for Places API lead sourcing)
GOOGLE_PSI_API_KEY=AIza...       (for PageSpeed Insights — can be same key)

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=ben@tradeease.com
RESEND_FROM_NAME=Ben from Trade Ease
RESEND_WEBHOOK_SECRET=...        (from Resend dashboard)

# CAN-SPAM (required in all outreach emails)
PHYSICAL_ADDRESS=123 Main St, City, State 12345

# Lead Source
LEAD_SOURCE=google_places  # or: self_scrape

# App
NEXT_PUBLIC_APP_URL=https://dashboard.tradeease.com  # or localhost:3000 in dev
DEMO_BASE_URL=https://xxxx.supabase.co/storage/v1/object/public/demos
COMPARISON_BASE_URL=https://xxxx.supabase.co/storage/v1/object/public/comparisons
```

---

## MODULARITY NOTES (For Future-Proofing Without Rewriting)

Every external integration is behind an interface:

| Interface | MVP Implementation | Phase 2 Swap |
|-----------|-------------------|--------------|
| `LeadSourceAdapter` | `GooglePlacesSource` | `SelfScrapeSource`, Outscraper |
| `AIModelAdapter` | `ClaudeAdapter(model=sonnet/haiku)` | GPT-4o, local model |
| `DemoDeployAdapter` | `SupabaseStorageDeploy` | `VercelDeploy`, `CloudflarePagesDeploy` |
| `EmailSendAdapter` | `ResendSender` | `PostmarkSender`, `SMTPSender` |
| `JobQueueAdapter` | Direct Python function calls | Celery, pg-boss, BullMQ |

Swapping any of these = implement the interface, change one config value, done.
Business logic in `run_campaign.py` never changes.

---

## DEFINITION OF DONE (MVP)

You can call it done when:
1. `python run_campaign.py --city "Denver" --state CO` runs without errors and populates Supabase
2. Dashboard at `dashboard.tradeease.com` shows leads, scores, demos
3. Generated demo sites contain real business name, their real services (extracted), their real rating, and a working AI chat mockup and booking button
4. Email drafts reference specific weaknesses observed on their site (not generic)
5. Approve → Send → Email arrives with demo link, comparison link, CAN-SPAM footer
6. Nothing sends without clicking "Send Now" in the dashboard
7. At least 5 real outreach emails sent and verified received
