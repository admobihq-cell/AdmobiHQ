-- Safe additive migration: platform_flags table backing the PlatformFlag
-- Prisma model — ops-controlled visibility switches (e.g. showing the
-- Deliveries placeholder screens across customer-web, driver-web, and
-- driver-mobile before the real feature ships). Read by GET /v1/public/config
-- (no auth), written by GET/PATCH /v1/flags (Clerk ops JWT). See docs/DRIVER-APP.md.
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:platform-flags -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS platform_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_flags (key, enabled)
VALUES ('deliveries', FALSE)
ON CONFLICT (key) DO NOTHING;
