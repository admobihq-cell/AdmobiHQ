-- Safe additive migration for the support system (Prisma tables only).
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:support-schema -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

-- Dormant scaffold for real customer auth. Nullable everywhere it's
-- referenced; wiring up real auth later means populating clerk_user_id and
-- backfilling support_cases.customer_id by matching email.
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  clerk_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_email_key UNIQUE (email),
  CONSTRAINT customers_clerk_user_id_key UNIQUE (clerk_user_id)
);

CREATE TABLE IF NOT EXISTS support_cases (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers (id),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  anonymous_device_id TEXT,
  access_token_hash TEXT NOT NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to_clerk_id TEXT,
  assigned_to_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_cases_access_token_hash_key UNIQUE (access_token_hash)
);

CREATE INDEX IF NOT EXISTS support_cases_status_created_at_idx ON support_cases (status, created_at);
CREATE INDEX IF NOT EXISTS support_cases_contact_email_idx ON support_cases (contact_email);
CREATE INDEX IF NOT EXISTS support_cases_assigned_to_clerk_id_idx ON support_cases (assigned_to_clerk_id);

CREATE TABLE IF NOT EXISTS support_messages (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES support_cases (id) ON DELETE CASCADE,
  author_type TEXT NOT NULL,
  author_email TEXT,
  author_clerk_id TEXT,
  body TEXT NOT NULL,
  internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_messages_case_id_created_at_idx ON support_messages (case_id, created_at);

-- audit_events already exists (see ops-schema-additive.sql) and is schema-generic —
-- entity_type "support_case" needs no table change here.
