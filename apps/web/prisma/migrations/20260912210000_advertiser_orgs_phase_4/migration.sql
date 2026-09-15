-- AlterTable
ALTER TABLE "advertiser_members" ADD COLUMN IF NOT EXISTS "removed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "advertiser_members_org_id_removed_at_idx" ON "advertiser_members"("org_id", "removed_at");

-- AlterTable
ALTER TABLE "support_cases" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_cases_org_id_created_at_idx" ON "support_cases"("org_id", "created_at");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
