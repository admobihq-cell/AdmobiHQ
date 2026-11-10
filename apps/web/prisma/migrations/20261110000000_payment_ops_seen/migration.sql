-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "ops_seen_at" TIMESTAMP(3);

-- Payments that settled before the badge existed start out seen.
UPDATE "payments" SET "ops_seen_at" = COALESCE("paid_at", "updated_at") WHERE "status" = 'success';
