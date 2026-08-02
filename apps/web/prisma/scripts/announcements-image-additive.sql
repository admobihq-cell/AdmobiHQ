-- Safe additive migration: optional image support for announcement_broadcasts.
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:announcements-image -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

ALTER TABLE announcement_broadcasts ADD COLUMN IF NOT EXISTS image_url TEXT;
