# LeadScraper V1 — Product Spec & Architecture Plan
**Status:** Planning / Pre-Build
**Date:** 2026-03-09
**Author:** Architecture Planning Session

---

## A. Executive Summary

This system is a **lead-generation and demo-site engine for local service businesses**, starting with housekeeping. The core loop is:

1. Pull structured business leads from Google Maps / Places sources for target cities
2. Visit and score each business website against a rubric
3. **Extract real content from their existing site** (services, tone, service area, trust signals)
4. For weak or missing sites, generate a better demo site — filled with THEIR actual business data, written better, with upsell features pre-installed and visible
5. Draft a personalized outreach email for each business owner
6. Route all outreach through a human review queue — nothing sends without approval
7. Convert interested leads into paying clients of a **complete digital presence bundle** (not just a website)

**The pitch is not "here's a better website." The pitch is: "Here's your complete online presence — new site, AI chat that answers customers 24/7, automated review requests, and a booking button — all running for you without you touching a thing."**

You are not selling a website. You are selling peace of mind and more bookings. Upsells (AI chat, review automation, booking integration) are part of the core demo from day one — not Phase 3 features. They are what close the deal.

**This is a viable, proven business model.** The moat is the automated prospecting-to-demo pipeline, which lets a solo operator run at a scale that would normally require a full agency team.

---

## B. Assumptions and Open Questions

### Stated Assumptions (adjust if wrong)

| # | Assumption |
|---|------------|
| 1 | Solo founder, part-time at launch (~20 hrs/week buildable) |
| 2 | US-only markets at launch (no GDPR concerns initially) |
| 3 | Budget: $100–200/month for external APIs and hosting (can scale as clients are onboarded) |
| 4 | Target batch size: 50–200 leads per city campaign |
| 5 | Pricing model: one-time site fee ($400-$700) + monthly retainer ($79–200/month) |
| 6 | Demo sites are mockups only — not deployable to client's domain until paid |
| 7 | Contact email comes from website, Google listing, or paid enrichment tool |
| 8 | Outreach is cold B2B email — human-written tone, not mass blast |
| 9 | One housekeeping template to start; template system must support multiple niches |
| 10 | Claude API (claude-sonnet-4-6) is the AI model for scoring, generation, and chat. This is not strict, use most cost-effective model.|

### Open Questions (non-blocking, but worth deciding before Phase 2)

1. **Pricing**: Will you offer one-time builds, monthly subscriptions, or both? I will be offering monthly subscriptions with a set number of edits (likely 2) per month.
2. **Template ownership**: Do you want fully custom designs per niche, or adapt a single responsive template? Fully custom for each niche.
3. **Hosting model**: Do you host all client sites under your domain (e.g., `demos.yourdomain.com/business-name`) or provision subdomains per client? Demos can be under my domain, client websites once delivered must be their own domains that they already have or we make.
4. **Email identity**: Will outreach come from your personal domain, a dedicated outreach domain, or a tool like Instantly/Lemlist? Currently through a gmail but can switch to my own outreach domain, e.g. Ben@tradeease.com
5. **Contact finding budget**: Are you okay spending $50–100/month on Hunter.io or Apollo.io for email verification? I'm looking to limit monthly spend up front until clients start rolling on so provided this is the only large purchase we can consider if really necessary and will help drive a lot of leads, but otherwise would prefer other options. 

---

## C. Recommended Architecture

### Modularity Principle

**Every major integration point uses an adapter/interface pattern.** This means you can swap out any component (lead source, AI model, email provider, hosting) without touching the rest of the codebase. Just implement the interface and change a config value. This is non-negotiable given the 1-2 week build timeline — we need to move fast AND not paint ourselves into corners.

### Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        PIPELINE LAYER (Python)                  │
│                                                                 │
│  [Lead Ingestion]      [Website Analyzer]      [Scorer]         │
│       ↓                       ↓                    ↓           │
│  LeadSourceAdapter      Playwright           AIModelAdapter     │
│  ├─ GooglePlacesSource  (screenshots,        ├─ ClaudeScorer   │
│  └─ SelfScrapeSource    HTML, metadata)      └─ (swappable)    │
│   (see note below)                                              │
│                                                                 │
│  [Content Extractor]   [Demo Generator]    [Email Drafter]     │
│       ↓                       ↓                    ↓           │
│  Claude (haiku)         Jinja2 Template     Claude (sonnet)    │
│  Extract: services,     + Upsell demos      + Comparison page  │
│  areas, tone, USPs      pre-installed                          │
│  from their real site   (AI chat widget,                       │
│                          booking btn visible)                  │
│                                                                 │
│  [Review Queue]                                                 │
│       ↓                                                         │
│  Supabase Table → Dashboard → Manual Approve → Send            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER (Supabase)                    │
│                                                                 │
│  PostgreSQL DB  │  Supabase Storage  │  Supabase Auth           │
│  (all entities) │  (screenshots,     │  (admin login)           │
│                 │   generated HTML)  │                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD (Next.js)                   │
│                                                                 │
│  Lead Browser  │  Score Inspector  │  Demo Previewer            │
│  Outreach Queue│  Email Editor     │  Approval Controls         │
│  Campaign Mgmt │  Analytics        │  Client Status             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DELIVERY LAYER                             │
│                                                                 │
│  Demo Hosting: Vercel (static) or Cloudflare Pages             │
│  Email Send: Resend API (manual trigger from dashboard)         │
│  Client Sites: Vercel + custom domain per client               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
City + Niche
    → LeadSourceAdapter (Google Places API or self-scrape fallback)
    → Raw Leads (JSON): name, phone, website, address, rating, review_count
    → Deduplicate by google_place_id
    → Store in Supabase businesses table

For each business with a website:
    → Playwright visits site
        → Captures: desktop screenshot, mobile screenshot, page HTML
        → Extracts contact info (phone, email if present)
    → Google PageSpeed Insights API → performance score
    → Claude claude-sonnet-4-6 (vision) → structured score JSON
        → Stored in website_analyses table
        → Assigns priority_tier (skip_remake / candidate / high_priority)

If priority_tier != skip_remake:
    → Content Extractor (Claude claude-haiku-4-5)
        → Parses their HTML → structured: services, service_area, USPs,
          years_in_business, trust_signals, tone
        → Stored in businesses.extracted_content JSONB
    → Demo Generator
        → Merges: extracted content + Google data + AI-upgraded copy
        → Claude claude-sonnet-4-6 rewrites their content: better headlines,
          clearer service descriptions, stronger CTAs
        → Renders Jinja2 template with THEIR real business data
        → Demo includes: AI chat widget (mock), booking button, review stars
        → Uploads to Supabase Storage as demos/{business_id}/index.html
        → Stored in demo_sites table
    → Comparison Page Generator
        → Their screenshot (left) vs demo screenshot (right)
        → Bullet list of specific improvements
        → Hosted at tradeeasehq.com/compare/{slug}
    → Email Drafter (Claude claude-sonnet-4-6)
        → Personalized subject + body referencing SPECIFIC observed weaknesses
        → Links to demo + comparison page
        → Stored in outreach_drafts (status=draft)

Admin reviews queue in dashboard:
    → See email draft + demo preview + comparison side-by-side
    → Edit / Approve / Reject
    → On approve: Resend API sends email
    → Resend webhooks track opens/clicks → update status
```

---

## D. Core Workflows

### Workflow 1: Lead Ingestion

1. Admin creates a campaign (niche + city + state) in dashboard or via CLI
2. Pipeline calls `LeadSourceAdapter` — default is Google Places API (official)
   - Fallback: Playwright self-scraper (see stack notes)
3. Returns: `name, phone, website, address, rating, review_count, google_place_id, category`
4. Deduplicates by `google_place_id`
5. Stores new records in `businesses` table with `status=new`

### Workflow 2: Website Analysis + Scoring

1. For each business with `website_url`:
2. Playwright visits site (stealth mode, randomized delays)
3. Captures: desktop screenshot (1280×800), mobile screenshot (390×844), page HTML (50k char limit)
4. Extracts: phone numbers (regex), email addresses (regex), contact page link, social links
5. Calls Google PageSpeed Insights API (free, mobile strategy)
6. Sends: screenshot + HTML excerpt + scoring prompt to Claude claude-sonnet-4-6 (vision)
7. Claude returns structured JSON: `{visual_score, trust_score, cta_score, ..., top_3_weaknesses}`
8. Aggregates into `total_score`, assigns `priority_tier`
9. Stores full result in `website_analyses` table

### Workflow 2b: Content Extraction (NEW — Critical)

**This step is what makes the demo feel personal rather than generic.**

1. Triggered immediately after scoring for `candidate` and `high_priority` businesses
2. Sends HTML to Claude claude-haiku-4-5 (cheap, fast) with extraction prompt:
   - Services explicitly offered
   - Service areas mentioned (cities, neighborhoods)
   - Years in business / founding story
   - Trust signals mentioned (bonded, insured, background checked, satisfaction guarantee)
   - Any unique selling points or differentiators
   - Tone/personality (formal, friendly, family-run, professional)
   - Owner name if mentioned
3. Returns structured JSON stored in `businesses.extracted_content`
4. This content is the primary injection source for demo generation

### Workflow 3: Demo Site Generation — With Visual Differentiation

Every demo must feel purpose-built for that business, not templated. Sending visually identical demos to 50 businesses in the same city would damage reputation and reduce reply rates. Visual differentiation is achieved through the SAME template with variable rendering — not multiple templates (yet).

**Differentiation levers (all driven by extracted_content):**
1. **Color theme** — Extract or assign a primary brand color based on their current site's dominant color (if detectable), or tone (warm/cool/neutral). Applied as CSS variables: 3-4 colors make the site look completely different.
2. **Tone-based copy variant** — `tone` field from extraction: `friendly` → warmer headline copy; `professional` → cleaner, more formal; `family_run` → personal story emphasis
3. **Section visibility** — Conditional Jinja2 blocks: show pricing callout only if they have no pricing on current site; show "How It Works" only for businesses that score low on trust; show FAQ section always
4. **Service layout** — 3, 4, or 6-card grid depending on number of services extracted
5. **Hero emphasis** — If owner name is known: "Hi, I'm [Name]" personal hero. If not: lead with the service benefit.

**Phase 2:** Add 2nd layout variant (hero on right, services in horizontal scroll) for true structural differentiation.

**Steps:**
1. Triggered for businesses with `priority_tier in ('candidate', 'high_priority')`
2. Merges data sources: `extracted_content` (from their site) + Google listing data + AI upgrades
3. Claude claude-sonnet-4-6 generates upgraded content:
   - Rewrites their about section (better copy, same facts)
   - Writes clearer service descriptions based on their actual services
   - Creates a tagline based on their detected tone/USPs
   - Writes trust statement using their real signals (bonded/insured if they mentioned it)
4. Template engine renders with real business data + color theme + tone variant
5. **Demo includes upsell features shown in mockup state:**
   - AI chat widget button (visible, labeled "Try AI Assistant Demo")
   - Booking button (links to `{{calendly_url}}` — placeholder for demo, real URL from client post-sale)
   - Review stars (using real rating + count from Google)
   - Review request section ("After each job, we automatically ask clients for reviews")
6. Uploads to Supabase Storage — `demos/[business_id]/index.html`
7. Records `preview_url` in `demo_sites` table

### Workflow 4: Outreach Draft Generation — Tier-Based Framing (Critical)

The email angle must match what is actually true about their site. Do not send a "your site is broken" email to someone with a decent site — it reads as clueless and gets deleted. The scoring tier drives the entire email tone:

| Tier | Their Reality | Email Angle |
|------|--------------|-------------|
| `high_priority` (0-49) | Weak site: no mobile, no CTA, dated design | Lead with the pain: "I was looking at your site on my phone and noticed it's hard to navigate — I rebuilt it for you." Reference 1-2 specific weaknesses observed. |
| `candidate` (50-74) | Decent site, missing key conversion features | Lead with the compliment: "Your site looks professional — I almost didn't reach out. But I noticed you're missing a booking button and an AI chat that could capture leads after hours." Position demo as an upgrade, not a rescue. |
| `no_site` | No website at all | Most urgent: "I couldn't find a website for [Business Name] — I built one for you in an hour. Here's the link." |

**Rule:** Never describe a 65-scoring site as "weak" — that's insulting and wrong. Acknowledge what works, then explain the specific missing features that cost them bookings. This is the right sell, not just the polite one.

**Email generation inputs to Claude:**
- `priority_tier` — determines angle/tone
- `total_score` — context for how urgent the pitch is
- `top_3_weaknesses` — specific callouts (e.g., "no phone number visible on mobile", "no booking button", "no reviews shown")
- `demo_url`, `comparison_url`
- `extracted_content.owner_name` — personalize greeting if available
- `businesses.city` — reference their local market

1. For each business with a generated demo site:
2. Claude is called with all inputs above + tier-specific prompt framing
3. Claude generates: subject line (non-generic, references 1 specific observation), personalized email body (HTML + plain text)
4. Draft stored in `outreach_drafts` with `status=draft`
5. Admin sees draft in review queue
6. Admin can edit, approve, or reject
7. On approve: Resend API sends email, status updates to `sent`

### Workflow 5: Side-by-Side Comparison

1. A comparison page is generated as a simple HTML page
2. Left panel: screenshot of their current site + score breakdown
3. Right panel: our demo site preview
4. Hosted at `yourdomain.com/compare/[business-slug]`
5. Link included in outreach email

---

## E. Website Scoring Rubric

### 100-Point Rubric

| Criterion | Max Points | What Claude Evaluates |
|-----------|------------|----------------------|
| Visual Quality & Design | 15 | Modern vs dated aesthetic, professional photography vs stock art, layout quality, color/font consistency |
| Mobile Friendliness | 15 | Responsive layout, readable text size, tap target sizes, no horizontal scroll |
| Trust Signals | 15 | Google reviews shown, testimonials, years in business, guarantees, certifications, professional associations |
| CTA Clarity | 15 | Is phone number prominently visible? Is there a "Get a Quote" or "Book Now" button above the fold? |
| Service Clarity | 10 | Do they clearly list what they offer? Are services named and described? |
| Contact Friction | 10 | How hard is it to contact them? Phone visible? Form accessible? |
| Speed / Performance | 5 | PageSpeed score 0-100, mapped to 0-5 |
| Review Integration | 5 | Are Google/Yelp reviews actually shown on the page? Count displayed? |
| Quote / Booking Flow | 5 | Can you get a quote without calling? Online booking or estimate form? |
| Overall Professionalism | 5 | Writing quality, no broken images, no placeholder text, no spam-like layout |

### Priority Tiers

| Score | Tier | Action |
|-------|------|--------|
| 75–100 | **skip_remake** | Site is strong. Log it, do not generate demo. Revisit in 12 months. |
| 50–74 | **candidate** | Worth targeting. Generate demo. Medium priority outreach. |
| 0–49 | **high_priority** | Weak or damaging site. Generate demo. High priority outreach. |
| No site | **no_site** | Highest priority. Generate demo from scratch. |

### Scoring Notes

- Claude vision handles criteria 1–5 and 8–10 based on screenshot + HTML
- PageSpeed API provides criterion 6 (speed) raw score
- CTA score should heavily penalize: no phone visible on mobile, no booking button
- Trust score should reward: showing review count + rating, any guarantee language, named owner/team
- A site scoring 74 that looks professional but lacks a clear CTA is still a good outreach candidate

---

## F. Data Model / Schema

### PostgreSQL Schema (Supabase)

```sql
-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE businesses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id   TEXT UNIQUE,
  name              TEXT NOT NULL,
  phone             TEXT,
  website_url       TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  zip               TEXT,
  rating            DECIMAL(3,1),
  review_count      INT DEFAULT 0,
  category          TEXT,
  niche             TEXT NOT NULL DEFAULT 'housekeeping',
  source            TEXT DEFAULT 'google_places', -- google_places | self_scrape | manual
  status            TEXT NOT NULL DEFAULT 'new',
  -- status flow: new → analyzing → scored → demo_generated →
  --              outreach_drafted → outreach_approved → outreach_sent →
  --              converted | skip | no_response
  extracted_content JSONB,  -- Claude-extracted: services, areas, USPs, tone, owner_name, trust_signals
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEBSITE ANALYSES
-- ============================================================
CREATE TABLE website_analyses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID REFERENCES businesses(id) ON DELETE CASCADE,
  analyzed_url            TEXT,
  screenshot_desktop_url  TEXT,   -- Supabase Storage URL
  screenshot_mobile_url   TEXT,
  page_html               TEXT,   -- truncated to ~50k chars
  pagespeed_score         INT,    -- 0-100 from Google PSI API
  -- Rubric component scores
  visual_score            INT,    -- 0-15
  mobile_score            INT,    -- 0-15
  trust_score             INT,    -- 0-15
  cta_score               INT,    -- 0-15
  service_clarity_score   INT,    -- 0-10
  contact_friction_score  INT,    -- 0-10
  speed_score             INT,    -- 0-5
  review_usage_score      INT,    -- 0-5
  quote_flow_score        INT,    -- 0-5
  professionalism_score   INT,    -- 0-5
  total_score             INT,    -- computed sum
  priority_tier           TEXT,   -- skip_remake | candidate | high_priority | no_site
  ai_analysis_notes       TEXT,   -- Claude's reasoning
  raw_scores_json         JSONB,  -- full structured output from Claude
  error                   TEXT,   -- if analysis failed
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche         TEXT NOT NULL DEFAULT 'housekeeping',
  name          TEXT NOT NULL,
  description   TEXT,
  template_path TEXT,  -- path in Supabase Storage or local /templates dir
  preview_url   TEXT,
  is_active     BOOL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEMO SITES
-- ============================================================
CREATE TABLE demo_sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES templates(id),
  preview_url     TEXT,             -- hosted URL of the demo
  generated_html  TEXT,             -- full rendered HTML
  storage_path    TEXT,             -- path in Supabase Storage
  injection_data  JSONB,            -- what was injected: name, phone, city, etc.
  ai_content      JSONB,            -- Claude-generated: about, taglines, services copy
  status          TEXT DEFAULT 'generating',  -- generating | ready | published | archived
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  role            TEXT DEFAULT 'owner',  -- owner | manager | unknown
  source          TEXT,  -- website | google_listing | hunter_io | apollo | manual
  confidence      TEXT,  -- high | medium | low
  verified        BOOL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OUTREACH DRAFTS
-- ============================================================
CREATE TABLE outreach_drafts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id),
  demo_site_id      UUID REFERENCES demo_sites(id),
  subject           TEXT,
  body_html         TEXT,
  body_text         TEXT,
  comparison_url    TEXT,   -- URL of side-by-side comparison page
  status            TEXT DEFAULT 'draft',
  -- status: draft | pending_review | approved | sent | rejected | bounced | replied
  rejection_notes   TEXT,
  admin_notes       TEXT,
  resend_message_id TEXT,   -- from Resend API after send
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  niche         TEXT NOT NULL DEFAULT 'housekeeping',
  city          TEXT,
  state         TEXT,
  status        TEXT DEFAULT 'active',  -- active | paused | complete
  leads_count   INT DEFAULT 0,
  search_query  TEXT,  -- what was sent to Outscraper
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_businesses (
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, business_id)
);

-- ============================================================
-- CLIENT SITES (post-sale)
-- ============================================================
CREATE TABLE client_sites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES businesses(id),
  domain              TEXT,
  hosting_status      TEXT DEFAULT 'pending',  -- pending | live | suspended
  plan                TEXT DEFAULT 'basic',    -- basic | pro | ai_agent
  monthly_fee         DECIMAL(8,2),
  ai_agent_enabled    BOOL DEFAULT FALSE,
  ai_agent_config     JSONB,
  -- config: { services: [], service_area: [], hours: {}, quote_rules: {} }
  live_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_niche ON businesses(niche);
CREATE INDEX idx_businesses_city ON businesses(city, state);
CREATE INDEX idx_website_analyses_business ON website_analyses(business_id);
CREATE INDEX idx_website_analyses_tier ON website_analyses(priority_tier);
CREATE INDEX idx_outreach_drafts_status ON outreach_drafts(status);
CREATE INDEX idx_demo_sites_business ON demo_sites(business_id);
```

---

## G. Recommended Stack and Why

### Stack Decision Matrix

| Layer | Recommendation | Why | Alternatives |
|-------|---------------|-----|--------------|
| **Lead Data** | Google Places API (official) + Playwright self-scraper fallback | See detailed note below | Outscraper ($3/1k), SerpApi ($50/mo flat) |
| **Browser Automation** | Playwright (Python) | Best-in-class headless browser, JS sites, screenshots, content extraction | Selenium (slower), requests+BS4 (no JS) |
| **Performance Data** | Google PageSpeed Insights API | Free, 25k req/day, authoritative | Lighthouse CLI (local) |
| **AI Model (vision/scoring)** | Claude claude-sonnet-4-6 | Vision capabilities, structured output, long HTML context | GPT-4o (comparable) |
| **AI Model (extraction/cheap tasks)** | Claude claude-haiku-4-5 | 10x cheaper than sonnet, sufficient for content extraction | GPT-4o-mini |
| **Database** | Supabase (PostgreSQL) | Managed Postgres + Storage + Auth, generous free tier, excellent DX | Railway Postgres |
| **File Storage** | Supabase Storage | Co-located with DB, signed URLs, no separate service | S3, Cloudflare R2 |
| **Pipeline Orchestration** | Python scripts (direct calls, MVP) | Right complexity for 2-week build. Adapter pattern means swapping to Celery/BullMQ later requires NO changes to business logic | Celery (Phase 2+) |
| **Template Engine** | Jinja2 (Python) | Simple, battle-tested, great for HTML | Handlebars |
| **Demo Site Hosting** | Supabase Storage (public HTML) for MVP; Vercel for Phase 2 | Zero config, immediate, free. Vercel gives better URLs and CDN for Phase 2 | Cloudflare Pages, Netlify |
| **Admin Dashboard** | Next.js 14 (App Router) | React ecosystem, Supabase integration, deploy to Vercel | Remix |
| **Email Delivery** | Resend | Modern API, free tier (3k emails/mo), webhooks for open/click tracking | Postmark, SendGrid |
| **Contact Finding** | Website parsing + Google listing (free) for MVP; no paid tool until revenue | See contact finding note below | Hunter.io ($49/mo, Phase 2) |

### Lead Sourcing: Detailed Decision

**Option A: Google Places API (official) — RECOMMENDED FOR MVP**
- Cost: $0 for first $200/month credit (free for months) then ~$35/1000 requests
- For 200 leads/city campaign: ~$7 — or FREE under the credit
- Reliable, structured, zero scraping headaches
- Returns: name, phone, website, address, rating, review_count, place_id
- Switch with one line: `LEAD_SOURCE=google_places` in config

**Option B: Playwright self-scraper (Google Maps) — FREE, GOOD FOR MVP TOO**
- Cost: $0 (just compute time)
- Works fine at small scale (100-200 results per session)
- Uses stealth plugins + randomized delays to avoid blocks
- Practical risk at this scale: very low (not "extremely serious")
- Real risk: Google detects and blocks your IP — fix is add a delay or use a residential proxy ($10-20/month), not legal exposure
- Switch with one line: `LEAD_SOURCE=self_scrape` in config

**Decision**: Build both with the adapter pattern. Default to Google Places API while under the free credit. When credit is exhausted, flip `LEAD_SOURCE=self_scrape` — one config change, zero code changes.

**Google Places API cost guardrail (hard rule):** Never incur actual charges from Google Places API. New GCP accounts receive $300 free credit for 90 days — use it. Monitor usage in Google Cloud Console billing dashboard. When approaching credit exhaustion, switch to self-scraper permanently. The self-scraper is the long-term default; Google Places API is a fast-start convenience.

**Why NOT Outscraper:** Third-party dependency, extra account, extra API key. Not needed given our two native options.

### Contact Finding: No Paid Tool at MVP — Escalation Trigger Defined

For MVP, contact info comes from:
1. **Phone** — always in Google listing data (you already have it)
2. **Email from their website** — parse the HTML with regex (`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
3. **Contact page parse** — follow `/contact`, `/about` links and extract emails
4. **Fallback** — if no email found, flag the business; phone-based outreach is still viable

**Escalation trigger for paid contact finding:** Track `contact_email_coverage_rate` in the dashboard (% of leads where an email was found). If that rate drops below 40%, escalate to Apollo.io ($49/month) or Hunter.io ($49/month). Do not pre-emptively pay for these — only when the data shows a real problem. Flag this metric prominently in the dashboard.

### Claude API Cost Estimates (per 100 businesses processed end-to-end)

| Task | Model | Est. Tokens/call | Cost/call | 100x |
|------|-------|-----------------|-----------|------|
| Website scoring (vision) | claude-sonnet-4-6 | ~7k in, ~600 out | $0.030 | $3.00 |
| Content extraction from HTML | claude-haiku-4-5 | ~5k in, ~500 out | $0.006 | $0.60 |
| Demo content upgrading | claude-sonnet-4-6 | ~2k in, ~1k out | $0.020 | $2.00 |
| Email drafting | claude-sonnet-4-6 | ~2k in, ~600 out | $0.015 | $1.50 |
| **Total per 100 businesses** | | | | **~$7.10** |

**Per business: ~$0.07. For 1,000 businesses: ~$71. This is not a cost concern.**

### Code vs. Model Responsibilities

**Handled by code (deterministic, fast):**
- Lead ingestion, deduplication, Supabase R/W
- Playwright browser automation, screenshots, HTML extraction
- PageSpeed API calls, score aggregation math
- Template rendering (Jinja2), file upload
- Email sending (Resend), status transitions

**Handled by Claude:**
- Visual website scoring (rubric) — needs vision
- Content extraction from messy HTML — needs language understanding
- Copy upgrading (better headlines, CTAs, service descriptions) — needs writing ability
- Personalized email drafting — needs tone/context reasoning
- AI chat agent responses — needs conversational ability

---

## H. Compliance / Platform-Risk Notes

### Critical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Google Maps self-scraping** | LOW-MEDIUM | The real risk is IP blocking (operational headache), not legal exposure. US case law (hiQ v. LinkedIn) sides with scrapers on public data. At 100-200 queries/session with delays: very low detection risk. Use Google Places API (official) as primary to eliminate the issue entirely. |
| **CAN-SPAM compliance** | HIGH | All outreach emails must include: physical mailing address, unsubscribe link, honest subject line, sender identity. Implement this in the email template, not optionally. |
| **Cold email reputation** | HIGH | Use a separate sending domain (not your main domain). Warm it up before bulk sends. Limit to <30 emails/day initially. |
| **Review content copyright** | MEDIUM | Do NOT copy Google review text into demo sites. Show star rating + count only. For testimonial sections, use generic placeholder text labeled "real reviews displayed here." |
| **Screenshot in outreach** | MEDIUM | Including a screenshot of their site in an email is legally gray but generally accepted as "critique." Label it clearly as their current site. |
| **Email harvesting** | MEDIUM | Only use publicly available contact info (from their own website, Google listing). Use Hunter.io for finding emails — not scraping personal contact databases. |
| **Demo site as their site** | MEDIUM | Demo sites must be clearly labeled "Demo — Created by [Your Company]" with a prominent banner. Never register domains similar to their business name. |
| **GDPR** | LOW (US-only MVP) | Stay US-only for Phase 1. Before targeting UK/EU/CA, add opt-out consent flows. |
| **Cold email domain reputation** | HIGH | Do NOT send cold outreach from your main tradeease.com inbox. Use a subdomain like `mail.tradeease.com` or a sister domain. Warm it up for 3-4 weeks before bulk sends. |

### Practical Outreach Guidance

- B2B cold email to business owners is legal under CAN-SPAM if: honest identity, non-deceptive subject, physical address, honor unsubscribes
- Keep volumes low and quality high: **20-30 emails/day max** at launch
- Personalization (referencing their specific site, their city, their real weaknesses) dramatically reduces spam reports
- The human review queue is your best protection — approve each one

### Domain and Email Setup (Do This Now — Before Building)

**Buy tradeeasehq.com immediately** if Trade Ease is the company name. Domain purchase takes 5 minutes and should happen today — not when you're ready to send.

Email warm-up protocol (runs in parallel with building):
1. Register `tradeeasehq.com`, set up Google Workspace or Zoho (cheap)
2. Add DNS records: MX, SPF, DKIM, DMARC — takes 30 minutes
3. Day 1-7: Send 5-10 emails/day manually to people you know (reply rate matters)
4. Day 8-14: 15-20/day
5. Day 15+: 30-50/day — safe for outreach

Use `ben@tradeeasehq.com` for outreach. **Sending domain = tradeease.com in Resend config.**

If you want an extra layer of protection for your main domain reputation, a sister domain for cold outreach only is an option. Low priority — `tradeeasehq.com` with proper warm-up is fine for early scale.

---

## I. MVP Scope vs. Later Scope

### Phase 1 MVP — Scope

| Feature | In MVP? |
|---------|---------|
| Lead ingestion from Outscraper (1 city) | YES |
| Website screenshot + HTML capture | YES |
| Scoring rubric (Claude vision) | YES |
| 1 housekeeping HTML template | YES |
| Demo site generation (static HTML) | YES |
| Demo hosted on Vercel preview URL | YES |
| Claude-generated outreach email draft | YES |
| Admin review queue (basic Next.js UI) | YES |
| Manual email send via Resend | YES |
| Side-by-side comparison page | YES |
| Contact finding (manual + website parsing) | YES (manual) |
| Supabase database (full schema) | YES |
| Multi-city campaigns | NO (Phase 2) |
| Background job queue | NO (Phase 2) |
| Email open/click tracking | NO (Phase 2) |
| Hunter.io integration | NO (Phase 2) |
| AI chat widget (LIVE, functional) | NO (Phase 2) |
| AI chat widget mockup IN DEMO (shows the feature, not functional) | YES — critical for pitch |
| Booking button (Calendly embed or placeholder) in demo | YES — shows in demo |
| Review request section (shown in demo as a feature callout) | YES — shown in demo |
| Client portal | NO (Phase 3) |
| Multi-niche support | NO (Phase 3) |
| Automated review requests (live, functional) | NO (Phase 2) |
| Multi-city campaigns | NO (Phase 2) |
| Background job queue | NO (Phase 2) |
| Email open/click tracking | NO (Phase 2) |
| Hunter.io integration | NO (Phase 2) |

---

## J. Feature Suggestions for Upsells

### The User Is Right — Upsells Are Not Optional

Selling a website alone to a housekeeping business owner is a weak pitch. Most of them have seen generic "we'll build you a website" offers before. The objection is always: "My current site is fine" or "I don't have time to deal with this."

**The correct frame: You are selling them more bookings, not a website.**

The demo should make this undeniable — they should see a site that already has:
- A chat widget that answers "do you service my area?" at midnight
- A booking button their clients can click without calling
- Their 4.8-star Google rating prominently shown
- A "we'll text your clients after each job asking for a review" callout

The demo IS the sales pitch. The site is just the delivery mechanism.

### Booking Integration — How It Actually Works (No Client Management Burden)

The booking feature is built on Calendly's free tier. This is entirely self-managed by the client — zero ongoing work for you.

**Onboarding flow:**
1. Client signs up for free Calendly account (calendly.com/signup — free)
2. They set their own availability in Calendly (you don't touch this, ever)
3. Client sends you their Calendly link (e.g., `calendly.com/sparkle-cleaning`)
4. You add it to their site: `<a href="https://calendly.com/sparkle-cleaning">Book Online</a>`
5. Done. Client manages all scheduling directly in Calendly. You are never involved.

**In demo sites:** Use a placeholder Calendly link that goes to a generic "Book a Demo Call" page on your own Calendly account. Explains the concept without claiming it's live.

**Verdict:** Include in Phase 1. Takes 4 hours to build into the template. Maintenance is literally zero — client manages their own calendar.

### Website Edit Request Workflow — Keeping Upkeep Minimal

Clients get 2 edits/month included. This needs a lightweight system so requests don't become a chaos of emails and DMs.

**MVP edit workflow (no code needed):**
1. Client submits a Google Form: "Business Name / What to Change / Before (current) / After (desired) / Urgency"
2. Form submissions go to a Google Sheet (automatic with Google Forms)
3. You check the sheet weekly or on notification
4. Since sites are static HTML re-rendered from Supabase data: most edits = update one field in Supabase → re-run template engine → re-upload HTML (10-15 minutes of work per edit)
5. Mark the edit as done in the sheet, notify client by email

**Edit counter:** Track `edits_used` per month in `client_sites` table. If they want a 3rd edit, that's an extra $49 (or included in the next tier). This is the upsell trigger.

**Common edit types and their actual work:**
- Phone number change: 5 min
- Add/remove a service: 5 min
- Update business hours: 5 min
- New section or structural change: 30-60 min (counts as 2 edits)
- New photos: they send files, you update template image references, 15 min

**Phase 3:** Build a simple client portal where they submit and track edits themselves. Until then, Google Form + Sheet is plenty.

### Upsell Feature Matrix

| # | Feature | Sell Price | Your Cost | Build (Phase) | Maintenance |
|---|---------|-----------|-----------|---------------|-------------|
| 1 | **AI Chat Widget** — 24/7 FAQ answering, quote guidance | $49/mo | ~$2/mo Claude | Phase 2 (2 wks) | Very low |
| 2 | **Booking Integration** — Calendly embed (client manages own calendar) | +$29/mo | $0 (Calendly free) | Phase 1 (4 hrs) | Zero — client-managed |
| 3 | **Review Request Automation** — SMS after each job | +$39/mo | ~$5/mo Twilio | Phase 2 (1 wk) | Very low |
| 4 | **New Lead SMS Alert** — text owner when form submitted | +$19/mo | ~$1/mo | Phase 1 (4 hrs) | Near-zero |
| 5 | **Monthly SEO + GMB Report** — auto-generated | +$29/mo | ~$0.50 Claude | Phase 2 (3 days) | Low |
| 6 | **Seasonal Email Campaigns** — 4 branded sends/year | +$29/mo | ~$1/mo | Phase 2 (2 days) | Low |
| 7 | **Google Business Profile Setup/Optimization** | $149 one-time | 1 hr labor | Phase 1 (upsell) | None |
| 8 | **Social Post Templates** — 8 posts/month, Claude-generated | +$29/mo | ~$0.50 Claude | Phase 2 | Low |
| 9 | **Competitor Alert** — monthly email if local competitor changes | +$19/mo | ~$0.20 | Phase 3 | Low |
| 10 | **2 Free Edits/Month** — included in base subscription | (bundled) | ~20 min avg labor | Phase 1 (Google Form) | Low |

### Recommended Starter Bundle

**"Complete Presence Package"** at launch:
- New website (fast, mobile, conversion-optimized)
- Booking button (Calendly — client manages their own availability)
- Lead alert SMS
- 2 edits/month via request form

**Price: $129–149/month** (vs a standalone site for $79)

**Phase 2 add-on:** Add AI chat + review automation → move to $179–199/month tier

This is a dramatically stronger offer than "website for $79/month." The margin is the same or better because Claude costs pennies.

---

## K. Detailed Phased Roadmap

### Phase 1: Working MVP (Target: 2 Weeks)

**Goal:** Working pipeline from city input → demo site → approved email in queue. Everything runs; outreach starts.

**Week 1 (Days 1-7): Pipeline Core**

| Day | Work |
|-----|------|
| 1 | Setup: Supabase project, schema deploy, Python project (`uv`), `.env`, Next.js scaffold |
| 2 | Lead ingestion: Google Places API adapter + Playwright self-scrape adapter + deduplication |
| 3 | Website analysis: Playwright runner (screenshots + HTML), PageSpeed API |
| 4 | Scoring: Claude vision scorer + prompt, score storage, tier assignment |
| 4 | Content extractor: Claude haiku extracts services/area/USPs from HTML |
| 5-6 | Template: Build housekeeping-v1 HTML/CSS template (conversion-focused design) |
| 7 | Demo generator: content upgrade (Claude) + Jinja2 render + Supabase Storage upload |

**Week 2 (Days 8-14): Outreach + Dashboard**

| Day | Work |
|-----|------|
| 8 | Contact extractor: parse website HTML for emails + extract from listing data |
| 8 | Email drafter: Claude writes personalized outreach + stores draft |
| 9 | Comparison page: before/after HTML page generator |
| 10-11 | Admin dashboard: lead browser + score inspector + demo preview + review queue |
| 12 | Resend integration: send on approve, CAN-SPAM footer |
| 13 | Integration test: run full pipeline on 20 real businesses, fix edge cases |
| 14 | Buffer + polish: broken site handling, error logging, send first real outreach |

**Parallel (starts Day 1):** Buy tradeeasehq.com. Set up DNS. Begin domain warm-up. This does not block any code.

---

### Phase 2: Revenue Features (Target: Month 2)

**Goal:** First clients signed. Add the upsells that close deals.

- Functional AI chat widget (Claude-backed, per-client config, JS embed)
- Calendly / booking form integration (real, not mockup)
- New lead SMS alert (Twilio, fires when contact form submitted)
- Review request automation (Twilio SMS, scheduled post-job)
- Email open/click tracking (Resend webhooks)
- Background job queue for pipeline (pg-boss or simple queue table)
- 2nd email template variant for A/B testing

---

### Phase 3: Scale (Target: Month 3-4)

**Goal:** System runs multiple cities/week with minimal manual work. Second niche (lawn care).

- Lawn care template + niche scoring variant
- Niche adapter system (template_id maps to niche config)
- Scheduled campaigns (auto-run for subscribed cities)
- Campaign analytics dashboard
- Monthly SEO report generator
- Client portal (view site, request edits, support)
- Multi-user dashboard (for VA/assistant to help run queue)

---

## L. Detailed Implementation Plan

### File Structure

```
LeadScraper_V1/
├── docs/
│   ├── PRODUCT_SPEC.md         ← This file
│   └── BUILD_PLAN.md           ← Task-level build plan
├── pipeline/                   ← Python backend
│   ├── pyproject.toml
│   ├── .env.example
│   ├── config.py
│   ├── db/
│   │   ├── client.py           ← Supabase Python client
│   │   └── schema.sql          ← Full schema
│   ├── ingestion/
│   │   ├── outscraper.py       ← API wrapper
│   │   └── deduplication.py
│   ├── analysis/
│   │   ├── playwright_runner.py  ← Screenshot + HTML
│   │   ├── pagespeed.py          ← PSI API
│   │   └── scorer.py             ← Claude vision scoring
│   ├── generation/
│   │   ├── template_engine.py    ← Jinja2 runner
│   │   ├── content_generator.py  ← Claude content gen
│   │   └── deploy.py             ← Vercel/Storage upload
│   ├── outreach/
│   │   ├── contact_extractor.py  ← Parse website/listing
│   │   ├── email_drafter.py      ← Claude email generation
│   │   └── comparison_builder.py ← Side-by-side page
│   ├── delivery/
│   │   └── resend_sender.py      ← Email send
│   └── run_campaign.py           ← Main orchestration script
├── dashboard/                  ← Next.js admin
│   ├── package.json
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            ← Dashboard home
│   │   ├── campaigns/
│   │   ├── leads/
│   │   ├── scores/
│   │   ├── demos/
│   │   └── outreach/           ← Review queue
│   ├── components/
│   │   ├── LeadTable.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── DemoPreview.tsx
│   │   ├── EmailEditor.tsx
│   │   └── ApprovalQueue.tsx
│   └── lib/
│       └── supabase.ts
├── templates/                  ← Demo site templates
│   └── housekeeping-v1/
│       ├── index.html          ← Jinja2 template
│       ├── styles.css
│       ├── script.js
│       └── template_spec.json  ← Injection field map
└── scripts/
    ├── seed_templates.py
    └── migrate.py
```

### Task Breakdown (Executable in Cursor)

#### Sprint 1: Foundation

- [ ] `pipeline/`: Init Python project with `uv` or `poetry`, install deps (playwright, supabase, anthropic, jinja2, httpx, pydantic)
- [ ] `pipeline/db/schema.sql`: Write and deploy full Supabase schema
- [ ] `pipeline/db/client.py`: Supabase Python client wrapper with typed query helpers
- [ ] `pipeline/config.py`: Pydantic settings model reading from `.env`
- [ ] `dashboard/`: Init Next.js 14 app with TypeScript, Tailwind, Supabase SSR client
- [ ] `dashboard/lib/supabase.ts`: Server + client Supabase helpers
- [ ] Deploy dashboard to Vercel, connect to Supabase project

#### Sprint 2: Lead Ingestion

- [ ] `pipeline/ingestion/outscraper.py`: API wrapper, typed return model, pagination handling
- [ ] `pipeline/ingestion/deduplication.py`: Check by `google_place_id`, return new-only
- [ ] `pipeline/run_campaign.py`: CLI script: `python run_campaign.py --city "Austin" --state TX --niche housekeeping`
- [ ] `dashboard/app/campaigns/`: Campaign creation form + list view
- [ ] `dashboard/app/leads/`: Lead table with filter by status, city, score tier

#### Sprint 3: Website Analysis

- [ ] `pipeline/analysis/playwright_runner.py`: Launch headless browser, capture desktop + mobile screenshots, extract HTML (limit to 50k chars), store to Supabase Storage
- [ ] `pipeline/analysis/pagespeed.py`: Call Google PSI API, return structured performance score
- [ ] `pipeline/analysis/scorer.py`: Assemble scoring prompt, call Claude claude-sonnet-4-6 with base64 screenshot + HTML excerpt, parse structured JSON response, validate scores sum correctly
- [ ] `pipeline/analysis/scoring_prompt.py`: The rubric prompt template (extracted for easy iteration)
- [ ] `dashboard/app/scores/`: Score inspector — shows screenshot thumbnail, score breakdown, tier badge, AI notes

#### Sprint 4: Demo Generation

- [ ] `templates/housekeeping-v1/index.html`: Full responsive Jinja2 template with injection variables documented
- [ ] `templates/housekeeping-v1/template_spec.json`: Field map: `{ "business_name": "required", "phone": "required", "city": "required", ... }`
- [ ] `pipeline/generation/template_engine.py`: Load template, inject data, return rendered HTML string
- [ ] `pipeline/generation/content_generator.py`: Claude generates `about_text`, `tagline`, `service_list`, `trust_statement` from business data
- [ ] `pipeline/generation/deploy.py`: Upload rendered HTML to Supabase Storage, return public URL; OR use Vercel API to create a preview deploy
- [ ] `dashboard/app/demos/`: Demo preview panel — iframe showing generated site + injection data summary

#### Sprint 5: Outreach Pipeline

- [ ] `pipeline/outreach/contact_extractor.py`: Parse business website for contact info (email regex, phone, contact page link); also extract from Google listing data
- [ ] `pipeline/outreach/email_drafter.py`: Claude generates personalized outreach email from: business name, score breakdown, demo URL, comparison URL, specific improvement callouts
- [ ] `pipeline/outreach/comparison_builder.py`: Generate a simple HTML comparison page (before/after screenshots + bullet points of improvements)
- [ ] `dashboard/app/outreach/`: Review queue UI — shows email draft with edit capability, approve/reject buttons, demo preview link, comparison preview link

#### Sprint 6: Delivery

- [ ] `pipeline/delivery/resend_sender.py`: Resend API wrapper, send from approved draft, update status + `sent_at`
- [ ] Add Resend webhook handler to dashboard for open/click tracking
- [ ] CAN-SPAM compliance: unsubscribe link, physical address footer in all emails
- [ ] `dashboard/app/outreach/approved/`: Approved queue with "Send Now" trigger per email

---

*End of Product Spec — Ready for review and approval before coding begins.*
