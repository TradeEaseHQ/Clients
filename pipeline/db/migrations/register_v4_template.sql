-- ============================================================
-- Register housekeeping-v4 template
-- ============================================================
-- HOW TO RUN:
--   1. Open Supabase dashboard → SQL Editor
--   2. Paste and run this entire file
--   3. Confirm the SELECT at the bottom shows housekeeping-v4 as active
--   4. Then run Austin demo regeneration (see commands below)
--
-- REGENERATION COMMANDS (run from repo root after applying this SQL):
--   python pipeline/reset_demos.py --city "Austin" --state TX
--   python run_campaign.py --city "Austin" --state TX --niche housekeeping --steps demo,outreach
-- ============================================================

-- Step 1: Deactivate all existing housekeeping templates
UPDATE templates
SET is_active = false
WHERE niche = 'housekeeping';

-- Step 2: Check whether housekeeping-v4 is already registered
-- If the row count below is 0, the INSERT will add it.
-- If it's already there, the UPDATE in Step 3 will reactivate + update it.

-- Step 3: Insert v4 if not already present, or update if it is.
-- NOTE: templates has no UNIQUE constraint on template_path, so we use
-- a conditional INSERT. Safe to run multiple times — the WHERE NOT EXISTS
-- guard prevents duplicate rows.
INSERT INTO templates (niche, name, description, template_path, is_active)
SELECT
  'housekeeping',
  'Housekeeping v4 - Premium Full-Bleed',
  'Three-breakpoint mobile-first layout. Brand-adaptive hero with color overlay. SEO built in (JSON-LD, meta, OG). Live AI chat widget. 12 sections.',
  'housekeeping-v4',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM templates WHERE template_path = 'housekeeping-v4'
);

-- If v4 row already existed (from a prior run), reactivate and refresh its metadata:
UPDATE templates
SET
  is_active    = true,
  name         = 'Housekeeping v4 - Premium Full-Bleed',
  description  = 'Three-breakpoint mobile-first layout. Brand-adaptive hero with color overlay. SEO built in (JSON-LD, meta, OG). Live AI chat widget. 12 sections.'
WHERE template_path = 'housekeeping-v4';

-- ============================================================
-- Verify — run this after and confirm is_active = true for v4
-- ============================================================
SELECT id, niche, name, template_path, is_active, created_at
FROM templates
WHERE niche = 'housekeeping'
ORDER BY created_at;
