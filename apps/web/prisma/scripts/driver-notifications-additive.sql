-- Safe additive migration: driver_notifications backing the
-- DriverNotification Prisma model — per-driver in-app notifications for the
-- driver profile-completion/approval flow (submitted, approved, rejected,
-- changes requested). Written by /v1/driver/profile/submit and
-- /v1/driver-applications/[id]/review (apps/api), read by
-- /v1/driver/notifications. Linked to the DRIVER Clerk instance's user id,
-- same as driver_profiles.
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:driver-notifications -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS driver_notifications (
  id            SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS driver_notifications_clerk_user_id_created_at_idx ON driver_notifications (clerk_user_id, created_at);
