-- Safe additive migration: driver_profiles + driver_documents backing the
-- DriverProfile/DriverDocument Prisma models — the driver profile-completion
-- stepper (personal info, National ID, profile photo, KRA PIN, payout
-- details) with ops review. Linked to the DRIVER Clerk instance's user id,
-- NOT the pre-existing "drivers" table, which is an unrelated marketing
-- lead-capture form with no clerk_user_id.
--
-- Read/written by driver-authenticated /v1/driver/* routes (apps/api), and
-- reviewed via ops-authenticated /v1/driver-applications/* routes. Also
-- grants the new "driver_applications" ops permission to the seeded Member
-- role (see ops-roles-additive.sql) so admins can access the review queue.
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:driver-profiles -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS driver_profiles (
  id                   SERIAL PRIMARY KEY,
  clerk_user_id        TEXT NOT NULL UNIQUE,
  full_name            TEXT,
  phone                TEXT,
  city                 TEXT,
  national_id_number   TEXT,
  kra_pin              TEXT,
  payout_method        TEXT,
  payout_mpesa_msisdn  TEXT,
  payout_bank_name     TEXT,
  payout_bank_account  TEXT,
  status               TEXT NOT NULL DEFAULT 'draft',
  submitted_at         TIMESTAMPTZ,
  reviewed_at          TIMESTAMPTZ,
  reviewed_by_email    TEXT,
  rejection_reason     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS driver_profiles_status_created_at_idx ON driver_profiles (status, created_at);

CREATE TABLE IF NOT EXISTS driver_documents (
  id                    SERIAL PRIMARY KEY,
  profile_id            INTEGER NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL,
  cloudinary_public_id  TEXT NOT NULL UNIQUE,
  content_type          TEXT NOT NULL,
  size_bytes            INTEGER NOT NULL,
  original_filename     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS driver_documents_profile_type_idx ON driver_documents (profile_id, type);

-- Grant the new "driver_applications" ops permission to the seeded Member
-- role, same as every other permission it already has — admins narrow down
-- from here, same rationale as ops-roles-additive.sql.
UPDATE ops_roles
SET permissions = array_append(permissions, 'driver_applications')
WHERE name = 'Member' AND NOT ('driver_applications' = ANY(permissions));
