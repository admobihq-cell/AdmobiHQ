-- Safe additive migration for the cross-app audit fix pass (2026-08-03):
--   1. Soft-delete columns on leads/fleet/drivers/waitlist/media-kit
--      (matches the existing announcement_broadcasts soft-delete pattern).
--   2. support_identities — email-level identity token so "list my cases"
--      no longer trusts a bare email query param.
--   3. anonymous_device_id on customer_push_tokens, so push tokens can be
--      tied to the same per-device identity used for support cases.
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:audit-fixes -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

-- 1. Soft delete
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_by_email TEXT;
CREATE INDEX IF NOT EXISTS leads_deleted_at_idx ON leads (deleted_at);

ALTER TABLE fleet_partners ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE fleet_partners ADD COLUMN IF NOT EXISTS deleted_by_email TEXT;
CREATE INDEX IF NOT EXISTS fleet_partners_deleted_at_idx ON fleet_partners (deleted_at);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_by_email TEXT;
CREATE INDEX IF NOT EXISTS drivers_deleted_at_idx ON drivers (deleted_at);

ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS deleted_by_email TEXT;
CREATE INDEX IF NOT EXISTS waitlist_entries_deleted_at_idx ON waitlist_entries (deleted_at);

ALTER TABLE media_kit_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE media_kit_requests ADD COLUMN IF NOT EXISTS deleted_by_email TEXT;
CREATE INDEX IF NOT EXISTS media_kit_requests_deleted_at_idx ON media_kit_requests (deleted_at);

-- 2. Support identity token
CREATE TABLE IF NOT EXISTS support_identities (
  id SERIAL PRIMARY KEY,
  contact_email TEXT NOT NULL,
  anonymous_device_id TEXT,
  access_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_identities_contact_email_key UNIQUE (contact_email),
  CONSTRAINT support_identities_access_token_hash_key UNIQUE (access_token_hash)
);

-- 3. Push-token device identity
ALTER TABLE customer_push_tokens ADD COLUMN IF NOT EXISTS anonymous_device_id TEXT;
CREATE INDEX IF NOT EXISTS customer_push_tokens_anonymous_device_id_idx ON customer_push_tokens (anonymous_device_id);
