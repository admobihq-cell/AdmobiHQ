-- Media Library backfill: gives every campaign creative that has no
-- media_asset_id yet a media_assets row owned by its campaign's org, then
-- links it. Idempotent — a re-run only touches rows still unlinked, so it is
-- safe (and expected) to run once before the new API deploys and once after.
--
-- One DO block on purpose: `prisma db execute` and the test suite both send
-- it as a single statement.
--
-- HOW TO RUN:
--   npm run db:media-library-backfill -w web         (dev/staging, .env.local)
--   npm run db:media-library-backfill:prod -w web    (prod, .env.production.local)
DO $$
BEGIN
  INSERT INTO "media_assets" (
    "org_id", "name", "resource_type", "cloudinary_public_id", "content_type",
    "size_bytes", "width", "height", "duration_seconds", "original_filename",
    "created_by_clerk_user_id", "created_at", "updated_at"
  )
  SELECT
    c."org_id",
    COALESCE(NULLIF(btrim(cc."original_filename"), ''), 'Creative ' || cc."id"),
    cc."resource_type",
    cc."cloudinary_public_id",
    cc."content_type",
    cc."size_bytes",
    cc."width",
    cc."height",
    cc."duration_seconds",
    cc."original_filename",
    c."clerk_user_id",
    cc."created_at",
    cc."created_at"
  FROM "campaign_creatives" cc
  JOIN "campaigns" c ON c."id" = cc."campaign_id"
  WHERE cc."media_asset_id" IS NULL
    AND cc."cloudinary_public_id" IS NOT NULL
  ON CONFLICT ("cloudinary_public_id") DO NOTHING;

  UPDATE "campaign_creatives" cc
  SET "media_asset_id" = ma."id"
  FROM "media_assets" ma
  WHERE cc."media_asset_id" IS NULL
    AND ma."cloudinary_public_id" = cc."cloudinary_public_id";
END $$;
