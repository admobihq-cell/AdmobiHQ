-- Dashboard ledger, delivery stats, payouts and invoices. Generated with
-- prisma migrate diff (schema to schema). Additive only: six new tables.

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER,
    "campaign_id" INTEGER,
    "kind" TEXT NOT NULL,
    "amount_kes" DECIMAL(12,2) NOT NULL,
    "spend_category" TEXT,
    "provider" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_daily_stats" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "market" TEXT NOT NULL,
    "daypart" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "plays_scheduled" INTEGER NOT NULL DEFAULT 0,
    "plays_delivered" INTEGER NOT NULL DEFAULT 0,
    "plays_missed" INTEGER NOT NULL DEFAULT 0,
    "plays_over" INTEGER NOT NULL DEFAULT 0,
    "vehicle_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "distance_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active_vehicles" INTEGER NOT NULL DEFAULT 0,
    "impressions_low" INTEGER,
    "impressions_likely" INTEGER,
    "impressions_high" INTEGER,
    "source" TEXT NOT NULL,
    "model_version" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_creative_daily_stats" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "media_asset_id" INTEGER,
    "creative_name" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "plays_delivered" INTEGER NOT NULL DEFAULT 0,
    "impressions_likely" INTEGER,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_creative_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_reach_stats" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "as_of" DATE NOT NULL,
    "reach_low" INTEGER NOT NULL,
    "reach_likely" INTEGER NOT NULL,
    "reach_high" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "model_version" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_reach_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" SERIAL NOT NULL,
    "driver_id" INTEGER,
    "amount_kes" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mpesa_ref" TEXT,
    "period_month" DATE NOT NULL,
    "paid_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER,
    "campaign_id" INTEGER,
    "number" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "subtotal_kes" DECIMAL(12,2) NOT NULL,
    "tax_kes" DECIMAL(12,2) NOT NULL,
    "total_kes" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "issued_on" DATE NOT NULL,
    "due_on" DATE NOT NULL,
    "paid_at" TIMESTAMP(3),
    "lines" JSONB NOT NULL,
    "tax_invoice_ref" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");

-- CreateIndex
CREATE INDEX "wallet_transactions_org_id_occurred_at_idx" ON "wallet_transactions"("org_id", "occurred_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_occurred_at_idx" ON "wallet_transactions"("occurred_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_campaign_id_idx" ON "wallet_transactions"("campaign_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_is_demo_idx" ON "wallet_transactions"("is_demo");

-- CreateIndex
CREATE INDEX "campaign_daily_stats_day_idx" ON "campaign_daily_stats"("day");

-- CreateIndex
CREATE INDEX "campaign_daily_stats_market_day_idx" ON "campaign_daily_stats"("market", "day");

-- CreateIndex
CREATE INDEX "campaign_daily_stats_is_demo_idx" ON "campaign_daily_stats"("is_demo");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_daily_stats_campaign_id_day_market_daypart_format_key" ON "campaign_daily_stats"("campaign_id", "day", "market", "daypart", "format");

-- CreateIndex
CREATE INDEX "campaign_creative_daily_stats_campaign_id_day_idx" ON "campaign_creative_daily_stats"("campaign_id", "day");

-- CreateIndex
CREATE INDEX "campaign_creative_daily_stats_is_demo_idx" ON "campaign_creative_daily_stats"("is_demo");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_reach_stats_campaign_id_as_of_key" ON "campaign_reach_stats"("campaign_id", "as_of");

-- CreateIndex
CREATE INDEX "payouts_status_period_month_idx" ON "payouts"("status", "period_month");

-- CreateIndex
CREATE INDEX "payouts_driver_id_idx" ON "payouts"("driver_id");

-- CreateIndex
CREATE INDEX "payouts_is_demo_idx" ON "payouts"("is_demo");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_org_id_issued_on_idx" ON "invoices"("org_id", "issued_on");

-- CreateIndex
CREATE INDEX "invoices_is_demo_idx" ON "invoices"("is_demo");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_daily_stats" ADD CONSTRAINT "campaign_daily_stats_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creative_daily_stats" ADD CONSTRAINT "campaign_creative_daily_stats_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creative_daily_stats" ADD CONSTRAINT "campaign_creative_daily_stats_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_reach_stats" ADD CONSTRAINT "campaign_reach_stats_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
