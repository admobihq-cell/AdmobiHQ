-- AlterTable
ALTER TABLE "driver_profiles" ADD COLUMN     "payout_bank_code" TEXT,
ADD COLUMN     "paystack_recipient_code" TEXT;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "funded_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "driver_profile_id" INTEGER,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "fee_kes" DECIMAL(12,2),
ADD COLUMN     "initiated_by_email" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "transfer_code" TEXT;

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "campaign_id" INTEGER,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "reference" TEXT NOT NULL,
    "provider_tx_id" BIGINT,
    "amount_kes" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "channel" TEXT,
    "provider_fee_kes" DECIMAL(12,2),
    "paid_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "wallet_transaction_id" INTEGER,
    "raw_event" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "org_id" INTEGER NOT NULL,
    "amount_kes" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reference" TEXT NOT NULL,
    "provider_refund_id" TEXT,
    "wallet_transaction_id" INTEGER,
    "reason" TEXT NOT NULL,
    "created_by_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "payments_wallet_transaction_id_key" ON "payments"("wallet_transaction_id");

-- CreateIndex
CREATE INDEX "payments_org_id_created_at_idx" ON "payments"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_reference_key" ON "refunds"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_wallet_transaction_id_key" ON "refunds"("wallet_transaction_id");

-- CreateIndex
CREATE INDEX "refunds_org_id_created_at_idx" ON "refunds"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_reference_key" ON "payouts"("reference");

-- CreateIndex
CREATE INDEX "payouts_driver_profile_id_idx" ON "payouts"("driver_profile_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

