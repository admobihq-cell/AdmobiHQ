-- Safe additive migration: campaigns + campaign_creatives + customer_notifications
-- backing the Campaign/CampaignCreative/CustomerNotification Prisma models —
-- the advertiser campaign flow (brief, flight window, budget, creative upload)
-- with ops review, mirroring the driver profile-completion flow in
-- driver-profiles-additive.sql.
--
-- Linked to the CUSTOMER Clerk instance's user id, NOT the pre-existing
-- "customers" table (a dormant email-keyed scaffold with no campaigns), and
-- NOT the "leads" table, which is the unrelated marketing campaign-brief form.
--
-- Read/written by customer-authenticated /v1/customer/campaigns/* routes
-- (apps/api), and reviewed via ops-authenticated /v1/campaigns/* routes. Also
-- grants the new "campaigns" ops permission to the seeded Member role (see
-- ops-roles-additive.sql) so admins can access the review queue.
--
-- NOTE ON campaigns.status: it holds ONLY the review lifecycle (draft,
-- submitted, approved, rejected, changes_requested, cancelled). The flight
-- phase (scheduled / live / completed) is DERIVED from starts_on / ends_on at
-- read time in apps/api/lib/campaign-dto.ts — do not add a column for it, and
-- do not add supplier dispatch state here either (see the
-- "Supplier / screen-API seam" note in docs/shared/DATA-LAYER.md).
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:campaigns -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS campaigns (
  id                 SERIAL PRIMARY KEY,
  clerk_user_id      TEXT NOT NULL,
  name               TEXT NOT NULL,
  objective          TEXT,
  market             TEXT,
  corridors          TEXT,
  format             TEXT NOT NULL DEFAULT 'taxi_top',
  notes              TEXT,
  budget_kes         NUMERIC(12, 2),
  starts_on          DATE,
  ends_on            DATE,
  status             TEXT NOT NULL DEFAULT 'draft',
  submitted_at       TIMESTAMPTZ,
  reviewed_at        TIMESTAMPTZ,
  reviewed_by_email  TEXT,
  review_reason      TEXT,
  contact_name       TEXT,
  contact_email      TEXT,
  contact_phone      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS campaigns_clerk_user_id_created_at_idx ON campaigns (clerk_user_id, created_at);
CREATE INDEX IF NOT EXISTS campaigns_status_created_at_idx ON campaigns (status, created_at);
CREATE INDEX IF NOT EXISTS campaigns_starts_on_ends_on_idx ON campaigns (starts_on, ends_on);

-- Creative assets. Only PNG, JPG, GIF and MP4 are ever accepted (enforced in
-- the API, not here) — the supplier's LED player decodes nothing else.
-- width / height / duration_seconds are captured from the Cloudinary upload
-- response at write time because they are exactly what the supplier screen API
-- asks for; backfilling them would mean re-downloading every asset.
CREATE TABLE IF NOT EXISTS campaign_creatives (
  id                    SERIAL PRIMARY KEY,
  campaign_id           INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  resource_type         TEXT NOT NULL DEFAULT 'image',
  cloudinary_public_id  TEXT NOT NULL UNIQUE,
  content_type          TEXT NOT NULL,
  size_bytes            INTEGER NOT NULL,
  width                 INTEGER,
  height                INTEGER,
  duration_seconds      NUMERIC(8, 2),
  original_filename     TEXT,
  slot                  TEXT NOT NULL DEFAULT 'all',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS campaign_creatives_campaign_id_idx ON campaign_creatives (campaign_id);

-- Per-advertiser in-app notifications (campaign submitted / reviewed).
-- Field-for-field copy of driver_notifications plus href, so the driver inbox
-- plumbing can be copied wholesale.
CREATE TABLE IF NOT EXISTS customer_notifications (
  id             SERIAL PRIMARY KEY,
  clerk_user_id  TEXT NOT NULL,
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  href           TEXT,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customer_notifications_clerk_user_id_created_at_idx ON customer_notifications (clerk_user_id, created_at);

-- Grant the new "campaigns" ops permission to the seeded Member role, same as
-- every other permission it already has — admins narrow down from here, same
-- rationale as ops-roles-additive.sql.
UPDATE ops_roles
SET permissions = array_append(permissions, 'campaigns')
WHERE name = 'Member' AND NOT ('campaigns' = ANY(permissions));
