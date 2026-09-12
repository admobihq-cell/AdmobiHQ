
-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "org_id" INTEGER;

-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN     "org_id" INTEGER;

-- CreateTable
CREATE TABLE "advertiser_orgs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertiser_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertiser_roles" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER,
    "name" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advertiser_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertiser_members" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "role_id" INTEGER,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertiser_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertiser_invitations" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "role_id" INTEGER,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "invited_by_clerk_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advertiser_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advertiser_roles_org_id_name_key" ON "advertiser_roles"("org_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "advertiser_members_clerk_user_id_key" ON "advertiser_members"("clerk_user_id");

-- CreateIndex
CREATE INDEX "advertiser_members_org_id_idx" ON "advertiser_members"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "advertiser_invitations_token_hash_key" ON "advertiser_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "advertiser_invitations_email_idx" ON "advertiser_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "advertiser_invitations_org_id_email_key" ON "advertiser_invitations"("org_id", "email");

-- CreateIndex
CREATE INDEX "campaigns_org_id_created_at_idx" ON "campaigns"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_org_id_created_at_idx" ON "audit_events"("org_id", "created_at");

-- AddForeignKey
ALTER TABLE "advertiser_roles" ADD CONSTRAINT "advertiser_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertiser_members" ADD CONSTRAINT "advertiser_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertiser_members" ADD CONSTRAINT "advertiser_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "advertiser_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertiser_invitations" ADD CONSTRAINT "advertiser_invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Partial unique index: protects starter-role names (org_id IS NULL) from
-- duplicates. The @@unique([org_id, name]) in schema.prisma does NOT do this
-- on its own because Postgres treats NULL as distinct in unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "advertiser_roles_starter_name_key" ON "advertiser_roles"("name") WHERE "org_id" IS NULL;
