-- Partial unique index: protects starter-role names (org_id IS NULL) from
-- duplicates. The @@unique([org_id, name]) in schema.prisma does NOT do this
-- on its own because Postgres treats NULL as distinct in unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "advertiser_roles_starter_name_key" ON "advertiser_roles"("name") WHERE "org_id" IS NULL;
