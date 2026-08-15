-- Baseline migration: generated from the schema.prisma that was already
-- live in every environment via `prisma db push` / the additive scripts in
-- prisma/scripts/. It is NOT meant to be executed against dev/staging/prod
-- as-is (those tables already exist) — it must be recorded as already
-- applied via `prisma migrate resolve --applied 20260815000000_baseline`
-- once per environment. See apps/web/prisma/README.md.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "contact_name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "phone" TEXT,
    "audience" TEXT NOT NULL,
    "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ad_formats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duration" TEXT,
    "budget_range" TEXT,
    "campaign_start_date" TIMESTAMP(3),
    "additional_info" TEXT,
    "status" TEXT DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_email" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_partners" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "primary_contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "fleet_types" TEXT[],
    "fleet_size" TEXT,
    "vehicles_active" TEXT,
    "notes" TEXT,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_email" TEXT,

    CONSTRAINT "fleet_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "vehicle_type" TEXT,
    "days_per_week" TEXT,
    "heard_about" TEXT,
    "status" TEXT DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_email" TEXT,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT DEFAULT 'homepage',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_email" TEXT,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_kit_requests" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_email" TEXT,

    CONSTRAINT "media_kit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_push_tokens" (
    "id" SERIAL NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "platform" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_push_tokens" (
    "id" SERIAL NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "platform" TEXT,
    "anonymous_device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_push_tokens" (
    "id" SERIAL NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "platform" TEXT,
    "anonymous_device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_broadcasts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'announcement',
    "image_url" TEXT,
    "sent_by_clerk_id" TEXT NOT NULL,
    "sent_by_email" TEXT NOT NULL,
    "target_apps" TEXT[] DEFAULT ARRAY['customer-mobile']::TEXT[],
    "target_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_email" TEXT,

    CONSTRAINT "announcement_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tickets" (
    "id" SERIAL NOT NULL,
    "ticket_id" TEXT,
    "expo_push_token" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "broadcast_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "clerk_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_cases" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "anonymous_device_id" TEXT,
    "access_token_hash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigned_to_clerk_id" TEXT,
    "assigned_to_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_identities" (
    "id" SERIAL NOT NULL,
    "contact_email" TEXT NOT NULL,
    "anonymous_device_id" TEXT,
    "access_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "author_type" TEXT NOT NULL,
    "author_email" TEXT,
    "author_clerk_id" TEXT,
    "body" TEXT NOT NULL,
    "internal_note" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_email" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ops_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_role_assignments" (
    "clerk_user_id" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_role_assignments_pkey" PRIMARY KEY ("clerk_user_id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" SERIAL NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "national_id_number" TEXT,
    "kra_pin" TEXT,
    "payout_method" TEXT,
    "payout_mpesa_msisdn" TEXT,
    "payout_bank_name" TEXT,
    "payout_bank_account" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_email" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "original_filename" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_notifications" (
    "id" SERIAL NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" SERIAL NOT NULL,
    "app" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_budget_range_idx" ON "leads"("budget_range");

-- CreateIndex
CREATE INDEX "leads_deleted_at_idx" ON "leads"("deleted_at");

-- CreateIndex
CREATE INDEX "fleet_partners_created_at_idx" ON "fleet_partners"("created_at");

-- CreateIndex
CREATE INDEX "fleet_partners_city_idx" ON "fleet_partners"("city");

-- CreateIndex
CREATE INDEX "fleet_partners_status_idx" ON "fleet_partners"("status");

-- CreateIndex
CREATE INDEX "fleet_partners_city_status_idx" ON "fleet_partners"("city", "status");

-- CreateIndex
CREATE INDEX "fleet_partners_deleted_at_idx" ON "fleet_partners"("deleted_at");

-- CreateIndex
CREATE INDEX "drivers_created_at_idx" ON "drivers"("created_at");

-- CreateIndex
CREATE INDEX "drivers_city_idx" ON "drivers"("city");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_vehicle_type_idx" ON "drivers"("vehicle_type");

-- CreateIndex
CREATE INDEX "drivers_city_status_idx" ON "drivers"("city", "status");

-- CreateIndex
CREATE INDEX "drivers_deleted_at_idx" ON "drivers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE INDEX "waitlist_entries_created_at_idx" ON "waitlist_entries"("created_at");

-- CreateIndex
CREATE INDEX "waitlist_entries_deleted_at_idx" ON "waitlist_entries"("deleted_at");

-- CreateIndex
CREATE INDEX "media_kit_requests_created_at_idx" ON "media_kit_requests"("created_at");

-- CreateIndex
CREATE INDEX "media_kit_requests_deleted_at_idx" ON "media_kit_requests"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "ops_push_tokens_expo_push_token_key" ON "ops_push_tokens"("expo_push_token");

-- CreateIndex
CREATE INDEX "ops_push_tokens_clerk_user_id_idx" ON "ops_push_tokens"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_push_tokens_expo_push_token_key" ON "customer_push_tokens"("expo_push_token");

-- CreateIndex
CREATE INDEX "customer_push_tokens_anonymous_device_id_idx" ON "customer_push_tokens"("anonymous_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_push_tokens_expo_push_token_key" ON "driver_push_tokens"("expo_push_token");

-- CreateIndex
CREATE INDEX "driver_push_tokens_anonymous_device_id_idx" ON "driver_push_tokens"("anonymous_device_id");

-- CreateIndex
CREATE INDEX "announcement_broadcasts_created_at_idx" ON "announcement_broadcasts"("created_at");

-- CreateIndex
CREATE INDEX "announcement_broadcasts_deleted_at_idx" ON "announcement_broadcasts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_tickets_ticket_id_key" ON "push_tickets"("ticket_id");

-- CreateIndex
CREATE INDEX "push_tickets_status_created_at_idx" ON "push_tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "push_tickets_broadcast_id_idx" ON "push_tickets"("broadcast_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_clerk_user_id_key" ON "customers"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_cases_access_token_hash_key" ON "support_cases"("access_token_hash");

-- CreateIndex
CREATE INDEX "support_cases_status_created_at_idx" ON "support_cases"("status", "created_at");

-- CreateIndex
CREATE INDEX "support_cases_contact_email_idx" ON "support_cases"("contact_email");

-- CreateIndex
CREATE INDEX "support_cases_assigned_to_clerk_id_idx" ON "support_cases"("assigned_to_clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_identities_contact_email_key" ON "support_identities"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "support_identities_access_token_hash_key" ON "support_identities"("access_token_hash");

-- CreateIndex
CREATE INDEX "support_messages_case_id_created_at_idx" ON "support_messages"("case_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ops_roles_name_key" ON "ops_roles"("name");

-- CreateIndex
CREATE INDEX "ops_role_assignments_role_id_idx" ON "ops_role_assignments"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_clerk_user_id_key" ON "driver_profiles"("clerk_user_id");

-- CreateIndex
CREATE INDEX "driver_profiles_status_created_at_idx" ON "driver_profiles"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "driver_documents_cloudinary_public_id_key" ON "driver_documents"("cloudinary_public_id");

-- CreateIndex
CREATE INDEX "driver_documents_profile_id_type_idx" ON "driver_documents"("profile_id", "type");

-- CreateIndex
CREATE INDEX "driver_notifications_clerk_user_id_created_at_idx" ON "driver_notifications"("clerk_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_created_at_idx" ON "audit_events"("entity_type", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_email_created_at_idx" ON "audit_events"("actor_email", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_app_created_at_idx" ON "audit_events"("app", "created_at");

-- AddForeignKey
ALTER TABLE "push_tickets" ADD CONSTRAINT "push_tickets_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "announcement_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_role_assignments" ADD CONSTRAINT "ops_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "ops_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

