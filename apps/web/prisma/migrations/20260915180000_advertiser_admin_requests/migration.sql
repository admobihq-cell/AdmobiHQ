-- CreateTable
CREATE TABLE IF NOT EXISTS "advertiser_admin_requests" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_clerk_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertiser_admin_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "advertiser_admin_requests_org_id_status_created_at_idx" ON "advertiser_admin_requests"("org_id", "status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "advertiser_admin_requests_clerk_user_id_idx" ON "advertiser_admin_requests"("clerk_user_id");

-- One open request per member per org. Partial unique indexes cannot be
-- expressed in Prisma's schema DSL, so this is hand-written.
CREATE UNIQUE INDEX IF NOT EXISTS "advertiser_admin_requests_one_pending_key"
  ON "advertiser_admin_requests"("org_id", "clerk_user_id")
  WHERE "status" = 'pending';

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "advertiser_admin_requests" ADD CONSTRAINT "advertiser_admin_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
