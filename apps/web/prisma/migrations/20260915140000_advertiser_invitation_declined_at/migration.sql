-- AlterTable
ALTER TABLE "advertiser_invitations" ADD COLUMN IF NOT EXISTS "declined_at" TIMESTAMP(3);
