-- Safe additive migration: driver-mobile push tokens + app targeting on announcements.
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:driver-push-and-targeting -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS driver_push_tokens (
  id SERIAL PRIMARY KEY,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT,
  anonymous_device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_push_tokens_anonymous_device_id_idx ON driver_push_tokens (anonymous_device_id);

ALTER TABLE announcement_broadcasts
  ADD COLUMN IF NOT EXISTS target_apps TEXT[] NOT NULL DEFAULT ARRAY['customer-mobile'];
