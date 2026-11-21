-- Billing documents: hand-written quotes and invoices (additive only).

-- CreateTable
CREATE TABLE "billing_documents" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "org_id" INTEGER,
    "campaign_id" INTEGER,
    "customer" JSONB NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "reference" TEXT,
    "lines" JSONB NOT NULL,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "fee_label" TEXT,
    "fee_kes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal_kes" DECIMAL(12,2) NOT NULL,
    "discount_kes" DECIMAL(12,2) NOT NULL,
    "tax_kes" DECIMAL(12,2) NOT NULL,
    "total_kes" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "payment_instructions" TEXT,
    "terms" TEXT,
    "source_quote_id" INTEGER,
    "sent_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_document_payments" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "amount_kes" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paid_on" DATE NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_document_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_document_counters" (
    "kind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "billing_document_counters_pkey" PRIMARY KEY ("kind","year")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_documents_number_key" ON "billing_documents"("number");

-- CreateIndex
CREATE UNIQUE INDEX "billing_documents_source_quote_id_key" ON "billing_documents"("source_quote_id");

-- CreateIndex
CREATE INDEX "billing_documents_org_id_issue_date_idx" ON "billing_documents"("org_id", "issue_date");

-- CreateIndex
CREATE INDEX "billing_documents_kind_status_idx" ON "billing_documents"("kind", "status");

-- CreateIndex
CREATE INDEX "billing_document_payments_document_id_idx" ON "billing_document_payments"("document_id");

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_document_payments" ADD CONSTRAINT "billing_document_payments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "billing_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

