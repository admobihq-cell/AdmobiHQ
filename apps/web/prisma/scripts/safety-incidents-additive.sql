-- Safe additive migration: safety_incidents + safety_incident_photos +
-- safety_incident_updates, backing the SafetyIncident / SafetyIncidentPhoto /
-- SafetyIncidentUpdate Prisma models — the driver SOS flow, with ops review on
-- both ops surfaces.
--
-- Linked to the DRIVER Clerk instance's user id, the same key
-- driver_profiles.clerk_user_id and driver_notifications.clerk_user_id use.
-- NOT related to support_cases: an SOS is a separate entity on purpose — it is
-- measured by acknowledgement latency, is only ever filed by an authenticated
-- driver, and must not sit in the helpdesk queue behind billing questions. See
-- docs/superpowers/specs/2026-09-06-driver-sos-safety-incidents-design.md.
--
-- NOTE ON LOCATION: reported_* is the snapshot taken at submit; last_* is
-- overwritten by foreground re-pings while the incident is open. There is
-- deliberately no ping-history table — ops sees the current pin move, not a
-- breadcrumb trail. Do not start appending rows here; if a trail is ever
-- needed it gets its own table.
--
-- Also grants the new "safety" ops permission to the seeded Member role, so
-- existing ops members can reach the queue without a manual edit in
-- Team -> Roles (see ops-roles-additive.sql).
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard -> SQL Editor -> paste this entire file -> Run
--   B) From repo root: npm run db:safety-incidents -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS safety_incidents (
  id                    SERIAL PRIMARY KEY,
  driver_clerk_user_id  TEXT NOT NULL,
  driver_name           TEXT,
  driver_phone          TEXT,
  type                  TEXT NOT NULL,
  severity              TEXT NOT NULL DEFAULT 'high',
  status                TEXT NOT NULL DEFAULT 'new',
  description           TEXT,
  reported_lat          DOUBLE PRECISION,
  reported_lng          DOUBLE PRECISION,
  reported_accuracy_m   INTEGER,
  last_lat              DOUBLE PRECISION,
  last_lng              DOUBLE PRECISION,
  last_location_at      TIMESTAMP(3),
  acknowledged_at       TIMESTAMP(3),
  acknowledged_by_email TEXT,
  resolved_at           TIMESTAMP(3),
  resolved_by_email     TEXT,
  resolution            TEXT,
  created_at            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS safety_incidents_status_created_at_idx
  ON safety_incidents (status, created_at);
CREATE INDEX IF NOT EXISTS safety_incidents_driver_created_at_idx
  ON safety_incidents (driver_clerk_user_id, created_at);

CREATE TABLE IF NOT EXISTS safety_incident_photos (
  id                   SERIAL PRIMARY KEY,
  incident_id          INTEGER NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  content_type         TEXT NOT NULL,
  size_bytes           INTEGER NOT NULL,
  created_at           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS safety_incident_photos_incident_id_idx
  ON safety_incident_photos (incident_id);

CREATE TABLE IF NOT EXISTS safety_incident_updates (
  id              SERIAL PRIMARY KEY,
  incident_id     INTEGER NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,
  author_type     TEXT NOT NULL,
  author_email    TEXT,
  author_clerk_id TEXT,
  body            TEXT NOT NULL,
  internal_note   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS safety_incident_updates_incident_created_at_idx
  ON safety_incident_updates (incident_id, created_at);

-- Grant the new permission to the seeded Member role so existing ops members
-- can reach the queue without a manual edit in Team -> Roles. Idempotent: the
-- NOT ... = ANY guard makes a second run a no-op rather than a duplicate.
UPDATE ops_roles
   SET permissions = array_append(permissions, 'safety')
 WHERE name = 'Member'
   AND NOT ('safety' = ANY(permissions));
