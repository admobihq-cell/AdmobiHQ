-- AlterTable
ALTER TABLE "customer_push_tokens" ADD COLUMN     "clerk_user_id" TEXT;

-- AlterTable
ALTER TABLE "driver_push_tokens" ADD COLUMN     "clerk_user_id" TEXT;

-- AlterTable
ALTER TABLE "support_cases" ADD COLUMN     "driver_clerk_user_id" TEXT;

-- CreateTable
CREATE TABLE "announcement_deliveries" (
    "id" SERIAL NOT NULL,
    "broadcast_id" INTEGER NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "category" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_deliveries_clerk_user_id_app_created_at_idx" ON "announcement_deliveries"("clerk_user_id", "app", "created_at");

-- CreateIndex
CREATE INDEX "announcement_deliveries_broadcast_id_idx" ON "announcement_deliveries"("broadcast_id");

-- CreateIndex
CREATE INDEX "customer_push_tokens_clerk_user_id_idx" ON "customer_push_tokens"("clerk_user_id");

-- CreateIndex
CREATE INDEX "driver_push_tokens_clerk_user_id_idx" ON "driver_push_tokens"("clerk_user_id");

-- CreateIndex
CREATE INDEX "support_cases_driver_clerk_user_id_idx" ON "support_cases"("driver_clerk_user_id");

-- AddForeignKey
ALTER TABLE "announcement_deliveries" ADD CONSTRAINT "announcement_deliveries_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "announcement_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
