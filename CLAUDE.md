# LeadScraper V1 — Claude Context

## What This Is
Automated lead-gen + demo-site engine for local service businesses. Pipeline finds leads
(Google Places API), scores their websites (Claude vision), generates personalized demo
sites, drafts outreach emails. Human reviews and manually sends. Starting niche: housekeeping.

## Active Campaign
- City: Austin, TX | Niche: housekeeping | Template: housekeeping-v4
- Pipeline status: ingest + scoring + demo gen + outreach drafting complete. v4 template active. SEO checker, AI chat, and clients dashboard are built.

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
| Outreach send route *(use as API route pattern)* | dashboard/app/api/outreach/[id]/send/route.ts |
| Chat API | dashboard/app/api/chat/route.ts |
| Clients dashboard | dashboard/app/clients/ |

## Active Templates
- **housekeeping-v4** — current default (premium full-bleed, 12 sections, AI chat, SEO built in)
- v1/v2/v3 — deprecated, do not edit

## Critical Rules
- NEVER auto-send email — always human approval via dashboard
- NEVER scrape Google directly — LeadSourceAdapter handles source switching
- CSS and JS are INLINED at render time by template_engine.py — editing styles.css
  in a deployed demo has no effect. Edit the template source files, then re-render.
- template_engine.render() just needs the template directory to exist — no DB registration needed
- Always use pipeline/db/client.py helpers for Supabase — never raw calls
- Lead quality threshold: only build demos for lead_quality_score >= 40 (implemented in pipeline/analysis/lead_qualifier.py)
- Franchise signals (Molly Maid, Merry Maids, etc.) are hard-disqualified — never target

## Env Vars (set in .env and Vercel)
SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY,
RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME, PHYSICAL_ADDRESS,
ADMIN_SESSION_SECRET, VERCEL_API_TOKEN, VERCEL_TEAM_ID (optional),
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, DASHBOARD_URL

## Feature Area → Files Map
- **AI chat:** dashboard/app/api/chat/route.ts + client_sites.ai_agent_config in schema
- **Demos:** pipeline/generation/ (template_engine, content_upgrader, storage_deploy, photos)
- **Scoring + qualification:** pipeline/analysis/ (scorer, content_extractor, seo_checker)
- **Outreach:** pipeline/outreach/ (email_drafter, comparison_builder, contact_extractor)
- **Post-sale:** dashboard/app/clients/ + dashboard/app/api/clients/[id]/deploy/route.ts

## Pitch Tiers (set by lead quality scorer)
- **standard** — site needs improvement, pitch full upgrade
- **feature_pitch** — site score ≥ 75, pitch bundle features + two-offer (upgrade OR add-on)
- **disqualified** — franchise/no-phone/off-niche, never contact

## Memory Files
See .claude/projects/-Users-benwitt-LeadScraper-V1/memory/ for project memory.
Update relevant memory files when key decisions change (template version, pricing, new gotchas).
