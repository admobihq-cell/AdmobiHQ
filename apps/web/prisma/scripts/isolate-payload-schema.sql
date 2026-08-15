-- ONE-TIME cutover — run once per environment (dev, staging, prod).
--
-- Moves every Payload/CMS table and enum type out of `public` and into a
-- dedicated `cms` schema. Prisma's migration engine only ever looks at
-- `public` (the schema on the connection string), so once this has run,
-- `prisma migrate` can no longer see — and can never propose dropping —
-- the blog/help/media tables. This is what unblocks a real
-- prisma/migrations folder; see payload.config.ts's `schemaName: "cms"`,
-- which must be deployed at the same time this script is run (the running
-- app briefly can't see its own tables between this script and that
-- deploy going live).
--
-- Safe to run multiple times: every statement is idempotent via IF EXISTS
-- / DO blocks, and it no-ops once the tables already live in `cms`.
--
-- Usage (see package.json "db:isolate-payload-schema"):
--   npm run db:isolate-payload-schema -w web                 (dev, .env.local)
--   npm run db:isolate-payload-schema:staging -w web         (staging)
--   npm run db:isolate-payload-schema:prod -w web             (prod — see README note on pulling PRODUCTION_DATABASE_URL)

BEGIN;

CREATE SCHEMA IF NOT EXISTS cms;

-- Tables (skipped individually if already moved / not yet created on this env)
ALTER TABLE IF EXISTS public.users_sessions SET SCHEMA cms;
ALTER TABLE IF EXISTS public.users SET SCHEMA cms;
ALTER TABLE IF EXISTS public.help_categories SET SCHEMA cms;
ALTER TABLE IF EXISTS public.help_articles SET SCHEMA cms;
ALTER TABLE IF EXISTS public._help_articles_v SET SCHEMA cms;
ALTER TABLE IF EXISTS public.payload_kv SET SCHEMA cms;
ALTER TABLE IF EXISTS public.payload_locked_documents SET SCHEMA cms;
ALTER TABLE IF EXISTS public.payload_locked_documents_rels SET SCHEMA cms;
ALTER TABLE IF EXISTS public.payload_preferences SET SCHEMA cms;
ALTER TABLE IF EXISTS public.payload_preferences_rels SET SCHEMA cms;
ALTER TABLE IF EXISTS public.payload_migrations SET SCHEMA cms;
ALTER TABLE IF EXISTS public.media SET SCHEMA cms;
ALTER TABLE IF EXISTS public.blog_posts SET SCHEMA cms;
ALTER TABLE IF EXISTS public._blog_posts_v SET SCHEMA cms;

-- Enum types — ALTER TYPE has no IF EXISTS for SET SCHEMA, so guard each
-- one with a catalog check instead.
DO $$
DECLARE
  enum_name text;
BEGIN
  FOREACH enum_name IN ARRAY ARRAY[
    'enum_help_categories_audience',
    'enum_help_articles_status',
    'enum__help_articles_v_version_status',
    'enum_blog_posts_topic',
    'enum_blog_posts_status',
    'enum__blog_posts_v_version_topic',
    'enum__blog_posts_v_version_status'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = enum_name AND n.nspname = 'public'
    ) THEN
      EXECUTE format('ALTER TYPE public.%I SET SCHEMA cms', enum_name);
    END IF;
  END LOOP;
END $$;

COMMIT;
