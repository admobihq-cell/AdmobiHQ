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

-- ops mobile: Expo push tokens for @admobihq.com staff alerts
CREATE TABLE IF NOT EXISTS ops_push_tokens (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  expo_push_token TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ops_push_tokens_expo_push_token_key UNIQUE (expo_push_token)
);

CREATE INDEX IF NOT EXISTS ops_push_tokens_clerk_user_id_idx ON ops_push_tokens (clerk_user_id);

-- customer mobile: anonymous Expo push tokens for broadcast announcements
CREATE TABLE IF NOT EXISTS customer_push_tokens (
  id SERIAL PRIMARY KEY,
  expo_push_token TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_push_tokens_expo_push_token_key UNIQUE (expo_push_token)
);

-- ops → customers: broadcast announcement send history
CREATE TABLE IF NOT EXISTS announcement_broadcasts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by_clerk_id TEXT NOT NULL,
  sent_by_email TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS announcement_broadcasts_created_at_idx ON announcement_broadcasts (created_at);
