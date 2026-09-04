-- Richer public-form fields (drivers, fleet, leads, media kit, waitlist).
-- Additive only — safe to run repeatedly. Neon DB is shared with n8n, so
-- this runs via `prisma db execute`, never `prisma migrate`.

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS vehicle_make_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year       text,
  ADD COLUMN IF NOT EXISTS vehicle_ownership  text,
  ADD COLUMN IF NOT EXISTS routes_areas       text,
  ADD COLUMN IF NOT EXISTS hours_per_day      text,
  ADD COLUMN IF NOT EXISTS platforms          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicant_message  text;

ALTER TABLE fleet_partners
  ADD COLUMN IF NOT EXISTS taxi_count       text,
  ADD COLUMN IF NOT EXISTS bike_count       text,
  ADD COLUMN IF NOT EXISTS operating_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ev_status        text;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS objective       text,
  ADD COLUMN IF NOT EXISTS industry        text,
  ADD COLUMN IF NOT EXISTS creative_status text,
  ADD COLUMN IF NOT EXISTS target_audience text;

ALTER TABLE media_kit_requests
  ADD COLUMN IF NOT EXISTS company  text,
  ADD COLUMN IF NOT EXISTS role     text,
  ADD COLUMN IF NOT EXISTS use_case text;

ALTER TABLE waitlist_entries
  ADD COLUMN IF NOT EXISTS name    text,
  ADD COLUMN IF NOT EXISTS persona text;
