-- AlterTable
ALTER TABLE "advertiser_orgs" ADD COLUMN IF NOT EXISTS "billing_email" TEXT;
ALTER TABLE "advertiser_orgs" ADD COLUMN IF NOT EXISTS "tax_pin" TEXT;

-- AlterTable
ALTER TABLE "customer_notifications" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_notifications_org_id_created_at_idx" ON "customer_notifications"("org_id", "created_at");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill: existing notices belong to the recipient's current org.
UPDATE "customer_notifications" n
SET "org_id" = m."org_id"
FROM "advertiser_members" m
WHERE n."org_id" IS NULL
  AND m."clerk_user_id" = n."clerk_user_id";
