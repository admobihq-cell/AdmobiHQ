-- Safe additive migration: ops_roles / ops_role_assignments backing the
-- OpsRole / OpsRoleAssignment Prisma models — per-section RBAC for the ops
-- console. Clerk org:admin bypasses this entirely (always full access);
-- org:member users are assigned one of these roles. See apps/ops/lib/auth.ts
-- and apps/api/lib/auth.ts (resolveOpsPermissions).
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:ops-roles -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS ops_roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ops_roles_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS ops_role_assignments (
  clerk_user_id TEXT PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES ops_roles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ops_role_assignments_role_id_idx ON ops_role_assignments (role_id);

-- Seeded with every current permission so nobody who already has ops member
-- access loses anything the moment this ships — admins narrow down from here.
INSERT INTO ops_roles (name, permissions) VALUES
  ('Member', ARRAY['leads','fleet','drivers','waitlist','media_kit','announcements','support','finances','content','flags','activity'])
ON CONFLICT (name) DO NOTHING;
