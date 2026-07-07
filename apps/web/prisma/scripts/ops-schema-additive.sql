-- Safe additive migration for ops console (Prisma tables only).
-- Does NOT touch Payload tables (blog_posts, help_articles, media, etc.).
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:ops-schema -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS tables).
-- leads: new columns from campaign form + ops status
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_name TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_formats TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- drivers: internal ops notes
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS notes TEXT;

-- waitlist (was log-only before)
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'homepage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT waitlist_entries_email_key UNIQUE (email)
);

-- media kit requests (was log-only before)
CREATE TABLE IF NOT EXISTS media_kit_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
