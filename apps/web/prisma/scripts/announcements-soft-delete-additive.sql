-- Safe additive migration: soft-delete support for announcement_broadcasts.
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:announcements-soft-delete -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

ALTER TABLE announcement_broadcasts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE announcement_broadcasts ADD COLUMN IF NOT EXISTS deleted_by_email TEXT;

CREATE INDEX IF NOT EXISTS announcement_broadcasts_deleted_at_idx ON announcement_broadcasts (deleted_at);
