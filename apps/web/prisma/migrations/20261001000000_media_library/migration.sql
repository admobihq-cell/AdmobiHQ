-- Media Library (expand step). Hand-written and idempotent, like the
-- advertiser-org migrations before it. Additive only: the API code still on
-- prod keeps working against this schema until the new code deploys.
-- The legacy file columns on campaign_creatives are dropped by a later
-- contract migration, once every row has a media_asset_id.

-- CreateTable
CREATE TABLE IF NOT EXISTS "media_assets" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER,
    "name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL DEFAULT 'image',
    "cloudinary_public_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" DECIMAL(8,2),
    "original_filename" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "source" TEXT NOT NULL DEFAULT 'upload',
    "created_by_clerk_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_cloudinary_public_id_key" ON "media_assets"("cloudinary_public_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_assets_org_id_created_at_idx" ON "media_assets"("org_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_assets_org_id_resource_type_idx" ON "media_assets"("org_id", "resource_type");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: the join column. Nullable until the contract migration, so the
-- old code's inserts (which don't know about it) keep working.
ALTER TABLE "campaign_creatives" ADD COLUMN IF NOT EXISTS "media_asset_id" INTEGER;

-- AlterTable: the new code no longer writes these, so they can't stay required.
ALTER TABLE "campaign_creatives" ALTER COLUMN "cloudinary_public_id" DROP NOT NULL;
ALTER TABLE "campaign_creatives" ALTER COLUMN "content_type" DROP NOT NULL;
ALTER TABLE "campaign_creatives" ALTER COLUMN "size_bytes" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_creatives_media_asset_id_idx" ON "campaign_creatives"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_creatives_campaign_id_media_asset_id_slot_key" ON "campaign_creatives"("campaign_id", "media_asset_id", "slot");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "campaign_creatives" ADD CONSTRAINT "campaign_creatives_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Grant the two new permissions to every role that can already upload
-- creative — starter roles (org_id IS NULL) and org-custom roles alike.
UPDATE "advertiser_roles"
SET "permissions" = array_append("permissions", 'media:read')
WHERE 'creatives:write' = ANY("permissions") AND NOT ('media:read' = ANY("permissions"));

UPDATE "advertiser_roles"
SET "permissions" = array_append("permissions", 'media:write')
WHERE 'creatives:write' = ANY("permissions") AND NOT ('media:write' = ANY("permissions"));
