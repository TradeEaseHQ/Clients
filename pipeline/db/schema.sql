-- ============================================================
-- LeadScraper V1 — Supabase Schema
-- Run this in Supabase SQL Editor to initialize the database
-- ============================================================

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
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
  source            TEXT DEFAULT 'google_places',  -- google_places | self_scrape | manual
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
CREATE TABLE IF NOT EXISTS website_analyses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID REFERENCES businesses(id) ON DELETE CASCADE,
  analyzed_url            TEXT,
  screenshot_desktop_url  TEXT,   -- Supabase Storage URL
  screenshot_mobile_url   TEXT,
  page_html               TEXT,   -- truncated to ~50k chars
  pagespeed_score         INT,    -- 0-100 from Google PSI API
  -- Rubric component scores (100-pt total)
  visual_score            INT,    -- 0-15
  mobile_score            INT,    -- 0-15
  trust_score             INT,    -- 0-15
  cta_score               INT,    -- 0-15
  service_clarity_score   INT,    -- 0-10
  contact_friction_score  INT,    -- 0-10
  speed_score             INT,    -- 0-5 (derived from pagespeed_score)
  review_usage_score      INT,    -- 0-5
  quote_flow_score        INT,    -- 0-5
  professionalism_score   INT,    -- 0-5
  total_score             INT,    -- computed sum
  priority_tier           TEXT,   -- skip_remake | candidate | high_priority | no_site
  ai_analysis_notes       TEXT,   -- Claude's reasoning
  top_3_weaknesses        JSONB,  -- array of weakness strings
  raw_scores_json         JSONB,  -- full structured output from Claude
  error                   TEXT,   -- if analysis failed
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche         TEXT NOT NULL DEFAULT 'housekeeping',
  name          TEXT NOT NULL,
  description   TEXT,
  template_path TEXT,  -- path in /templates dir (e.g. housekeeping-v1)
  preview_url   TEXT,
  is_active     BOOL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the initial template
INSERT INTO templates (niche, name, description, template_path)
VALUES ('housekeeping', 'Housekeeping V1', 'Clean, conversion-focused template for housekeeping businesses', 'housekeeping-v1')
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEMO SITES
-- ============================================================
CREATE TABLE IF NOT EXISTS demo_sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES templates(id),
  preview_url     TEXT,             -- hosted URL of the demo
  generated_html  TEXT,             -- full rendered HTML
  storage_path    TEXT,             -- path in Supabase Storage
  injection_data  JSONB,            -- all variables injected into template
  ai_content      JSONB,            -- Claude-generated: about, taglines, services copy
  status          TEXT DEFAULT 'generating',  -- generating | ready | published | archived
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
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
CREATE TABLE IF NOT EXISTS outreach_drafts (
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
CREATE TABLE IF NOT EXISTS campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  niche         TEXT NOT NULL DEFAULT 'housekeeping',
  city          TEXT,
  state         TEXT,
  status        TEXT DEFAULT 'active',  -- active | paused | complete
  leads_count   INT DEFAULT 0,
  search_query  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_businesses (
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, business_id)
);

-- ============================================================
-- CLIENT SITES (post-sale)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_sites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES businesses(id),
  domain              TEXT,
  hosting_status      TEXT DEFAULT 'pending',  -- pending | live | suspended
  plan                TEXT DEFAULT 'basic',    -- basic | pro | ai_agent
  monthly_fee         DECIMAL(8,2),
  ai_agent_enabled    BOOL DEFAULT FALSE,
  ai_agent_config     JSONB,
  onboarding_data     JSONB,                        -- Tally form responses from client
  change_requests     JSONB DEFAULT '[]'::jsonb,    -- log of change requests
  vercel_project_id   TEXT,                         -- Vercel project ID after first deploy
  vercel_deployment_url TEXT,                       -- URL of latest Vercel deployment
  notes               TEXT,                         -- internal notes
  live_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_niche ON businesses(niche);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city, state);
CREATE INDEX IF NOT EXISTS idx_website_analyses_business ON website_analyses(business_id);
CREATE INDEX IF NOT EXISTS idx_website_analyses_tier ON website_analyses(priority_tier);
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_status ON outreach_drafts(status);
CREATE INDEX IF NOT EXISTS idx_demo_sites_business ON demo_sites(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_business ON contacts(business_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MIGRATIONS — client_sites post-sale workflow columns
-- Safe to re-run (IF NOT EXISTS guard)
-- ============================================================
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS change_requests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS vercel_project_id TEXT;
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT;
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS quote_form_action TEXT; -- Formspree endpoint, e.g. https://formspree.io/f/XXXX

-- ============================================================
-- Storage buckets (run separately in Supabase dashboard or via API)
-- ============================================================
-- bucket: screenshots  (public: false)
-- bucket: demos        (public: true)
-- bucket: comparisons  (public: true)

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
