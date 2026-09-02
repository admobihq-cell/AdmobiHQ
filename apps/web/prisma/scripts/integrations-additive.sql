-- Safe additive migration: integrations table backing the Integration Prisma
-- model — the internal register of every third-party tool / subscription the
-- platform pays for or depends on. Managed from ops → Settings → Integrations
-- (admin only), read/written directly via Prisma from apps/ops server actions.
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:integrations -w web            (dev)
--      or:            npm run db:integrations:prod -w web         (prod)
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS integrations (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'infrastructure',
  purpose          TEXT NOT NULL DEFAULT '',
  url              TEXT NOT NULL DEFAULT '',
  plan             TEXT NOT NULL DEFAULT '',
  cost             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'USD',
  billing_cycle    TEXT NOT NULL DEFAULT 'monthly',
  status           TEXT NOT NULL DEFAULT 'active',
  owner            TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_email TEXT
);

CREATE INDEX IF NOT EXISTS integrations_category_idx ON integrations (category);
CREATE INDEX IF NOT EXISTS integrations_status_idx ON integrations (status);
