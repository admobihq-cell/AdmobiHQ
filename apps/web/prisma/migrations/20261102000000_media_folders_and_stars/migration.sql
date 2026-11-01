-- Media Manager folders and stars. Hand-written and idempotent, like the
-- media library migration before it. Additive only.

-- CreateTable
CREATE TABLE IF NOT EXISTS "media_folders" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_by_clerk_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "media_folders_org_id_name_key" ON "media_folders"("org_id", "name");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "folder_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_assets_folder_id_idx" ON "media_assets"("folder_id");

-- AddForeignKey: deleting a folder leaves its files in the library.
DO $$ BEGIN
  ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "media_asset_stars" (
    "media_asset_id" INTEGER NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_asset_stars_pkey" PRIMARY KEY ("media_asset_id", "clerk_user_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_asset_stars_clerk_user_id_idx" ON "media_asset_stars"("clerk_user_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "media_asset_stars" ADD CONSTRAINT "media_asset_stars_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
