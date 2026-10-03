# Media Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each advertiser org a reusable Media Library: upload a creative once, attach it to any number of campaigns, and browse, rename and delete files independently of any campaign.

**Architecture:** The file moves out of `CampaignCreative` into a new org-owned `MediaAsset`; `CampaignCreative` shrinks to a join row (`campaign_id` + `media_asset_id` + `slot`). The wire shape of a campaign's creative (`CampaignCreativeDto`) stays flat and only gains two fields, so ops, ops-mobile and customer-mobile keep working untouched. The database change ships as expand → backfill → deploy → backfill → contract, because the repo's deploy rule is "migrate first, and the code still on prod must keep working".

**Tech Stack:** Next.js App Router (`apps/api`, `apps/customer-web`), Prisma 7 with hand-written SQL migrations (`apps/web/prisma`), Cloudinary authenticated delivery via `apps/api/lib/private-media.ts`, Zod contracts in `packages/ops-contracts`, TanStack Query v5, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-22-media-library-design.md](../specs/2026-09-22-media-library-design.md)

## Where this plan departs from the spec

Each of these is deliberate. Task 9 records them as a dated addendum on the spec.

1. **`MediaAsset.org_id` is nullable with `onDelete: SetNull`**, not required with `Cascade`. The spec's `Cascade` on the org plus `Restrict` on the attachment makes org deletion fail outright whenever a campaign still uses a file (confirmed by running it). It also cannot represent creatives on campaigns that already have `org_id = null`. Org deletion already *detaches* campaigns for the ops record; their creatives have to stay viewable.
2. **Two migrations, not one.** `docs/shared/DEPLOYMENT.md` requires migrations to be additive so prod code keeps working until the deploy lands. The first migration only adds; a re-runnable backfill script links existing rows; a later contract migration drops the old columns.
3. **Existing files stay at `campaign-creatives/{campaignId}/…`** in Cloudinary. Only new uploads go to `media/{orgId}/…`. The folder is cosmetic.
4. **An inline campaign upload that fails the panel-shape check is rejected entirely** (upload rolled back, nothing kept in the library), as today.
5. **Mobile library screens are not in this plan.** `apps/customer-mobile` keeps working unchanged (its inline upload path and DTO are backward compatible) and gets its own plan. Only its permission-label map is touched, because the type requires it.
6. **Deleting an org deletes its unused library files** and keeps in-use ones without an owner.
7. **The two new permissions are granted in the migration SQL** to every role that already holds `creatives:write`, including org-custom roles, so no seed re-run is needed.

## Global Constraints

- **Formats and limits come from `@workspace/ops-contracts`** — `CREATIVE_MIME_TYPES` (PNG, JPG, GIF, MP4 only), `MAX_CREATIVE_BYTES` (50 MB), `MAX_CREATIVES_PER_CAMPAIGN` (6). Never retype them.
- **`cloudinary_public_id` never reaches a client.** API responses expose only DB row ids; bytes are served only through the `…/file` proxy routes.
- **Cross-org access answers 404, never 403**, on every media route — same rule as campaigns.
- **Every upload uses Cloudinary `type: "authenticated"`** via `lib/private-media.ts`. Do not add a second storage path.
- **New Cloudinary ids are `media/{orgId}/{uuid}`.**
- **Migrations are hand-written, idempotent SQL** applied with `prisma migrate deploy`. Do **not** run `prisma migrate dev` or `prisma db push`: the campaign tables were created by an additive script and are absent from migration history, so `migrate dev`'s shadow database cannot replay it.
- **No transcoding, no async pipeline.** Uploads stay synchronous.
- **Git:** work on branch `feat/media-library`. Stage files by explicit path (never `git add -A` / `git add .` — another agent may share this working tree, and `docs/superpowers/plans/2026-09-24-audience-index-phase-1.md` is not ours). No `Co-Authored-By` trailer and no "Generated with" line, per `CLAUDE.md`.
- **Tests that need the database skip when no `DATABASE_URL` is found** (CI). Run them locally after `npm run env:pull`.

## Review Focus

Inputs the spec does not mention that a real user will hit. Each has a test in the task named.

1. **Empty file, or a request body that is not a multipart form** → `400` with a readable message, not a `500`. (Task 4)
2. **Cloudinary upload fails** → `502`, and no `MediaAsset` row is left behind. (Task 4)
3. **Same file attached twice to one campaign** (double click) → `409`, not a duplicate and not a `500`. (Task 5)
4. **Deleting an org that owns library files** → succeeds; unused files are destroyed; files a detached campaign still uses remain viewable by ops. (Task 6)
5. **A solo org whose only content is library files** is not "untouched", so accepting an invitation does not silently delete it. (Task 6)

Also covered: a filename longer than 120 characters (Task 3), and a creative uploaded by the old API during the deploy window (Task 2, re-runnable backfill).

## File Structure

| File | Responsibility |
|---|---|
| `packages/ops-contracts/src/enums.ts` | `media:read` / `media:write` permissions, starter roles, `media_asset` audit entity |
| `packages/ops-contracts/src/types.ts` | `MediaAssetDto`; two new fields on `CampaignCreativeDto` |
| `packages/ops-contracts/src/schemas.ts` | `campaignCreativeAttachSchema`, `mediaAssetRenameSchema`, `MEDIA_ASSET_NAME_MAX` |
| `apps/web/prisma/migrations/20261001000000_media_library/migration.sql` (new) | Expand step: `media_assets`, `campaign_creatives.media_asset_id`, permission grant |
| `apps/web/prisma/scripts/media-library-backfill.sql` (new) | Re-runnable link of existing creatives to new assets |
| `apps/web/prisma/schema.prisma` | `MediaAsset` model; `CampaignCreative` as a join row |
| `apps/api/lib/campaign-creative-storage.ts` | Cloudinary id builder becomes org-centric |
| `apps/api/lib/media-asset-store.ts` (new) | Upload gate, asset row shape, org-scoped lookup, DTO mapper |
| `apps/api/lib/campaign-store.ts`, `campaign-dto.ts` | Campaign reads include each creative's asset |
| `apps/api/app/v1/customer/media/**` (new) | Library list, upload, rename, delete, file proxy |
| `apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts` | Inline upload lands in library; attach by `mediaAssetId` |
| `apps/api/lib/advertiser-org.ts` | Org deletion and "untouched org" account for library files |
| `apps/customer-web/lib/media-client.ts`, `use-media.ts` (new) | Library HTTP client and query hooks |
| `apps/customer-web/components/media/*` (new) | `BlobPreview`, `MediaGrid` (manage + select modes), `MediaLibraryView` |
| `apps/customer-web/app/(shell)/media/*` (new) | The Media page |
| `apps/customer-web/components/campaigns/creative-upload-field.tsx` | "Browse media library" picker |

---

### Task 1: Contracts — permissions, DTO, schemas

**Files:**
- Modify: `packages/ops-contracts/src/enums.ts`
- Modify: `packages/ops-contracts/src/types.ts`
- Modify: `packages/ops-contracts/src/schemas.ts`
- Modify: `apps/customer-web/components/settings/roles-settings-view.tsx` (`PERMISSION_LABELS`)
- Modify: `apps/customer-mobile/app/(tabs)/settings/roles.tsx` (`PERMISSION_LABELS`)
- Test: `packages/ops-contracts/src/enums.test.ts`, `packages/ops-contracts/src/contracts.test.ts`

**Interfaces:**
- Produces: `AdvertiserPermission` now includes `"media:read" | "media:write"`; `AuditEntityType` includes `"media_asset"`; `MediaAssetDto`; `MEDIA_ASSET_NAME_MAX = 120`; `mediaAssetRenameSchema` (`{ name }`); `campaignCreativeAttachSchema` (`{ mediaAssetId, slot }`, slot defaults to `"all"`).

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/media-library
```

- [ ] **Step 2: Write the failing tests**

In `packages/ops-contracts/src/enums.test.ts`, add inside the existing `describe`:

```ts
  it("lets Members use the media library — they already upload creative", () => {
    expect(ADVERTISER_STARTER_ROLES.Member).toContain("media:read")
    expect(ADVERTISER_STARTER_ROLES.Member).toContain("media:write")
  })
```

In `packages/ops-contracts/src/contracts.test.ts`, extend the `./schemas` import to include `campaignCreativeAttachSchema` and `mediaAssetRenameSchema`, then append:

```ts
describe("media library schemas", () => {
  it("defaults an attach to the 'all' slot", () => {
    expect(campaignCreativeAttachSchema.parse({ mediaAssetId: 3 })).toEqual({
      mediaAssetId: 3,
      slot: "all",
    })
  })

  it("rejects an attach without a positive integer id", () => {
    expect(campaignCreativeAttachSchema.safeParse({ mediaAssetId: 0 }).success).toBe(false)
    expect(campaignCreativeAttachSchema.safeParse({ mediaAssetId: "3" }).success).toBe(false)
  })

  it("trims a rename and rejects an empty or over-long name", () => {
    expect(mediaAssetRenameSchema.parse({ name: "  Launch hero  " })).toEqual({ name: "Launch hero" })
    expect(mediaAssetRenameSchema.safeParse({ name: "   " }).success).toBe(false)
    expect(mediaAssetRenameSchema.safeParse({ name: "x".repeat(121) }).success).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -w @workspace/ops-contracts`
Expected: FAIL — `campaignCreativeAttachSchema` is not exported, and the Member role assertion fails.

- [ ] **Step 4: Implement**

`packages/ops-contracts/src/enums.ts` — in `AUDIT_ENTITY_TYPES`, add `"media_asset",` on the line after `"campaign_creative",`.

In `ADVERTISER_PERMISSIONS`, add two lines after `"creatives:write",`:

```ts
  "media:read",
  "media:write",
```

In `ADVERTISER_STARTER_ROLES`, add the same two lines after `"creatives:write",` in `Admin`, and replace the `Member` line with:

```ts
  Member: [
    "campaigns:read",
    "campaigns:write",
    "creatives:write",
    "media:read",
    "media:write",
    "reports:read",
  ],
```

`packages/ops-contracts/src/types.ts` — add directly after the `CampaignCreativeDto` type:

```ts
/** A file in an advertiser org's Media Library. */
export type MediaAssetDto = {
  id: number
  name: string
  /** "image" | "video" — mirrors Cloudinary's resource_type. */
  resource_type: string
  content_type: string
  size_bytes: number
  width: number | null
  height: number | null
  /** Decimal in the DB, so it crosses the wire as a string. */
  duration_seconds: string | null
  original_filename: string | null
  /** "ready" | "invalid" — about the file itself, not about any one panel. */
  status: string
  source: string
  created_at: string
  /** Campaigns this file is attached to. Drives "used in N campaigns" and
   * explains why a delete was refused. */
  campaigns: { id: number; name: string }[]
}
```

`packages/ops-contracts/src/schemas.ts` — add directly after `campaignCreativeSlotSchema`:

```ts
/** Attaches a file already in the Media Library to a campaign. */
export const campaignCreativeAttachSchema = z.object({
  mediaAssetId: z.number().int().positive(),
  slot: campaignCreativeSlotSchema.default("all"),
})

export const MEDIA_ASSET_NAME_MAX = 120

export const mediaAssetRenameSchema = z.object({
  name: z.string().trim().min(1).max(MEDIA_ASSET_NAME_MAX),
})
```

`apps/customer-web/components/settings/roles-settings-view.tsx` — in `PERMISSION_LABELS`, after the `"creatives:write"` line add:

```ts
  "media:read": "View media library",
  "media:write": "Manage media library",
```

`apps/customer-mobile/app/(tabs)/settings/roles.tsx` — in `PERMISSION_LABELS`, after the `"creatives:write"` line add the same two lines.

- [ ] **Step 5: Run tests and typechecks**

Run: `npm run test -w @workspace/ops-contracts`
Expected: PASS

Run: `npm run typecheck -w @workspace/ops-contracts && npm run typecheck -w api && npm run typecheck -w customer-web && npm run typecheck -w customer-mobile`
Expected: all pass. (A missing label in either `PERMISSION_LABELS` map fails here.)

- [ ] **Step 6: Commit**

```bash
git add packages/ops-contracts/src/enums.ts packages/ops-contracts/src/types.ts packages/ops-contracts/src/schemas.ts packages/ops-contracts/src/enums.test.ts packages/ops-contracts/src/contracts.test.ts apps/customer-web/components/settings/roles-settings-view.tsx "apps/customer-mobile/app/(tabs)/settings/roles.tsx"
git commit -m "feat(contracts): media library permissions, DTO and schemas"
```

---

### Task 2: Database — expand migration and backfill script

The SQL in this task and in Task 11 was run on 2026-10-01 against an in-memory Postgres loaded with legacy-shaped rows: migration twice, backfill twice, a partial re-run, an "old code" insert after the migration, org deletion, and the contract step. Table, index and constraint names match what Prisma generates for the Task 3 schema.

**Files:**
- Create: `apps/web/prisma/migrations/20261001000000_media_library/migration.sql`
- Create: `apps/web/prisma/scripts/media-library-backfill.sql`
- Modify: `apps/web/package.json` (two scripts)
- Test: `apps/api/scripts/media-library-backfill.test.ts`

**Interfaces:**
- Produces: table `media_assets`; nullable column `campaign_creatives.media_asset_id`; npm scripts `db:media-library-backfill` and `db:media-library-backfill:prod` in workspace `web`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/scripts/media-library-backfill.test.ts`. It uses raw SQL only, so it does not depend on the Prisma schema change in Task 3.

```ts
import { readFileSync } from "node:fs"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

/**
 * Runs the real backfill script against the dev database. It inserts creatives
 * the way the pre-library API wrote them (file columns on the row, no
 * media_asset_id) and checks they come out linked to an asset owned by their
 * campaign's org. Deleted together with the legacy columns in the contract step.
 */
const databaseUrl = testDatabaseUrl()

// cwd is apps/api.
const BACKFILL_SQL = readFileSync("../web/prisma/scripts/media-library-backfill.sql", "utf8")

type LinkedRow = {
  campaign_id: number
  org_id: number | null
  name: string
  created_by_clerk_user_id: string
  cloudinary_public_id: string
}

describe.skipIf(!databaseUrl)("media library backfill", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const userId = `media-backfill-${stamp}`
  const prefix = `backfill-test/${stamp}`
  let orgId = 0
  let campaignId = 0
  let orphanCampaignId = 0

  async function insertLegacyCreative(campaign: number, suffix: string, filename: string | null) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO campaign_creatives
         (campaign_id, resource_type, cloudinary_public_id, content_type, size_bytes, width, height, original_filename)
       VALUES ($1, 'image', $2, 'image/png', 1000, 960, 320, $3)`,
      campaign,
      `${prefix}/${suffix}`,
      filename,
    )
  }

  function linkedRows() {
    return prisma.$queryRawUnsafe<LinkedRow[]>(
      `SELECT cc.campaign_id, ma.org_id, ma.name, ma.created_by_clerk_user_id, ma.cloudinary_public_id
       FROM campaign_creatives cc
       JOIN media_assets ma ON ma.id = cc.media_asset_id
       WHERE cc.campaign_id IN ($1, $2)
       ORDER BY cc.id`,
      campaignId,
      orphanCampaignId,
    )
  }

  async function assetCount(): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM media_assets WHERE cloudinary_public_id LIKE $1`,
      `${prefix}/%`,
    )
    return rows[0]!.n
  }

  beforeAll(async () => {
    const org = await prisma.advertiserOrg.create({ data: { name: "Backfill Org" } })
    orgId = org.id
    const campaign = await prisma.campaign.create({
      data: { clerk_user_id: userId, org_id: orgId, name: "Backfill Campaign" },
    })
    campaignId = campaign.id
    const orphan = await prisma.campaign.create({
      data: { clerk_user_id: userId, org_id: null, name: "Backfill Orphan" },
    })
    orphanCampaignId = orphan.id

    await insertLegacyCreative(campaignId, "a", "taxi.png")
    await insertLegacyCreative(campaignId, "b", null)
    await insertLegacyCreative(orphanCampaignId, "c", "orphan.png")
  }, 60_000)

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { clerk_user_id: userId } })
    await prisma.$executeRawUnsafe(
      `DELETE FROM media_assets WHERE cloudinary_public_id LIKE $1`,
      `${prefix}/%`,
    )
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("links every legacy creative to an asset owned by its campaign's org", async () => {
    await prisma.$executeRawUnsafe(BACKFILL_SQL)

    const rows = await linkedRows()
    expect(rows).toHaveLength(3)

    expect(rows[0]).toMatchObject({
      campaign_id: campaignId,
      org_id: orgId,
      name: "taxi.png",
      created_by_clerk_user_id: userId,
      cloudinary_public_id: `${prefix}/a`,
    })
    // No filename to name it after.
    expect(rows[1]!.name).toMatch(/^Creative \d+$/)
    // A campaign with no org yields an org-less asset that is still attached.
    expect(rows[2]).toMatchObject({ campaign_id: orphanCampaignId, org_id: null })
  }, 60_000)

  it("is idempotent, and picks up a creative written after the first run", async () => {
    const before = await assetCount()
    await prisma.$executeRawUnsafe(BACKFILL_SQL)
    expect(await assetCount()).toBe(before)

    // What the old API does if someone uploads between the first backfill and
    // the deploy going live.
    await insertLegacyCreative(campaignId, "late", "late.png")
    await prisma.$executeRawUnsafe(BACKFILL_SQL)
    expect(await assetCount()).toBe(before + 1)
    expect(await linkedRows()).toHaveLength(4)
  }, 60_000)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -w api -- scripts/media-library-backfill.test.ts`
Expected: FAIL — `ENOENT … media-library-backfill.sql`.

- [ ] **Step 3: Write the expand migration**

Create `apps/web/prisma/migrations/20261001000000_media_library/migration.sql`:

```sql
-- Media Library (expand step). Hand-written and idempotent, like the
-- advertiser-org migrations before it. Additive only: the API code still on
-- prod keeps working against this schema until the new code deploys.
-- The legacy file columns on campaign_creatives are dropped by a later
-- contract migration, once every row has a media_asset_id.

-- CreateTable
CREATE TABLE IF NOT EXISTS "media_assets" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER,
    "name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL DEFAULT 'image',
    "cloudinary_public_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" DECIMAL(8,2),
    "original_filename" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "source" TEXT NOT NULL DEFAULT 'upload',
    "created_by_clerk_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_cloudinary_public_id_key" ON "media_assets"("cloudinary_public_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_assets_org_id_created_at_idx" ON "media_assets"("org_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_assets_org_id_resource_type_idx" ON "media_assets"("org_id", "resource_type");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "advertiser_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: the join column. Nullable until the contract migration, so the
-- old code's inserts (which don't know about it) keep working.
ALTER TABLE "campaign_creatives" ADD COLUMN IF NOT EXISTS "media_asset_id" INTEGER;

-- AlterTable: the new code no longer writes these, so they can't stay required.
ALTER TABLE "campaign_creatives" ALTER COLUMN "cloudinary_public_id" DROP NOT NULL;
ALTER TABLE "campaign_creatives" ALTER COLUMN "content_type" DROP NOT NULL;
ALTER TABLE "campaign_creatives" ALTER COLUMN "size_bytes" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_creatives_media_asset_id_idx" ON "campaign_creatives"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_creatives_campaign_id_media_asset_id_slot_key" ON "campaign_creatives"("campaign_id", "media_asset_id", "slot");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "campaign_creatives" ADD CONSTRAINT "campaign_creatives_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Grant the two new permissions to every role that can already upload
-- creative — starter roles (org_id IS NULL) and org-custom roles alike.
UPDATE "advertiser_roles"
SET "permissions" = array_append("permissions", 'media:read')
WHERE 'creatives:write' = ANY("permissions") AND NOT ('media:read' = ANY("permissions"));

UPDATE "advertiser_roles"
SET "permissions" = array_append("permissions", 'media:write')
WHERE 'creatives:write' = ANY("permissions") AND NOT ('media:write' = ANY("permissions"));
```

- [ ] **Step 4: Write the backfill script**

Create `apps/web/prisma/scripts/media-library-backfill.sql`:

```sql
-- Media Library backfill: gives every campaign creative that has no
-- media_asset_id yet a media_assets row owned by its campaign's org, then
-- links it. Idempotent — a re-run only touches rows still unlinked, so it is
-- safe (and expected) to run once before the new API deploys and once after.
--
-- One DO block on purpose: `prisma db execute` and the test suite both send
-- it as a single statement.
--
-- HOW TO RUN:
--   npm run db:media-library-backfill -w web         (dev/staging, .env.local)
--   npm run db:media-library-backfill:prod -w web    (prod, .env.production.local)
DO $$
BEGIN
  INSERT INTO "media_assets" (
    "org_id", "name", "resource_type", "cloudinary_public_id", "content_type",
    "size_bytes", "width", "height", "duration_seconds", "original_filename",
    "created_by_clerk_user_id", "created_at", "updated_at"
  )
  SELECT
    c."org_id",
    COALESCE(NULLIF(btrim(cc."original_filename"), ''), 'Creative ' || cc."id"),
    cc."resource_type",
    cc."cloudinary_public_id",
    cc."content_type",
    cc."size_bytes",
    cc."width",
    cc."height",
    cc."duration_seconds",
    cc."original_filename",
    c."clerk_user_id",
    cc."created_at",
    cc."created_at"
  FROM "campaign_creatives" cc
  JOIN "campaigns" c ON c."id" = cc."campaign_id"
  WHERE cc."media_asset_id" IS NULL
    AND cc."cloudinary_public_id" IS NOT NULL
  ON CONFLICT ("cloudinary_public_id") DO NOTHING;

  UPDATE "campaign_creatives" cc
  SET "media_asset_id" = ma."id"
  FROM "media_assets" ma
  WHERE cc."media_asset_id" IS NULL
    AND ma."cloudinary_public_id" = cc."cloudinary_public_id";
END $$;
```

In `apps/web/package.json`, add after the `"db:safety-incidents:prod"` line:

```json
    "db:media-library-backfill": "dotenv -e .env.local -- prisma db execute --file prisma/scripts/media-library-backfill.sql",
    "db:media-library-backfill:prod": "dotenv -e .env.production.local -- prisma db execute --file prisma/scripts/media-library-backfill.sql",
```

- [ ] **Step 5: Apply to the dev database**

Run: `npm run db:migrate:status -w web`
Expected: exactly one pending migration, `20261001000000_media_library`. **If anything else is pending, or it reports drift or a failed migration, stop and ask** — do not run `migrate dev`, `migrate reset` or `db push`.

Run: `npm run db:migrate:deploy -w web`
Expected: `Applying migration 20261001000000_media_library` … `All migrations have been successfully applied.`

Run: `npm run db:media-library-backfill -w web`
Expected: `Script executed successfully.`

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test -w api -- scripts/media-library-backfill.test.ts`
Expected: PASS, 2 tests. (If it reports "skipped", `DATABASE_URL` was not found — run `npm run env:pull` first.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/prisma/migrations/20261001000000_media_library/migration.sql apps/web/prisma/scripts/media-library-backfill.sql apps/web/package.json apps/api/scripts/media-library-backfill.test.ts
git commit -m "feat(db): media_assets table and creative backfill (expand step)"
```

---

### Task 3: Move existing campaign code onto the asset + attachment shape

After this task the app behaves as before, except: an inline upload also creates a library asset, removing a creative only detaches it, and deleting a draft campaign keeps its files.

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Modify: `packages/ops-contracts/src/types.ts` (`CampaignCreativeDto`)
- Modify: `apps/api/lib/campaign-creative-storage.ts`
- Create: `apps/api/lib/media-asset-store.ts`
- Modify: `apps/api/lib/campaign-store.ts`, `apps/api/lib/campaign-dto.ts`
- Modify: `apps/api/app/v1/customer/campaigns/route.ts`
- Modify: `apps/api/app/v1/customer/campaigns/[id]/route.ts`
- Modify: `apps/api/app/v1/customer/campaigns/[id]/submit/route.ts`
- Modify: `apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts`
- Modify: `apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/route.ts`
- Modify: `apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/file/route.ts`
- Modify: `apps/api/app/v1/campaigns/[id]/route.ts`, `apps/api/app/v1/campaigns/[id]/review/route.ts`
- Modify: `apps/api/app/v1/campaigns/[id]/creatives/[creativeId]/file/route.ts`
- Modify: `apps/api/app/v1/campaigns/lifecycle.test.ts`
- Test: `apps/api/lib/campaign-dto.test.ts`, `apps/api/app/v1/customer/media/media-library.test.ts` (new)

**Interfaces:**
- Consumes: `MEDIA_ASSET_NAME_MAX` (Task 1); table `media_assets` (Task 2).
- Produces:
  - `buildMediaAssetPublicId(orgId: number, uploadId: string): string` in `campaign-creative-storage.ts` (replaces `buildCampaignCreativePublicId`).
  - In `media-asset-store.ts`: `type StoredCreativeFile = { resourceType: PrivateResourceType; uploaded: UploadedAsset }`; `storeCreativeFile(orgId: number, file: File): Promise<{ stored: StoredCreativeFile; error?: undefined } | { stored?: undefined; error: NextResponse }>`; `mediaAssetCreateData(input: { orgId: number; userId: string; file: File; stored: StoredCreativeFile })`; `defaultAssetName(filename)`.
  - In `campaign-store.ts`: `type CampaignCreativeWithAsset = CampaignCreative & { media_asset: MediaAsset }`; `CREATIVES_INCLUDE`; `missingCampaignCreatives(format: string, creatives: Array<{ width: number | null; height: number | null }>)`.
  - `CampaignCreativeDto` gains `media_asset_id: number` and `name: string`.

- [ ] **Step 1: Write the failing unit test**

In `apps/api/lib/campaign-dto.test.ts`, change the first import line to `import { flightPhase, toCampaignCreativeDto, toDayIso } from "./campaign-dto"` and append:

```ts
describe("toCampaignCreativeDto", () => {
  it("keeps the attachment's id and slot, and reads the file's facts off its asset", () => {
    const dto = toCampaignCreativeDto({
      id: 7,
      campaign_id: 1,
      media_asset_id: 42,
      slot: "side_a",
      created_at: new Date("2026-10-01T09:00:00.000Z"),
      media_asset: {
        id: 42,
        name: "Launch hero",
        resource_type: "video",
        content_type: "video/mp4",
        size_bytes: 9000,
        width: 960,
        height: 320,
        duration_seconds: { toString: () => "12.5" },
        original_filename: "hero.mp4",
      },
    } as never)

    expect(dto).toEqual({
      id: 7,
      media_asset_id: 42,
      name: "Launch hero",
      resource_type: "video",
      content_type: "video/mp4",
      size_bytes: 9000,
      width: 960,
      height: 320,
      duration_seconds: "12.5",
      original_filename: "hero.mp4",
      slot: "side_a",
      created_at: "2026-10-01T09:00:00.000Z",
    })
  })
})
```

- [ ] **Step 2: Write the failing integration tests**

Create `apps/api/app/v1/customer/media/media-library.test.ts`. Tasks 4–6 append to this file.

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

/**
 * Media Library against the live database, with auth and Cloudinary stubbed.
 * Skips when no DATABASE_URL is available (CI), like campaigns/lifecycle.test.ts.
 */
const databaseUrl = testDatabaseUrl()

const USER = `media-adv-${Date.now()}`
let actingOrgId = 0

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerPermissionAccess: vi.fn(async () => ({
      access: { userId: USER, orgId: actingOrgId, isOwner: true, permissions: new Set() },
    })),
    requireOpsPermissionAccess: vi.fn(async () => ({
      access: { userId: "ops_1", email: "ops@admobihq.com" },
    })),
  }
})

vi.mock("@/lib/customer-clerk", () => ({
  customerClerkClient: {},
  getCustomerEmail: async () => "advertiser@example.com",
  getCustomerName: async () => "Amina",
  getCustomerCompanyName: async () => "Acme Media",
  readCompanyName: () => "Acme Media",
}))

// Cloudinary is never reached. An upload "returns" whatever nextDims holds,
// which is how a test chooses the shape of the file it is uploading.
let nextDims: { width: number | null; height: number | null } = { width: 960, height: 320 }
let uploadFails = false
const destroyPrivateAsset = vi.fn()
vi.mock("@/lib/private-media", () => ({
  uploadPrivateAsset: async (file: File, publicId: string) => {
    if (uploadFails) throw new Error("cloudinary down")
    return {
      publicId,
      contentType: file.type,
      sizeBytes: file.size,
      width: nextDims.width,
      height: nextDims.height,
      durationSeconds: null,
    }
  },
  destroyPrivateAsset: (...args: unknown[]) => destroyPrivateAsset(...args),
  fetchPrivateAsset: async () => new Response("bytes"),
}))

let prisma: typeof import("@/lib/prisma").prisma
let orgId = 0
let otherOrgId = 0
const extraOrgIds: number[] = []

function png(name = "taxi.png", bytes = 16): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" })
}

function fileRequest(file: File): Request {
  const form = new FormData()
  form.append("file", file)
  return new Request("http://localhost/x", { method: "POST", body: form })
}

function json(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function bare(method: string): Request {
  return new Request("http://localhost/x", { method })
}

const idParams = (id: number) => ({ params: Promise.resolve({ id: String(id) }) })
const creativeParams = (id: number, creativeId: number) => ({
  params: Promise.resolve({ id: String(id), creativeId: String(creativeId) }),
})

function createCampaign(format = "taxi_top", org = orgId, name = `Media test ${format}`) {
  return prisma.campaign.create({
    data: { clerk_user_id: USER, org_id: org, name, format },
  })
}

async function uploadInline(campaignId: number, file = png()) {
  const { POST } = await import("../campaigns/[id]/creatives/route")
  return POST(fileRequest(file), idParams(campaignId))
}

describe.skipIf(!databaseUrl)("media library", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl!
    ;({ prisma } = await import("@/lib/prisma"))
    orgId = (await prisma.advertiserOrg.create({ data: { name: "Media Test Org" } })).id
    otherOrgId = (await prisma.advertiserOrg.create({ data: { name: "Media Other Org" } })).id
  }, 60_000)

  beforeEach(() => {
    actingOrgId = orgId
    nextDims = { width: 960, height: 320 }
    uploadFails = false
    destroyPrivateAsset.mockClear()
  })

  afterAll(async () => {
    if (!prisma) return
    // Campaigns first: their attachments cascade away, which frees the assets.
    await prisma.campaign.deleteMany({ where: { clerk_user_id: USER } })
    await prisma.mediaAsset.deleteMany({ where: { created_by_clerk_user_id: USER } })
    await prisma.advertiserOrg.deleteMany({
      where: { id: { in: [orgId, otherOrgId, ...extraOrgIds] } },
    })
  })

  describe("inline campaign upload", () => {
    it("lands in the org's library and is attached to the campaign", async () => {
      const campaign = await createCampaign()
      const res = await uploadInline(campaign.id)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.name).toBe("taxi.png")
      expect(body.width).toBe(960)

      const asset = await prisma.mediaAsset.findUnique({ where: { id: body.media_asset_id } })
      expect(asset?.org_id).toBe(orgId)
      expect(asset?.created_by_clerk_user_id).toBe(USER)
      expect(asset?.cloudinary_public_id.startsWith(`media/${orgId}/`)).toBe(true)
    }, 30_000)

    it("rejects a wrong-shaped file and keeps nothing", async () => {
      const campaign = await createCampaign()
      const before = await prisma.mediaAsset.count({ where: { org_id: orgId } })
      nextDims = { width: 400, height: 300 }

      const res = await uploadInline(campaign.id)
      expect(res.status).toBe(400)
      expect((await res.json()).issues.specs[0].label).toBe("Taxi-top LED")
      expect(destroyPrivateAsset).toHaveBeenCalledTimes(1)
      expect(await prisma.mediaAsset.count({ where: { org_id: orgId } })).toBe(before)
    }, 30_000)

    it("caps an over-long filename at 120 characters for the asset's name", async () => {
      const campaign = await createCampaign()
      const res = await uploadInline(campaign.id, png(`${"a".repeat(200)}.png`))
      expect(res.status).toBe(201)
      expect((await res.json()).name).toHaveLength(120)
    }, 30_000)

    it("removing a creative detaches it and keeps the file in the library", async () => {
      const campaign = await createCampaign()
      const creative = await (await uploadInline(campaign.id)).json()

      const { DELETE } = await import("../campaigns/[id]/creatives/[creativeId]/route")
      const res = await DELETE(bare("DELETE"), creativeParams(campaign.id, creative.id))
      expect(res.status).toBe(200)

      expect(await prisma.campaignCreative.findUnique({ where: { id: creative.id } })).toBeNull()
      expect(
        await prisma.mediaAsset.findUnique({ where: { id: creative.media_asset_id } }),
      ).not.toBeNull()
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)

    it("deleting a draft campaign keeps its files in the library", async () => {
      const campaign = await createCampaign()
      const creative = await (await uploadInline(campaign.id)).json()

      const { DELETE } = await import("../campaigns/[id]/route")
      const res = await DELETE(bare("DELETE"), idParams(campaign.id))
      expect(res.status).toBe(200)

      expect(
        await prisma.mediaAsset.findUnique({ where: { id: creative.media_asset_id } }),
      ).not.toBeNull()
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test -w api -- lib/campaign-dto.test.ts app/v1/customer/media/media-library.test.ts`
Expected: FAIL — `toCampaignCreativeDto` output lacks `media_asset_id`/`name`, and `prisma.mediaAsset` is undefined.

- [ ] **Step 4: Update the Prisma schema and regenerate**

In `apps/web/prisma/schema.prisma`:

In `model AdvertiserOrg`, add after the `adminRequests AdvertiserAdminRequest[]` line:

```prisma
  mediaAssets   MediaAsset[]
```

Replace everything from the comment line `/// A single uploaded creative asset for a campaign. cloudinary_public_id uses` through the closing `}` of `model CampaignCreative` with:

```prisma
/// A file in an advertiser org's Media Library. One asset can be attached to
/// many campaigns (see CampaignCreative), so it is owned by the org, never by
/// a campaign. cloudinary_public_id uses Cloudinary's "authenticated" delivery
/// type and is never exposed to a browser — always served via an
/// authenticated proxy, exactly like DriverDocument.
///
/// Only PNG, JPG, GIF and MP4 are accepted: the supplier's player decodes
/// nothing else, so accepting WebP/WebM/BMP would let creative pass review
/// and then fail silently on the vehicle.
///
/// width / height / duration_seconds are read off the Cloudinary upload
/// response and stored eagerly — they are the exact spec fields the supplier
/// screen API asks for, and recovering them later means re-downloading every
/// asset. Do not make them lazy.
model MediaAsset {
  id                       Int            @id @default(autoincrement())
  /// Null once the owning org is deleted. Campaigns are detached rather than
  /// deleted with their org (ops keeps the record), and their creatives must
  /// stay viewable — so this is SetNull, not Cascade.
  org_id                   Int?
  org                      AdvertiserOrg? @relation(fields: [org_id], references: [id], onDelete: SetNull)
  name                     String
  /// "image" | "video" — mirrors Cloudinary's resource_type; needed to sign
  /// the fetch URL correctly.
  resource_type            String         @default("image")
  cloudinary_public_id     String         @unique
  content_type             String
  size_bytes               Int
  width                    Int?
  height                   Int?
  duration_seconds         Decimal?       @db.Decimal(8, 2)
  original_filename        String?
  /// "ready" | "invalid". Readiness is about the file itself, not about any
  /// one panel — format fit is checked when the asset is attached.
  status                   String         @default("ready")
  /// "upload" today; "google_drive" | "google_photos" are reserved.
  source                   String         @default("upload")
  created_by_clerk_user_id String
  created_at               DateTime       @default(now())
  updated_at               DateTime       @updatedAt

  attachments CampaignCreative[]

  @@index([org_id, created_at])
  @@index([org_id, resource_type])
  @@map("media_assets")
}

/// Attaches a MediaAsset to a campaign. Deleting a campaign cascades these
/// rows away and leaves the asset in the library; an asset cannot be deleted
/// while any row here still points at it (Restrict).
model CampaignCreative {
  id             Int        @id @default(autoincrement())
  campaign_id    Int
  campaign       Campaign   @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  media_asset_id Int
  media_asset    MediaAsset @relation(fields: [media_asset_id], references: [id], onDelete: Restrict)
  /// Which face of the vehicle unit this plays on. The taxi top is
  /// double-sided (960x320mm) and the bike box is three-sided (320x320mm,
  /// P2.5), so the hardware needs this even though the app only offers "all"
  /// today: "all" | "side_a" | "side_b" | "left" | "right" | "rear".
  slot           String     @default("all")
  created_at     DateTime   @default(now())

  @@unique([campaign_id, media_asset_id, slot])
  @@index([campaign_id])
  @@index([media_asset_id])
  @@map("campaign_creatives")
}
```

Run (from the repo root): `node scripts/prisma-generate-safe.mjs`
Expected: `Generated Prisma Client`. (Stop any running `npm run dev` first if it reports the client files are locked.)

The legacy columns stay in the database until Task 11; removing them from the schema just means the new code can no longer read or write them.

- [ ] **Step 5: Add the two DTO fields**

In `packages/ops-contracts/src/types.ts`, replace the first field of `CampaignCreativeDto` (`id: number`) with:

```ts
  /** The attachment's id — what the creative routes key on. */
  id: number
  /** The library file behind this attachment. The same file can be attached
   * to other campaigns. */
  media_asset_id: number
  /** The file's name in the Media Library. */
  name: string
```

- [ ] **Step 6: Make the Cloudinary id org-centric**

In `apps/api/lib/campaign-creative-storage.ts`, replace the `buildCampaignCreativePublicId` function with:

```ts
/** Org-centric: a file can be attached to many campaigns, so the org is the
 * only owner that stays true for the life of the file. Cosmetic — folder
 * placement gives no access control; every asset is "authenticated" and the
 * API's org check is the boundary. Files uploaded before the Media Library
 * keep their old `campaign-creatives/{campaignId}/…` ids. */
export function buildMediaAssetPublicId(orgId: number, uploadId: string): string {
  return `media/${orgId}/${uploadId}`
}
```

- [ ] **Step 7: Create the asset store**

Create `apps/api/lib/media-asset-store.ts`:

```ts
import type { NextResponse } from "next/server"

import { CREATIVE_FORMATS_LABEL, MEDIA_ASSET_NAME_MAX } from "@workspace/ops-contracts"

import { jsonError } from "@/lib/api-utils"
import {
  MAX_CREATIVE_BYTES,
  buildMediaAssetPublicId,
  resourceTypeForMime,
  uploadCampaignCreative,
} from "@/lib/campaign-creative-storage"
import type { PrivateResourceType, UploadedAsset } from "@/lib/private-media"

/**
 * Media Library storage rules, shared by the two ways a file gets in: the
 * library's own upload and a campaign's inline upload. Both must accept and
 * reject exactly the same files.
 */

export type StoredCreativeFile = { resourceType: PrivateResourceType; uploaded: UploadedAsset }

export function defaultAssetName(filename: string | null | undefined): string {
  return (filename?.trim() || "Untitled creative").slice(0, MEDIA_ASSET_NAME_MAX)
}

/**
 * Checks the file itself (type, size) and stores it in Cloudinary. Says
 * nothing about whether it fits a panel — that depends on the campaign it is
 * attached to, and is checked there.
 */
export async function storeCreativeFile(
  orgId: number,
  file: File,
): Promise<
  | { stored: StoredCreativeFile; error?: undefined }
  | { stored?: undefined; error: NextResponse }
> {
  // The supplier's player decodes PNG, JPG, GIF and MP4 and nothing else.
  // Accepting anything wider would let creative pass ops review and then fail
  // silently on the vehicle.
  const resourceType = resourceTypeForMime(file.type)
  if (!resourceType) {
    return { error: jsonError(`Creative must be ${CREATIVE_FORMATS_LABEL}`, 400) }
  }
  if (file.size === 0) return { error: jsonError("That file is empty", 400) }
  if (file.size > MAX_CREATIVE_BYTES) {
    return {
      error: jsonError(
        `Creative must be under ${Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)}MB`,
        400,
      ),
    }
  }

  try {
    const uploaded = await uploadCampaignCreative(
      file,
      buildMediaAssetPublicId(orgId, crypto.randomUUID()),
      resourceType,
    )
    return { stored: { resourceType, uploaded } }
  } catch (error) {
    console.error("[media] upload failed:", error)
    return { error: jsonError("Upload failed — please try again", 502) }
  }
}

/** The media_assets row for a file that has just landed in Cloudinary. */
export function mediaAssetCreateData(input: {
  orgId: number
  userId: string
  file: File
  stored: StoredCreativeFile
}) {
  const { uploaded } = input.stored
  return {
    org_id: input.orgId,
    name: defaultAssetName(input.file.name),
    resource_type: input.stored.resourceType,
    cloudinary_public_id: uploaded.publicId,
    content_type: uploaded.contentType,
    size_bytes: uploaded.sizeBytes,
    // Stored eagerly: these are the fields the supplier screen API asks for,
    // and recovering them later would mean re-downloading every asset.
    width: uploaded.width,
    height: uploaded.height,
    duration_seconds: uploaded.durationSeconds,
    original_filename: input.file.name || null,
    created_by_clerk_user_id: input.userId,
  }
}
```

- [ ] **Step 8: Update the campaign store and DTO mapper**

In `apps/api/lib/campaign-store.ts`:

Replace the first import line with `import type { Campaign, CampaignCreative, MediaAsset } from "@prisma/client"`.

Replace the `CampaignWithCreatives` type and the `CREATIVE_ORDER` constant with:

```ts
/** An attachment together with the library file it points at — everything a
 * creative's DTO, file proxy and submit check need. */
export type CampaignCreativeWithAsset = CampaignCreative & { media_asset: MediaAsset }

export type CampaignWithCreatives = Campaign & { creatives: CampaignCreativeWithAsset[] }

/** Every campaign read that ends in toCampaignDto uses this include. */
export const CREATIVES_INCLUDE = {
  creatives: { orderBy: { created_at: "asc" }, include: { media_asset: true } },
} as const
```

In `getOwnedCampaign` and `listOwnedCampaigns`, replace `include: CREATIVE_ORDER` with `include: CREATIVES_INCLUDE`.

In `missingCampaignCreatives`, replace the parameter `creatives: CampaignCreative[]` with `creatives: Array<{ width: number | null; height: number | null }>`, and in its doc comment replace the sentence "Creatives are only stored after passing the dimension check at upload, so matching on aspect ratio here is enough." with "Creatives are only attached after passing the dimension check, so matching on aspect ratio here is enough."

In `apps/api/lib/campaign-dto.ts`:

Replace the first import line with:

```ts
import type { Campaign } from "@prisma/client"
```

and add after the `@workspace/ops-contracts` imports:

```ts
import type { CampaignCreativeWithAsset } from "@/lib/campaign-store"
```

Replace `toCampaignCreativeDto` with:

```ts
export function toCampaignCreativeDto(creative: CampaignCreativeWithAsset): CampaignCreativeDto {
  const asset = creative.media_asset
  return {
    id: creative.id,
    media_asset_id: asset.id,
    name: asset.name,
    resource_type: asset.resource_type,
    content_type: asset.content_type,
    size_bytes: asset.size_bytes,
    width: asset.width,
    height: asset.height,
    // Prisma Decimal is not JSON-safe, so it crosses the wire as a string.
    duration_seconds: asset.duration_seconds?.toString() ?? null,
    original_filename: asset.original_filename,
    slot: creative.slot,
    created_at: creative.created_at.toISOString(),
  }
}
```

In `toCampaignDto`, replace the parameter type `Campaign & { creatives: CampaignCreative[] }` with `Campaign & { creatives: CampaignCreativeWithAsset[] }`.

- [ ] **Step 9: Update the campaign routes**

`apps/api/app/v1/customer/campaigns/route.ts` — change the import to `import { CREATIVES_INCLUDE, listOwnedCampaigns } from "@/lib/campaign-store"` and, in `POST`, replace `include: { creatives: true },` with `include: CREATIVES_INCLUDE,`.

`apps/api/app/v1/customer/campaigns/[id]/route.ts`:
- Delete the imports of `destroyCampaignCreative` and `PrivateResourceType`.
- Change the store import to `import { CREATIVES_INCLUDE, EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaign-store"`.
- In `PATCH`, replace `include: { creatives: { orderBy: { created_at: "asc" } } },` with `include: CREATIVES_INCLUDE,`.
- In `DELETE`, replace the `// Cloudinary first: …` comment, the `for` loop and the `prisma.campaign.delete` line with:

```ts
  // Attachments cascade away with the campaign. The files stay in the org's
  // Media Library — another campaign may be using them.
  await prisma.campaign.delete({ where: { id } })
```

`apps/api/app/v1/customer/campaigns/[id]/submit/route.ts`:
- Add `CREATIVES_INCLUDE,` to the `@/lib/campaign-store` import list.
- Replace the whole line `const missingCreatives = missingCampaignCreatives(campaign.format, campaign.creatives)` with:

```ts
  const missingCreatives = missingCampaignCreatives(
    campaign.format,
    campaign.creatives.map((creative) => creative.media_asset),
  )
```

- Replace `include: { creatives: { orderBy: { created_at: "asc" } } },` with `include: CREATIVES_INCLUDE,`.

`apps/api/app/v1/campaigns/[id]/route.ts` and `apps/api/app/v1/campaigns/[id]/review/route.ts` — in each, add `import { CREATIVES_INCLUDE } from "@/lib/campaign-store"` and replace `include: { creatives: { orderBy: { created_at: "asc" } } },` with `include: CREATIVES_INCLUDE,`.

`apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/file/route.ts` — replace the `fetchCampaignCreative(…)` call's three arguments and the `Content-Type` header value:

```ts
    upstream = await fetchCampaignCreative(
      creative.media_asset.cloudinary_public_id,
      creative.media_asset.resource_type as PrivateResourceType,
      creative.media_asset.content_type,
    )
```

```ts
      "Content-Type": creative.media_asset.content_type,
```

`apps/api/app/v1/campaigns/[id]/creatives/[creativeId]/file/route.ts` — replace the lookup with:

```ts
  const creative = await prisma.campaignCreative.findUnique({
    where: { id: creativeId },
    include: { media_asset: true },
  })
```

and make the same three-argument and `Content-Type` replacements as above.

`apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/route.ts` — replace the whole file with:

```ts
import { NextResponse } from "next/server"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaign-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; creativeId: string }> }

/** Detaches the creative from this campaign. The file itself stays in the
 * org's Media Library — it may be on other campaigns, and deleting it is a
 * library action (DELETE /v1/customer/media/:id). */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("creatives:write")
  if (auth.error) return auth.error

  const { id: rawId, creativeId: rawCreativeId } = await params
  const id = parseId(rawId)
  const creativeId = parseId(rawCreativeId)
  if (!id || !creativeId) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Creative can't be changed while status is "${campaign.status}"`, 409)
  }

  const creative = campaign.creatives.find((c) => c.id === creativeId)
  if (!creative) return jsonError("Not found", 404)

  await prisma.campaignCreative.delete({ where: { id: creativeId } })

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "campaign_creative",
    entity_id: creativeId,
    summary: `Campaign #${id} creative removed`,
  })

  return NextResponse.json({ success: true })
}
```

`apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts` — replace the whole file with:

```ts
import { NextResponse } from "next/server"

import {
  campaignCreativeSlotSchema,
  checkCreativeForFormat,
  specsForFormat,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import {
  MAX_CREATIVES_PER_CAMPAIGN,
  destroyCampaignCreative,
} from "@/lib/campaign-creative-storage"
import { toCampaignCreativeDto } from "@/lib/campaign-dto"
import { EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaign-store"
import { mediaAssetCreateData, storeCreativeFile } from "@/lib/media-asset-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/** Whether a file fits this campaign's panel(s). Dimensions come from
 * Cloudinary's upload response — the only trustworthy source; a client-side
 * check is a convenience, not a gate. A file with no readable dimensions is
 * let through, as it always has been. */
function checkAgainstFormat(format: CampaignFormat, width: number | null, height: number | null) {
  return width != null && height != null
    ? checkCreativeForFormat(format, width, height)
    : { level: "ok" as const, ok: true, message: undefined }
}

function formatMismatch(format: CampaignFormat, message: string | undefined) {
  return jsonError(message ?? "Creative doesn't match the panel", 400, {
    specs: specsForFormat(format).map((spec) => ({
      format: spec.format,
      label: spec.label,
      aspect: spec.aspectLabel,
      width: spec.recommendedWidthPx,
      height: spec.recommendedHeightPx,
    })),
  })
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("creatives:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Creative can't be changed while status is "${campaign.status}"`, 409)
  }
  if (campaign.creatives.length >= MAX_CREATIVES_PER_CAMPAIGN) {
    return jsonError(`A campaign can hold at most ${MAX_CREATIVES_PER_CAMPAIGN} creatives`, 400)
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return jsonError("Missing file", 400)

  const slotParsed = campaignCreativeSlotSchema.safeParse(form?.get("slot") ?? "all")
  if (!slotParsed.success) return jsonError("Invalid slot", 400)

  const result = await storeCreativeFile(auth.access.orgId, file)
  if (result.error) return result.error
  const { stored } = result

  const format = campaign.format as CampaignFormat
  const check = checkAgainstFormat(format, stored.uploaded.width, stored.uploaded.height)
  if (!check.ok) {
    // Roll the upload back: the advertiser picked this file for this campaign,
    // so a file that can't run here shouldn't be left sitting in their library.
    await destroyCampaignCreative(stored.uploaded.publicId, stored.resourceType)
    return formatMismatch(format, check.message)
  }

  const created = await prisma.campaignCreative.create({
    data: {
      campaign: { connect: { id: campaign.id } },
      slot: slotParsed.data,
      // Every upload lands in the org's Media Library, so it can be reused on
      // another campaign without uploading it again.
      media_asset: {
        create: mediaAssetCreateData({
          orgId: auth.access.orgId,
          userId: auth.access.userId,
          file,
          stored,
        }),
      },
    },
    include: { media_asset: true },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "campaign_creative",
    entity_id: created.id,
    summary: `Campaign #${campaign.id} creative uploaded (${stored.resourceType})`,
  })

  return NextResponse.json(
    // A "warn" is not a failure — the creative is saved and the UI surfaces
    // the note so the advertiser can decide whether to replace it.
    { ...toCampaignCreativeDto(created), warning: check.level === "warn" ? check.message : null },
    { status: 201 },
  )
}
```

- [ ] **Step 10: Update the lifecycle test fixture**

In `apps/api/app/v1/campaigns/lifecycle.test.ts`, replace the `prisma.campaignCreative.create({ … })` call inside "submits once a correctly shaped creative exists…" with:

```ts
    await prisma.campaignCreative.create({
      data: {
        campaign: { connect: { id: campaignId } },
        media_asset: {
          create: {
            org_id: customerOrg.id,
            name: "lifecycle.png",
            resource_type: "image",
            cloudinary_public_id: `lifecycle-test/${campaignId}`,
            content_type: "image/png",
            size_bytes: 1000,
            width: 960,
            height: 320,
            created_by_clerk_user_id: CUSTOMER,
          },
        },
      },
    })
```

In its `afterAll`, add directly after the `prisma.campaign.deleteMany` call:

```ts
    await prisma.mediaAsset.deleteMany({
      where: { created_by_clerk_user_id: { in: [CUSTOMER, OTHER_CUSTOMER] } },
    })
```

- [ ] **Step 11: Run typecheck and tests**

Run: `npm run typecheck -w api`
Expected: PASS. Any remaining error names a file still reading a file column (`cloudinary_public_id`, `width`, …) straight off a creative — read it from `creative.media_asset` instead.

Run: `npm run test -w api`
Expected: PASS, including `campaign-dto.test.ts`, `lifecycle.test.ts`, `media-library.test.ts` (5 tests) and `media-library-backfill.test.ts`.

Run: `npm run typecheck -w customer-web && npm run typecheck -w customer-mobile && npm run typecheck -w ops && npm run typecheck -w ops-mobile`
Expected: PASS — the DTO change is additive.

- [ ] **Step 12: Commit**

```bash
git add apps/web/prisma/schema.prisma packages/ops-contracts/src/types.ts apps/api/lib/campaign-creative-storage.ts apps/api/lib/media-asset-store.ts apps/api/lib/campaign-store.ts apps/api/lib/campaign-dto.ts apps/api/lib/campaign-dto.test.ts apps/api/app/v1/customer/campaigns apps/api/app/v1/campaigns apps/api/app/v1/customer/media/media-library.test.ts
git commit -m "feat(api): split campaign creatives into org-owned media assets and attachments"
```

---

### Task 4: Media Library API

**Files:**
- Modify: `apps/api/lib/media-asset-store.ts`
- Create: `apps/api/app/v1/customer/media/route.ts`
- Create: `apps/api/app/v1/customer/media/[id]/route.ts`
- Create: `apps/api/app/v1/customer/media/[id]/file/route.ts`
- Modify: `apps/api/lib/advertiser-activity.ts`
- Test: `apps/api/app/v1/customer/media/media-library.test.ts`, `apps/api/lib/advertiser-activity.test.ts`

**Interfaces:**
- Consumes: `storeCreativeFile`, `mediaAssetCreateData` (Task 3); `MediaAssetDto`, `mediaAssetRenameSchema` (Task 1).
- Produces, in `media-asset-store.ts`: `MEDIA_ASSET_INCLUDE`; `type MediaAssetWithCampaigns`; `getOwnedMediaAsset(orgId: number, id: number): Promise<MediaAssetWithCampaigns | null>`; `toMediaAssetDto(asset: MediaAssetWithCampaigns): MediaAssetDto`.
- Produces, HTTP: `GET /v1/customer/media?page&pageSize&search&type=image|video&usage=used|unused` → `{ items: MediaAssetDto[], total, page, pageSize, totalPages }`; `POST /v1/customer/media` (multipart `file`) → `201 MediaAssetDto`; `PATCH /v1/customer/media/[id]` `{ name }` → `MediaAssetDto`; `DELETE /v1/customer/media/[id]` → `{ success: true }` or `409` with `issues.campaigns`; `GET /v1/customer/media/[id]/file` → bytes.

- [ ] **Step 1: Write the failing tests**

In `apps/api/app/v1/customer/media/media-library.test.ts`, add these helpers after `uploadInline`:

```ts
async function uploadToLibrary(file = png()) {
  const { POST } = await import("./route")
  return POST(fileRequest(file))
}

async function listIds(query: string): Promise<number[]> {
  const { GET } = await import("./route")
  const res = await GET(new Request(`http://localhost/v1/customer/media${query}`))
  expect(res.status).toBe(200)
  return (await res.json()).items.map((item: { id: number }) => item.id)
}
```

and add this block inside `describe("media library")`, after the `describe("inline campaign upload")` block:

```ts
  describe("library routes", () => {
    it("uploads straight into the library, whatever the file's shape", async () => {
      // 4:3 fits no panel, and that is fine here: fit is judged on attach.
      nextDims = { width: 400, height: 300 }
      const res = await uploadToLibrary(png("moodboard.png"))
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({ name: "moodboard.png", status: "ready", campaigns: [] })
      expect(body.cloudinary_public_id).toBeUndefined()
    }, 30_000)

    it("refuses a format the panel can't play, an empty file, and a non-form body", async () => {
      const webp = new File([new Uint8Array(16)], "x.webp", { type: "image/webp" })
      expect((await uploadToLibrary(webp)).status).toBe(400)
      expect((await uploadToLibrary(png("empty.png", 0))).status).toBe(400)

      const { POST } = await import("./route")
      const res = await POST(json({ file: "nope" }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe("Missing file")
    }, 30_000)

    it("answers 502 and stores nothing when the upload itself fails", async () => {
      const before = await prisma.mediaAsset.count({ where: { org_id: orgId } })
      uploadFails = true
      expect((await uploadToLibrary()).status).toBe(502)
      expect(await prisma.mediaAsset.count({ where: { org_id: orgId } })).toBe(before)
    }, 30_000)

    it("lists with search, type and usage filters", async () => {
      const alpha = await (await uploadToLibrary(png("alpha-hero.png"))).json()
      const beta = await prisma.mediaAsset.create({
        data: {
          org_id: orgId,
          name: "beta-loop.mp4",
          resource_type: "video",
          cloudinary_public_id: `media-test/${orgId}/beta-${Date.now()}`,
          content_type: "video/mp4",
          size_bytes: 5000,
          width: 960,
          height: 320,
          created_by_clerk_user_id: USER,
        },
      })
      const campaign = await createCampaign()
      await prisma.campaignCreative.create({
        data: { campaign_id: campaign.id, media_asset_id: alpha.id },
      })

      const bySearch = await listIds("?search=ALPHA-he")
      expect(bySearch).toContain(alpha.id)
      expect(bySearch).not.toContain(beta.id)

      const videos = await listIds("?type=video")
      expect(videos).toContain(beta.id)
      expect(videos).not.toContain(alpha.id)

      const used = await listIds("?usage=used")
      expect(used).toContain(alpha.id)
      expect(used).not.toContain(beta.id)

      const unused = await listIds("?usage=unused")
      expect(unused).toContain(beta.id)
      expect(unused).not.toContain(alpha.id)
    }, 30_000)

    it("hides another org's file behind a 404 on every route", async () => {
      const asset = await (await uploadToLibrary(png("private.png"))).json()
      actingOrgId = otherOrgId

      const { PATCH, DELETE } = await import("./[id]/route")
      expect((await PATCH(json({ name: "Hijacked" }, "PATCH"), idParams(asset.id))).status).toBe(404)
      expect((await DELETE(bare("DELETE"), idParams(asset.id))).status).toBe(404)

      const { GET } = await import("./[id]/file/route")
      expect((await GET(bare("GET"), idParams(asset.id))).status).toBe(404)

      expect(await listIds("")).not.toContain(asset.id)
      expect((await prisma.mediaAsset.findUnique({ where: { id: asset.id } }))?.name).toBe(
        "private.png",
      )
    }, 30_000)

    it("renames, trimming the name and refusing a blank one", async () => {
      const asset = await (await uploadToLibrary()).json()
      const { PATCH } = await import("./[id]/route")

      const res = await PATCH(json({ name: "  Launch hero  " }, "PATCH"), idParams(asset.id))
      expect(res.status).toBe(200)
      expect((await res.json()).name).toBe("Launch hero")

      expect((await PATCH(json({ name: "   " }, "PATCH"), idParams(asset.id))).status).toBe(400)
    }, 30_000)

    it("deletes an unused file from the library and from storage", async () => {
      const asset = await (await uploadToLibrary()).json()
      const row = await prisma.mediaAsset.findUnique({ where: { id: asset.id } })

      const { DELETE } = await import("./[id]/route")
      expect((await DELETE(bare("DELETE"), idParams(asset.id))).status).toBe(200)

      expect(await prisma.mediaAsset.findUnique({ where: { id: asset.id } })).toBeNull()
      expect(destroyPrivateAsset).toHaveBeenCalledWith(row!.cloudinary_public_id, "image")
    }, 30_000)

    it("refuses to delete a file a campaign still uses, and names the campaign", async () => {
      const campaign = await createCampaign("taxi_top", orgId, "Kilimani Launch")
      const creative = await (await uploadInline(campaign.id)).json()

      const { DELETE } = await import("./[id]/route")
      const res = await DELETE(bare("DELETE"), idParams(creative.media_asset_id))
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toContain("Kilimani Launch")
      expect(body.issues.campaigns).toEqual([{ id: campaign.id, name: "Kilimani Launch" }])

      expect(
        await prisma.mediaAsset.findUnique({ where: { id: creative.media_asset_id } }),
      ).not.toBeNull()
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)

    it("streams the file through the proxy", async () => {
      const asset = await (await uploadToLibrary()).json()
      const { GET } = await import("./[id]/file/route")
      const res = await GET(bare("GET"), idParams(asset.id))
      expect(res.status).toBe(200)
      expect(res.headers.get("Content-Type")).toBe("image/png")
      expect(await res.text()).toBe("bytes")
    }, 30_000)
  })
```

In `apps/api/lib/advertiser-activity.test.ts`, inside `it("allows known triples and rejects unknown ones", …)`, add before the closing `})`:

```ts
    expect(
      isAdvertiserVisibleActivity({
        actor_type: "customer",
        action: "delete",
        entity_type: "media_asset",
      }),
    ).toBe(true)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -w api -- app/v1/customer/media/media-library.test.ts lib/advertiser-activity.test.ts`
Expected: FAIL — `Cannot find module './route'`, and the `media_asset` allowlist assertion fails.

- [ ] **Step 3: Extend the asset store**

In `apps/api/lib/media-asset-store.ts`:

Add to the imports:

```ts
import type { MediaAsset } from "@prisma/client"
```

change the contracts import to:

```ts
import {
  CREATIVE_FORMATS_LABEL,
  MEDIA_ASSET_NAME_MAX,
  type MediaAssetDto,
} from "@workspace/ops-contracts"
```

and add `import { prisma } from "@/lib/prisma"` after the `private-media` import.

Append to the file:

```ts
/** Which campaigns a file is on — for "used in N campaigns" and the delete guard. */
export const MEDIA_ASSET_INCLUDE = {
  attachments: { select: { campaign: { select: { id: true, name: true } } } },
} as const

export type MediaAssetWithCampaigns = MediaAsset & {
  attachments: { campaign: { id: number; name: string } }[]
}

/**
 * Returns the file only if this org owns it, and null otherwise — for both
 * "no such file" and "another org's file". Callers turn null into a 404, never
 * a 403, so nobody can enumerate the table. Same rule as getOwnedCampaign.
 */
export async function getOwnedMediaAsset(
  orgId: number,
  id: number,
): Promise<MediaAssetWithCampaigns | null> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: MEDIA_ASSET_INCLUDE,
  })
  if (!asset || asset.org_id !== orgId) return null
  return asset
}

export function toMediaAssetDto(asset: MediaAssetWithCampaigns): MediaAssetDto {
  // A file can sit in several slots of one campaign; people count campaigns.
  const campaigns = [
    ...new Map(asset.attachments.map((a) => [a.campaign.id, a.campaign])).values(),
  ]
  return {
    id: asset.id,
    name: asset.name,
    resource_type: asset.resource_type,
    content_type: asset.content_type,
    size_bytes: asset.size_bytes,
    width: asset.width,
    height: asset.height,
    // Prisma Decimal is not JSON-safe, so it crosses the wire as a string.
    duration_seconds: asset.duration_seconds?.toString() ?? null,
    original_filename: asset.original_filename,
    status: asset.status,
    source: asset.source,
    created_at: asset.created_at.toISOString(),
    campaigns,
  }
}
```

- [ ] **Step 4: Create the list and upload route**

Create `apps/api/app/v1/customer/media/route.ts`:

```ts
import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

import { paginatedResponse, paginationSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"
import {
  MEDIA_ASSET_INCLUDE,
  mediaAssetCreateData,
  storeCreativeFile,
  toMediaAssetDto,
} from "@/lib/media-asset-store"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const auth = await requireCustomerPermissionAccess("media:read")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const paging = paginationSchema.safeParse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 24,
  })
  if (!paging.success) return jsonError("Invalid page", 400)
  const { page, pageSize } = paging.data

  const search = searchParams.get("search")?.trim() || undefined
  const type = searchParams.get("type")
  const usage = searchParams.get("usage")

  const where: Prisma.MediaAssetWhereInput = {
    org_id: auth.access.orgId,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(type === "image" || type === "video" ? { resource_type: type } : {}),
    ...(usage === "used"
      ? { attachments: { some: {} } }
      : usage === "unused"
        ? { attachments: { none: {} } }
        : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: MEDIA_ASSET_INCLUDE,
    }),
    prisma.mediaAsset.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(rows.map(toMediaAssetDto), total, page, pageSize))
}

/** Uploads straight into the library. There is no campaign here, so there is
 * no panel to judge the file against — a 4:3 image is as "ready" as a 3:1 one.
 * Fit is checked when the file is attached to a campaign. */
export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return jsonError("Missing file", 400)

  const result = await storeCreativeFile(auth.access.orgId, file)
  if (result.error) return result.error

  const created = await prisma.mediaAsset.create({
    data: mediaAssetCreateData({
      orgId: auth.access.orgId,
      userId: auth.access.userId,
      file,
      stored: result.stored,
    }),
    include: MEDIA_ASSET_INCLUDE,
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "media_asset",
    entity_id: created.id,
    summary: `Media "${created.name}" uploaded (${created.resource_type})`,
  })

  return NextResponse.json(toMediaAssetDto(created), { status: 201 })
}
```

- [ ] **Step 5: Create the rename and delete route**

Create `apps/api/app/v1/customer/media/[id]/route.ts`:

```ts
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

import { mediaAssetRenameSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { destroyCampaignCreative } from "@/lib/campaign-creative-storage"
import { MEDIA_ASSET_INCLUDE, getOwnedMediaAsset, toMediaAssetDto } from "@/lib/media-asset-store"
import type { PrivateResourceType } from "@/lib/private-media"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, mediaAssetRenameSchema)
  if ("error" in parsed) return parsed.error

  const updated = await prisma.mediaAsset.update({
    where: { id },
    data: { name: parsed.data.name },
    include: MEDIA_ASSET_INCLUDE,
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "media_asset",
    entity_id: id,
    summary: `Media "${asset.name}" renamed to "${updated.name}"`,
  })

  return NextResponse.json(toMediaAssetDto(updated))
}

/** Refused while any campaign still uses the file: deleting it would silently
 * pull creative out of a campaign that may be approved and running. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  const { campaigns } = toMediaAssetDto(asset)
  if (campaigns.length > 0) {
    const names = campaigns.map((c) => `"${c.name}"`).join(", ")
    return jsonError(
      `"${asset.name}" is used by ${names}. Remove it from ${campaigns.length === 1 ? "that campaign" : "those campaigns"} first.`,
      409,
      { campaigns },
    )
  }

  try {
    await prisma.mediaAsset.delete({ where: { id } })
  } catch (error) {
    // Attached to a campaign between the check above and this delete. The
    // foreign key's Restrict is the backstop.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(`"${asset.name}" was just added to a campaign. Remove it there first.`, 409)
    }
    throw error
  }

  // Row first, storage second: a leftover Cloudinary file is unreachable and
  // harmless, a row pointing at a destroyed file is a broken library item.
  await destroyCampaignCreative(
    asset.cloudinary_public_id,
    asset.resource_type as PrivateResourceType,
  )

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "media_asset",
    entity_id: id,
    summary: `Media "${asset.name}" deleted`,
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: Create the file proxy**

Create `apps/api/app/v1/customer/media/[id]/file/route.ts`:

```ts
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { fetchCampaignCreative } from "@/lib/campaign-creative-storage"
import { getOwnedMediaAsset } from "@/lib/media-asset-store"
import type { PrivateResourceType } from "@/lib/private-media"

type Params = { params: Promise<{ id: string }> }

/** Private-serving proxy for a library file, the sibling of
 * /v1/customer/campaigns/:id/creatives/:creativeId/file. The org is checked
 * before a signed Cloudinary URL is minted server-side; that URL is fetched
 * here and streamed back, never handed to the browser. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:read")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  let upstream: Response
  try {
    upstream = await fetchCampaignCreative(
      asset.cloudinary_public_id,
      asset.resource_type as PrivateResourceType,
      asset.content_type,
    )
  } catch (error) {
    console.error("[customer media file]", error)
    return jsonError("Failed to load file", 502)
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": asset.content_type,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
```

- [ ] **Step 7: Show library actions in the advertiser activity feed**

In `apps/api/lib/advertiser-activity.ts`, add to `ADVERTISER_ACTIVITY_ALLOWLIST` after the two `campaign_creative` lines:

```ts
  { actor_type: "customer", action: "create", entity_type: "media_asset" },
  { actor_type: "customer", action: "update", entity_type: "media_asset" },
  { actor_type: "customer", action: "delete", entity_type: "media_asset" },
```

and in `baseLabel`, after the `"delete:campaign_creative"` case:

```ts
    case "create:media_asset":
      return "Media uploaded"
    case "update:media_asset":
      return "Media renamed"
    case "delete:media_asset":
      return "Media deleted"
```

- [ ] **Step 8: Run tests and typecheck**

Run: `npm run test -w api -- app/v1/customer/media/media-library.test.ts lib/advertiser-activity.test.ts`
Expected: PASS (14 tests in `media-library.test.ts`).

Run: `npm run typecheck -w api && npm run lint -w api`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/api/lib/media-asset-store.ts apps/api/lib/advertiser-activity.ts apps/api/lib/advertiser-activity.test.ts apps/api/app/v1/customer/media
git commit -m "feat(api): media library routes — list, upload, rename, delete, file proxy"
```

---

### Task 5: Attach a library file to a campaign

**Files:**
- Modify: `apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts`
- Test: `apps/api/app/v1/customer/media/media-library.test.ts`

**Interfaces:**
- Consumes: `campaignCreativeAttachSchema` (Task 1); `getOwnedMediaAsset` (Task 4); `checkAgainstFormat`, `formatMismatch` (Task 3, same file).
- Produces, HTTP: `POST /v1/customer/campaigns/[id]/creatives` with `Content-Type: application/json` and body `{ mediaAssetId: number, slot?: string }` → `201` `CampaignCreativeDto & { warning: string | null }`; `404` if the file is not this org's; `400` with `issues.specs` if it does not fit the panel; `409` if already attached in that slot. A multipart body keeps the Task 3 behaviour.

- [ ] **Step 1: Write the failing tests**

In `media-library.test.ts`, add this helper after `listIds`:

```ts
async function attach(campaignId: number, mediaAssetId: number) {
  const { POST } = await import("../campaigns/[id]/creatives/route")
  return POST(json({ mediaAssetId }), idParams(campaignId))
}
```

and add this block inside `describe("media library")`, after `describe("library routes")`:

```ts
  describe("attaching a library file", () => {
    it("attaches without uploading anything again", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      const before = await prisma.mediaAsset.count({ where: { org_id: orgId } })

      const res = await attach(campaign.id, asset.id)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({ media_asset_id: asset.id, slot: "all", warning: null })
      expect(await prisma.mediaAsset.count({ where: { org_id: orgId } })).toBe(before)
    }, 30_000)

    it("keeps the file and the other attachment when one of two campaigns is deleted", async () => {
      const asset = await (await uploadToLibrary()).json()
      const first = await createCampaign()
      const second = await createCampaign()
      expect((await attach(first.id, asset.id)).status).toBe(201)
      expect((await attach(second.id, asset.id)).status).toBe(201)

      const { DELETE } = await import("../campaigns/[id]/route")
      expect((await DELETE(bare("DELETE"), idParams(first.id))).status).toBe(200)

      expect(await prisma.mediaAsset.findUnique({ where: { id: asset.id } })).not.toBeNull()
      expect(
        await prisma.campaignCreative.count({
          where: { campaign_id: second.id, media_asset_id: asset.id },
        }),
      ).toBe(1)
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)

    it("lets a file rejected for one panel be attached to a campaign it does fit", async () => {
      nextDims = { width: 320, height: 320 }
      const square = await (await uploadToLibrary(png("square.png"))).json()
      const taxi = await createCampaign("taxi_top")
      const bike = await createCampaign("delivery_bike")

      const rejected = await attach(taxi.id, square.id)
      expect(rejected.status).toBe(400)
      expect((await rejected.json()).issues.specs[0].label).toBe("Taxi-top LED")

      expect((await attach(bike.id, square.id)).status).toBe(201)
    }, 30_000)

    it("answers 404 for another org's file", async () => {
      const campaign = await createCampaign()
      actingOrgId = otherOrgId
      const foreign = await (await uploadToLibrary(png("foreign.png"))).json()
      actingOrgId = orgId

      expect((await attach(campaign.id, foreign.id)).status).toBe(404)
      expect(await prisma.campaignCreative.count({ where: { campaign_id: campaign.id } })).toBe(0)
    }, 30_000)

    it("answers 409 when the same file is attached twice", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      expect((await attach(campaign.id, asset.id)).status).toBe(201)
      expect((await attach(campaign.id, asset.id)).status).toBe(409)
      expect(await prisma.campaignCreative.count({ where: { campaign_id: campaign.id } })).toBe(1)
    }, 30_000)

    it("refuses while the campaign is under review", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "submitted" } })
      expect((await attach(campaign.id, asset.id)).status).toBe(409)
    }, 30_000)

    it("still lets ops open an attached library file", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      const creative = await (await attach(campaign.id, asset.id)).json()

      const { GET } = await import("../../campaigns/[id]/creatives/[creativeId]/file/route")
      const res = await GET(bare("GET"), creativeParams(campaign.id, creative.id))
      expect(res.status).toBe(200)
      expect(res.headers.get("Content-Type")).toBe("image/png")
    }, 30_000)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -w api -- app/v1/customer/media/media-library.test.ts`
Expected: FAIL — the attach requests get `400 "Missing file"` instead of `201`.

- [ ] **Step 3: Implement the attach path**

In `apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts`:

Add `import { Prisma } from "@prisma/client"` as the first import. Add `campaignCreativeAttachSchema,` to the `@workspace/ops-contracts` import list. Change the api-utils import to `import { jsonError, parseId, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"`. Change the store imports to:

```ts
import { EDITABLE_STATUSES, getOwnedCampaign, type CampaignWithCreatives } from "@/lib/campaign-store"
import { getOwnedMediaAsset, mediaAssetCreateData, storeCreativeFile } from "@/lib/media-asset-store"
```

Add a type after `type Params`:

```ts
type Actor = { userId: string; orgId: number }
```

Replace the `POST` function with these three functions:

```ts
/**
 * Two ways to add creative to a campaign, one endpoint:
 *  - multipart `file`: upload a new file (it also lands in the Media Library)
 *  - JSON `{ mediaAssetId }`: attach a file already in the library
 * Either way the file is checked against this campaign's panel before it is
 * attached.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("creatives:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Creative can't be changed while status is "${campaign.status}"`, 409)
  }
  if (campaign.creatives.length >= MAX_CREATIVES_PER_CAMPAIGN) {
    return jsonError(`A campaign can hold at most ${MAX_CREATIVES_PER_CAMPAIGN} creatives`, 400)
  }

  const isJson = req.headers.get("content-type")?.includes("application/json") ?? false
  return isJson
    ? attachFromLibrary(req, campaign, auth.access)
    : uploadInline(req, campaign, auth.access)
}

async function attachFromLibrary(req: Request, campaign: CampaignWithCreatives, actor: Actor) {
  const parsed = await parseJsonBody(req, campaignCreativeAttachSchema)
  if ("error" in parsed) return parsed.error

  const asset = await getOwnedMediaAsset(actor.orgId, parsed.data.mediaAssetId)
  if (!asset) return jsonError("That file isn't in your media library", 404)

  const format = campaign.format as CampaignFormat
  const check = checkAgainstFormat(format, asset.width, asset.height)
  if (!check.ok) return formatMismatch(format, check.message)

  let created
  try {
    created = await prisma.campaignCreative.create({
      data: { campaign_id: campaign.id, media_asset_id: asset.id, slot: parsed.data.slot },
      include: { media_asset: true },
    })
  } catch (error) {
    // The unique index on (campaign, file, slot) is what stops a double click
    // from attaching the same file twice.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("That file is already on this campaign", 409)
    }
    throw error
  }

  await auditFromCustomerUser(actor.userId, {
    action: "create",
    entity_type: "campaign_creative",
    entity_id: created.id,
    summary: `Campaign #${campaign.id} creative attached from library ("${asset.name}")`,
  })

  return NextResponse.json(
    { ...toCampaignCreativeDto(created), warning: check.level === "warn" ? check.message : null },
    { status: 201 },
  )
}

async function uploadInline(req: Request, campaign: CampaignWithCreatives, actor: Actor) {
  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return jsonError("Missing file", 400)

  const slotParsed = campaignCreativeSlotSchema.safeParse(form?.get("slot") ?? "all")
  if (!slotParsed.success) return jsonError("Invalid slot", 400)

  const result = await storeCreativeFile(actor.orgId, file)
  if (result.error) return result.error
  const { stored } = result

  const format = campaign.format as CampaignFormat
  const check = checkAgainstFormat(format, stored.uploaded.width, stored.uploaded.height)
  if (!check.ok) {
    // Roll the upload back: the advertiser picked this file for this campaign,
    // so a file that can't run here shouldn't be left sitting in their library.
    await destroyCampaignCreative(stored.uploaded.publicId, stored.resourceType)
    return formatMismatch(format, check.message)
  }

  const created = await prisma.campaignCreative.create({
    data: {
      campaign: { connect: { id: campaign.id } },
      slot: slotParsed.data,
      // Every upload lands in the org's Media Library, so it can be reused on
      // another campaign without uploading it again.
      media_asset: {
        create: mediaAssetCreateData({ orgId: actor.orgId, userId: actor.userId, file, stored }),
      },
    },
    include: { media_asset: true },
  })

  await auditFromCustomerUser(actor.userId, {
    action: "create",
    entity_type: "campaign_creative",
    entity_id: created.id,
    summary: `Campaign #${campaign.id} creative uploaded (${stored.resourceType})`,
  })

  return NextResponse.json(
    // A "warn" is not a failure — the creative is saved and the UI surfaces
    // the note so the advertiser can decide whether to replace it.
    { ...toCampaignCreativeDto(created), warning: check.level === "warn" ? check.message : null },
    { status: 201 },
  )
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm run test -w api -- app/v1/customer/media/media-library.test.ts`
Expected: PASS (21 tests).

Run: `npm run typecheck -w api && npm run lint -w api`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts" apps/api/app/v1/customer/media/media-library.test.ts
git commit -m "feat(api): attach a media library file to a campaign"
```

---

### Task 6: Org deletion and "untouched org" account for library files

**Files:**
- Modify: `apps/api/lib/advertiser-org.ts`
- Test: `apps/api/app/v1/customer/media/media-library.test.ts`

**Interfaces:**
- Produces: `getOrgDetachmentImpact(orgId)` now returns `{ campaignCount, supportCaseCount, mediaAssetCount }`; `isUntouchedSoloOrg` is false when the org has any library file; `detachAndDeleteOrg(orgId)` deletes unused files (row and Cloudinary) and leaves in-use ones with `org_id = null`.

Client copy for the delete/accept confirmations is unchanged: it already falls back to a generic sentence when it has no counts to name.

- [ ] **Step 1: Write the failing tests**

Add this block inside `describe("media library")`, after `describe("attaching a library file")`:

```ts
  describe("org deletion", () => {
    it("removes unused files and keeps the ones a campaign still uses", async () => {
      const doomed = await prisma.advertiserOrg.create({ data: { name: "Doomed Org" } })
      extraOrgIds.push(doomed.id)
      actingOrgId = doomed.id

      const campaign = await createCampaign("taxi_top", doomed.id)
      const used = await (await uploadInline(campaign.id, png("used.png"))).json()
      const unused = await (await uploadToLibrary(png("unused.png"))).json()
      destroyPrivateAsset.mockClear()

      const { detachAndDeleteOrg, getOrgDetachmentImpact } = await import("@/lib/advertiser-org")
      expect((await getOrgDetachmentImpact(doomed.id)).mediaAssetCount).toBe(2)

      await detachAndDeleteOrg(doomed.id)

      expect(await prisma.advertiserOrg.findUnique({ where: { id: doomed.id } })).toBeNull()
      expect(await prisma.mediaAsset.findUnique({ where: { id: unused.id } })).toBeNull()
      expect(destroyPrivateAsset).toHaveBeenCalledTimes(1)

      const kept = await prisma.mediaAsset.findUnique({ where: { id: used.media_asset_id } })
      expect(kept).not.toBeNull()
      expect(kept?.org_id).toBeNull()

      // Ops keeps the detached campaign, and can still open its creative.
      const { GET } = await import("../../campaigns/[id]/creatives/[creativeId]/file/route")
      const res = await GET(bare("GET"), creativeParams(campaign.id, used.id))
      expect(res.status).toBe(200)
    }, 60_000)

    it("does not treat an org that holds library files as untouched", async () => {
      const solo = await prisma.advertiserOrg.create({ data: { name: "My Organization" } })
      extraOrgIds.push(solo.id)
      await prisma.advertiserMember.create({
        data: { org_id: solo.id, clerk_user_id: `${USER}-solo`, is_owner: true },
      })

      const { isUntouchedSoloOrg } = await import("@/lib/advertiser-org")
      expect(await isUntouchedSoloOrg(solo.id, true)).toBe(true)

      actingOrgId = solo.id
      await uploadToLibrary(png("only-thing-here.png"))
      expect(await isUntouchedSoloOrg(solo.id, true)).toBe(false)
    }, 30_000)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -w api -- app/v1/customer/media/media-library.test.ts`
Expected: FAIL — `mediaAssetCount` is `undefined`; the unused file still exists after deletion; `isUntouchedSoloOrg` stays `true`.

- [ ] **Step 3: Implement**

In `apps/api/lib/advertiser-org.ts`:

Add after the existing imports:

```ts
import type { PrivateResourceType } from "@/lib/private-media"
```

Replace `getOrgDetachmentImpact` (keep its doc comment, and append to it the sentence "Library files nobody uses are deleted outright; see detachAndDeleteOrg.") with:

```ts
export async function getOrgDetachmentImpact(
  orgId: number,
): Promise<{ campaignCount: number; supportCaseCount: number; mediaAssetCount: number }> {
  const [campaignCount, supportCaseCount, mediaAssetCount] = await Promise.all([
    prisma.campaign.count({ where: { org_id: orgId } }),
    prisma.supportCase.count({ where: { org_id: orgId } }),
    prisma.mediaAsset.count({ where: { org_id: orgId } }),
  ])
  return { campaignCount, supportCaseCount, mediaAssetCount }
}
```

In `isUntouchedSoloOrg`, add one condition to the returned expression, after `impact.supportCaseCount === 0 &&`:

```ts
    impact.mediaAssetCount === 0 &&
```

Replace `detachAndDeleteOrg` with:

```ts
/** Detaches an org's retained rows and deletes it. Campaigns and support cases
 * survive for the ops record; members/invitations/custom roles cascade.
 *
 * Library files split two ways. A file no campaign uses belongs to nobody once
 * the org is gone, so it is deleted, here and in storage. A file a campaign
 * still uses must stay, or the detached campaign would lose its creative — the
 * foreign key sets its org_id to null when the org row goes. */
export async function detachAndDeleteOrg(orgId: number): Promise<void> {
  const unused = await prisma.$transaction(async (tx) => {
    const unusedAssets = await tx.mediaAsset.findMany({
      where: { org_id: orgId, attachments: { none: {} } },
      select: { id: true, cloudinary_public_id: true, resource_type: true },
    })
    await tx.mediaAsset.deleteMany({ where: { id: { in: unusedAssets.map((a) => a.id) } } })
    await tx.campaign.updateMany({ where: { org_id: orgId }, data: { org_id: null } })
    await tx.supportCase.updateMany({ where: { org_id: orgId }, data: { org_id: null } })
    await tx.advertiserOrg.delete({ where: { id: orgId } })
    return unusedAssets
  })

  if (unused.length === 0) return
  // Loaded on demand: this module is imported by nearly every customer route,
  // and almost none of them should pay for the Cloudinary SDK.
  const { destroyPrivateAsset } = await import("@/lib/private-media")
  for (const asset of unused) {
    await destroyPrivateAsset(asset.cloudinary_public_id, asset.resource_type as PrivateResourceType)
  }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm run test -w api`
Expected: PASS — the whole suite, including `media-library.test.ts` (23 tests) and the existing invitation/org tests.

Run: `npm run typecheck -w api && npm run lint -w api`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/advertiser-org.ts apps/api/app/v1/customer/media/media-library.test.ts
git commit -m "feat(api): account for media library files when an org is deleted"
```

---

### Task 7: customer-web — Media page

`apps/customer-web` has no test runner. This task is verified by typecheck, lint and the manual check in Step 9.

**Files:**
- Modify: `apps/customer-web/lib/campaigns-client.ts` (export two helpers)
- Create: `apps/customer-web/lib/media-client.ts`
- Create: `apps/customer-web/lib/use-media.ts`
- Modify: `apps/customer-web/lib/use-campaigns.ts`
- Create: `apps/customer-web/components/media/blob-preview.tsx`
- Create: `apps/customer-web/components/media/media-grid.tsx`
- Create: `apps/customer-web/components/media/media-library-view.tsx`
- Create: `apps/customer-web/app/(shell)/media/page.tsx`, `apps/customer-web/app/(shell)/media/loading.tsx`
- Modify: `apps/customer-web/components/campaigns/creative-upload-field.tsx` (use `BlobPreview`)
- Modify: `apps/customer-web/lib/navigation.ts`

**Interfaces:**
- Consumes: the Task 4 HTTP routes; `MediaAssetDto`, `MEDIA_ASSET_NAME_MAX` (Task 1).
- Produces:
  - `media-client.ts`: `MEDIA_QUERY_KEY`, `type MediaFilter = "all" | "image" | "video" | "used" | "unused"`, `type MediaListParams = { page: number; search: string; filter: MediaFilter }`, `type MediaPage`, `listMedia`, `uploadMedia`, `renameMedia`, `deleteMedia`, `fetchMediaBlob`.
  - `use-media.ts`: `useMedia(params)`, `useUploadMedia()`, `useRenameMedia()`, `useDeleteMedia()`.
  - `blob-preview.tsx`: `BlobPreview({ queryKey, load, isVideo, alt, lazy? })`.
  - `media-grid.tsx`: `MediaGrid({ selection? })` and `type MediaSelection = { format: CampaignFormat; attachedAssetIds: number[]; pendingAssetId: number | null; onSelect: (asset: MediaAssetDto) => void }`. Without `selection` it is the full manage view; with it, a picker.

- [ ] **Step 1: Export the shared fetch helpers**

In `apps/customer-web/lib/campaigns-client.ts`, change `async function authedFetch(` to `export async function authedFetch(` and `function jsonInit(` to `export function jsonInit(`.

- [ ] **Step 2: Create the client**

Create `apps/customer-web/lib/media-client.ts`:

```ts
import type { MediaAssetDto } from "@workspace/ops-contracts"

import { authedFetch, jsonInit, type GetToken } from "@/lib/campaigns-client"

/** Root query key for everything the Media Library lists. Campaign mutations
 * invalidate it too, because attaching or removing a creative changes a
 * file's "used in" count. */
export const MEDIA_QUERY_KEY = ["customer-media"] as const

export type MediaFilter = "all" | "image" | "video" | "used" | "unused"

export type MediaListParams = { page: number; search: string; filter: MediaFilter }

export type MediaPage = {
  items: MediaAssetDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const PAGE_SIZE = 24

export async function listMedia(getToken: GetToken, params: MediaListParams): Promise<MediaPage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(PAGE_SIZE) })
  if (params.search) query.set("search", params.search)
  if (params.filter === "image" || params.filter === "video") query.set("type", params.filter)
  if (params.filter === "used" || params.filter === "unused") query.set("usage", params.filter)

  const res = await authedFetch(getToken, `/v1/customer/media?${query}`)
  return res.json()
}

export async function uploadMedia(getToken: GetToken, file: File): Promise<MediaAssetDto> {
  const form = new FormData()
  form.append("file", file)
  // Content-Type is deliberately unset: the browser must add the multipart
  // boundary, and setting it by hand produces a body the server can't parse.
  const res = await authedFetch(getToken, "/v1/customer/media", { method: "POST", body: form })
  return res.json()
}

export async function renameMedia(
  getToken: GetToken,
  id: number,
  name: string,
): Promise<MediaAssetDto> {
  const res = await authedFetch(getToken, `/v1/customer/media/${id}`, jsonInit("PATCH", { name }))
  return res.json()
}

export async function deleteMedia(getToken: GetToken, id: number): Promise<void> {
  await authedFetch(getToken, `/v1/customer/media/${id}`, { method: "DELETE" })
}

/** Bytes via the authenticated proxy. Turn the Blob into an object URL — never
 * point an <img src> at Cloudinary, which this deliberately is not. */
export async function fetchMediaBlob(getToken: GetToken, id: number): Promise<Blob> {
  const res = await authedFetch(getToken, `/v1/customer/media/${id}/file`)
  return res.blob()
}
```

- [ ] **Step 3: Create the hooks**

Create `apps/customer-web/lib/use-media.ts`:

```ts
"use client"

import { useAuth } from "@clerk/nextjs"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  MEDIA_QUERY_KEY,
  deleteMedia,
  listMedia,
  renameMedia,
  uploadMedia,
  type MediaListParams,
} from "@/lib/media-client"

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong"
}

export function useMedia(params: MediaListParams) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, params],
    queryFn: () => listMedia(getToken, params),
    // Keeps the grid on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
  })
}

function useInvalidateMedia() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
}

export function useUploadMedia() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: (file: File) => uploadMedia(getToken, file),
    onSuccess: (asset) => {
      invalidate()
      toast.success(`"${asset.name}" added to your library`)
    },
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useRenameMedia() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameMedia(getToken, id, name),
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useDeleteMedia() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: (id: number) => deleteMedia(getToken, id),
    onSuccess: () => {
      invalidate()
      toast.success("File deleted")
    },
    // A 409 here carries the server's sentence naming the campaigns still
    // using the file — exactly what the user needs to read.
    onError: (error) => toast.error(messageOf(error)),
  })
}
```

In `apps/customer-web/lib/use-campaigns.ts`, add `import { MEDIA_QUERY_KEY } from "@/lib/media-client"` after the `@/lib/campaigns-client` import, and in `useInvalidate` add one line after the `LIST_KEY` invalidation:

```ts
    // Uploading, attaching, removing or deleting changes which library files
    // are in use.
    void queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
```

- [ ] **Step 4: Extract the shared preview**

Create `apps/customer-web/components/media/blob-preview.tsx`:

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Film } from "lucide-react"

import { ImageLightbox } from "@workspace/ui/components/image-lightbox"
import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Preview of a private file fetched through an authenticated proxy. Used by a
 * campaign's creative tiles and by the Media Library grid.
 *
 * `lazy` waits for a click before fetching. The library grid sets it for
 * video: a page of 24 creatives could otherwise pull down 24 files of up to
 * 50MB each just to draw the grid.
 */
export function BlobPreview({
  queryKey,
  load,
  isVideo,
  alt,
  lazy = false,
}: {
  queryKey: readonly unknown[]
  load: () => Promise<Blob>
  isVideo: boolean
  alt: string
  lazy?: boolean
}) {
  const [wanted, setWanted] = useState(!lazy)
  const blobQuery = useQuery({ queryKey, queryFn: load, enabled: wanted })

  // The Blob is cached; the object URL derived from it is not — it's revoked
  // on unmount, so caching the URL string would let a revoked URL leak into
  // another consumer of the same cache entry.
  const url = useMemo(
    () => (blobQuery.data ? URL.createObjectURL(blobQuery.data) : null),
    [blobQuery.data],
  )
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  if (!wanted) {
    return (
      <button
        type="button"
        onClick={() => setWanted(true)}
        className="flex h-32 w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted"
      >
        <Film className="size-5" aria-hidden />
        <span className="font-medium text-foreground">Load preview</span>
      </button>
    )
  }

  if (url) {
    return isVideo ? (
      <video src={url} controls className="h-32 w-full bg-black object-contain" />
    ) : (
      <ImageLightbox src={url} alt={alt}>
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL from an authenticated blob, not a remote asset next/image can optimize */}
        <img src={url} alt={alt} className="h-32 w-full object-contain" />
      </ImageLightbox>
    )
  }

  if (blobQuery.isError) {
    return (
      <button
        type="button"
        onClick={() => void blobQuery.refetch()}
        className="flex h-32 w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted"
      >
        <span>Couldn&apos;t load preview</span>
        <span className="font-medium text-foreground">Click to retry</span>
      </button>
    )
  }

  return <Skeleton className="h-32 w-full" />
}
```

In `apps/customer-web/components/campaigns/creative-upload-field.tsx`:
- Replace `import { useEffect, useMemo, useRef, useState } from "react"` with `import { useRef, useState } from "react"`.
- Delete the `useQuery`, `ImageLightbox` and `Skeleton` import lines.
- Add `import { BlobPreview } from "@/components/media/blob-preview"` after the `cn` import.
- In `CreativeThumb`, delete everything from `const blobQuery = useQuery({` down to the end of the `const preview = … )` expression, and replace the `{preview}` line in its JSX with:

```tsx
      <BlobPreview
        queryKey={["campaign-creative-blob", campaignId, creative.id]}
        load={() => fetchCreativeBlob(getToken, campaignId, creative.id)}
        isVideo={isVideo}
        alt={creative.original_filename ?? "Creative"}
      />
```

- [ ] **Step 5: Create the grid**

Create `apps/customer-web/components/media/media-grid.tsx`:

```tsx
"use client"

import { useAuth } from "@clerk/nextjs"

import { useEffect, useState } from "react"
import { CircleCheck, Film, Pencil, Search, Trash2, TriangleAlert } from "lucide-react"
import {
  MEDIA_ASSET_NAME_MAX,
  checkCreativeForFormat,
  formatBytes,
  type CampaignFormat,
  type MediaAssetDto,
} from "@workspace/ops-contracts"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { BlobPreview } from "@/components/media/blob-preview"
import { fetchMediaBlob, type MediaFilter } from "@/lib/media-client"
import { useDeleteMedia, useMedia, useRenameMedia } from "@/lib/use-media"
import { useOrgPermissions } from "@/lib/use-org"

const FILTERS: { value: MediaFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "used", label: "Used" },
  { value: "unused", label: "Unused" },
]

/** Present when the grid is a picker for one campaign's creative step. */
export type MediaSelection = {
  /** The campaign's panel format — drives each file's fit badge. */
  format: CampaignFormat
  /** Files already on the campaign. */
  attachedAssetIds: number[]
  /** File currently being attached, so its button can show progress. */
  pendingAssetId: number | null
  onSelect: (asset: MediaAssetDto) => void
}

function usageLabel(asset: MediaAssetDto): string {
  const count = asset.campaigns.length
  return count === 0 ? "Not used yet" : `Used in ${count} campaign${count === 1 ? "" : "s"}`
}

function specLine(asset: MediaAssetDto): string {
  const parts: string[] = []
  if (asset.width && asset.height) parts.push(`${asset.width} x ${asset.height}`)
  if (asset.duration_seconds) parts.push(`${Number(asset.duration_seconds).toFixed(1)}s`)
  parts.push(formatBytes(asset.size_bytes))
  return parts.join(" · ")
}

/** Same rule the API applies on attach, so the badge never promises a file the
 * server will refuse. Unknown dimensions pass, as they do server-side. */
function fitFor(asset: MediaAssetDto, format: CampaignFormat): "ok" | "warn" | "fail" {
  if (asset.width == null || asset.height == null) return "ok"
  return checkCreativeForFormat(format, asset.width, asset.height).level
}

function FitBadge({ fit }: { fit: "ok" | "warn" | "fail" }) {
  if (fit === "ok") {
    return (
      <Badge variant="secondary">
        <CircleCheck aria-hidden />
        Ready for campaign
      </Badge>
    )
  }
  return (
    <Badge variant={fit === "warn" ? "outline" : "destructive"}>
      <TriangleAlert aria-hidden />
      {fit === "warn" ? "May look soft" : "Wrong shape"}
    </Badge>
  )
}

function MediaCard({
  asset,
  selection,
  canWrite,
  onRename,
  onDelete,
}: {
  asset: MediaAssetDto
  selection?: MediaSelection
  canWrite: boolean
  onRename: () => void
  onDelete: () => void
}) {
  const { getToken } = useAuth()
  const isVideo = asset.resource_type === "video"
  const fit = selection ? fitFor(asset, selection.format) : null
  const alreadyAdded = selection?.attachedAssetIds.includes(asset.id) ?? false

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-muted/20">
      <BlobPreview
        queryKey={["media-asset-blob", asset.id]}
        load={() => fetchMediaBlob(getToken, asset.id)}
        isVideo={isVideo}
        alt={asset.name}
        lazy={isVideo}
      />

      <div className="flex flex-1 flex-col gap-2 border-t border-border p-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {isVideo ? <Film className="size-3.5 shrink-0" aria-hidden /> : null}
            <span className="truncate" title={asset.name}>
              {asset.name}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{specLine(asset)}</p>
          <p className="text-xs text-muted-foreground">{usageLabel(asset)}</p>
        </div>

        {selection && fit ? (
          <div className="mt-auto flex flex-col gap-2">
            <FitBadge fit={fit} />
            <Button
              type="button"
              size="sm"
              disabled={fit === "fail" || alreadyAdded || selection.pendingAssetId != null}
              loading={selection.pendingAssetId === asset.id}
              onClick={() => selection.onSelect(asset)}
            >
              {alreadyAdded ? "Already added" : "Use this file"}
            </Button>
          </div>
        ) : canWrite ? (
          <div className="mt-auto flex justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onRename}
              aria-label={`Rename ${asset.name}`}
            >
              <Pencil className="size-3.5" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onDelete}
              aria-label={`Delete ${asset.name}`}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * The Media Library grid. One component, two uses: the full Media page
 * (no `selection`: rename and delete) and the campaign wizard's picker
 * (`selection`: a fit badge and a "Use this file" button per file).
 */
export function MediaGrid({ selection }: { selection?: MediaSelection }) {
  const { can } = useOrgPermissions()
  const canWrite = !selection && can("media:write")

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<MediaFilter>("all")
  const [page, setPage] = useState(1)

  const [renaming, setRenaming] = useState<MediaAssetDto | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleting, setDeleting] = useState<MediaAssetDto | null>(null)

  const rename = useRenameMedia()
  const remove = useDeleteMedia()

  // Wait for a pause in typing before asking the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const mediaQuery = useMedia({ page, search, filter })
  const data = mediaQuery.data
  const filtering = search !== "" || filter !== "all"

  function submitRename() {
    if (!renaming) return
    const name = renameValue.trim()
    if (!name) return
    rename.mutate({ id: renaming.id, name }, { onSuccess: () => setRenaming(null) })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name"
            aria-label="Search media by name"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter media">
          {FILTERS.map((item) => {
            const active = filter === item.value
            return (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                className={cn(!active && "text-muted-foreground")}
                onClick={() => {
                  setFilter(item.value)
                  setPage(1)
                }}
              >
                {item.label}
              </Button>
            )
          })}
        </div>
      </div>

      {mediaQuery.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : mediaQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <p className="text-sm font-medium">Couldn&apos;t load your media</p>
          <p className="max-w-sm text-sm text-muted-foreground">{mediaQuery.error.message}</p>
          <Button type="button" variant="outline" onClick={() => void mediaQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <p className="text-sm font-medium">
            {filtering ? "Nothing matches" : "Your library is empty"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {filtering
              ? "Try another search or filter."
              : "Upload a creative once and reuse it on any campaign."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              selection={selection}
              canWrite={canWrite}
              onRename={() => {
                setRenameValue(asset.name)
                setRenaming(asset)
              }}
              onDelete={() => setDeleting(asset)}
            />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Dialog open={renaming != null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitRename()
            }}
          >
            <Input
              autoFocus
              value={renameValue}
              maxLength={MEDIA_ASSET_NAME_MAX}
              onChange={(event) => setRenameValue(event.target.value)}
              aria-label="File name"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={rename.isPending} disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting != null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          {deleting && deleting.campaigns.length > 0 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>This file is in use</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{deleting.name}&rdquo; is used by{" "}
                  {deleting.campaigns.map((campaign) => campaign.name).join(", ")}. Remove it from{" "}
                  {deleting.campaigns.length === 1 ? "that campaign" : "those campaigns"} before
                  deleting it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{deleting?.name}&rdquo; will be removed from your library for everyone in
                  your organization. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deleting) remove.mutate(deleting.id)
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 6: Create the page view**

Create `apps/customer-web/components/media/media-library-view.tsx`:

```tsx
"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import {
  CREATIVE_FILE_EXTENSIONS,
  CREATIVE_FORMATS_LABEL,
  MAX_CREATIVE_BYTES,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { MediaGrid } from "@/components/media/media-grid"
import { useUploadMedia } from "@/lib/use-media"
import { useOrgPermissions } from "@/lib/use-org"

const ACCEPT = CREATIVE_FILE_EXTENSIONS.join(",")
const MAX_MB = Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)

export function MediaLibraryView() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useUploadMedia()
  const { can } = useOrgPermissions()

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    for (const file of Array.from(files)) {
      if (file.size > MAX_CREATIVE_BYTES) {
        setError(`${file.name} is over ${MAX_MB}MB.`)
        continue
      }
      // The hook toasts the reason on failure; keep going with the rest.
      await upload.mutateAsync(file).catch(() => null)
    }

    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Media</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload a creative once and reuse it on any campaign. {CREATIVE_FORMATS_LABEL}, up to{" "}
            {MAX_MB}MB each.
          </p>
        </div>
        {can("media:write") ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <Button
              type="button"
              loading={upload.isPending}
              loadingText="Uploading…"
              onClick={() => inputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Upload
            </Button>
          </>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <MediaGrid />
    </div>
  )
}
```

- [ ] **Step 7: Create the route**

Create `apps/customer-web/app/(shell)/media/page.tsx`:

```tsx
import { MediaLibraryView } from "@/components/media/media-library-view"

export const metadata = { title: "Media" }

export default function MediaPage() {
  return <MediaLibraryView />
}
```

Create `apps/customer-web/app/(shell)/media/loading.tsx`:

```tsx
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function MediaLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Add the sidebar entry**

In `apps/customer-web/lib/navigation.ts`, add `Images,` to the `lucide-react` import list (after `HelpCircle,`), and add this item to `appNavItems` directly after the `/campaigns` item:

```ts
  {
    href: "/media",
    label: "Media",
    icon: Images,
    description: "Upload creative once and reuse it across campaigns.",
  },
```

- [ ] **Step 9: Verify**

Run: `npm run typecheck -w customer-web && npm run lint -w customer-web`
Expected: PASS

Manual check — run `npm run dev` from the repo root, sign in to customer-web, and confirm:
1. **Media** appears in the sidebar under Campaigns and opens `/media`.
2. Creatives uploaded to campaigns before this change are listed (they came through the Task 2 backfill), each showing "Used in 1 campaign".
3. Upload a PNG: it appears at the top with "Not used yet". Upload a `.webp`: a toast says the format isn't supported.
4. Search by part of a name narrows the grid; each filter chip changes the list.
5. Rename a file; the new name shows without a reload.
6. Delete on an in-use file explains which campaign uses it and offers no Delete button. Delete on an unused file removes it.
7. Open an existing campaign: its creative thumbnails still load.

- [ ] **Step 10: Commit**

```bash
git add apps/customer-web/lib/campaigns-client.ts apps/customer-web/lib/media-client.ts apps/customer-web/lib/use-media.ts apps/customer-web/lib/use-campaigns.ts apps/customer-web/lib/navigation.ts apps/customer-web/components/media apps/customer-web/components/campaigns/creative-upload-field.tsx "apps/customer-web/app/(shell)/media"
git commit -m "feat(customer-web): media library page"
```

---

### Task 8: customer-web — pick from the library in the creative step

**Files:**
- Modify: `apps/customer-web/lib/campaigns-client.ts`
- Modify: `apps/customer-web/lib/use-campaigns.ts`
- Modify: `apps/customer-web/components/campaigns/creative-upload-field.tsx`

**Interfaces:**
- Consumes: `MediaGrid`, `MediaSelection` (Task 7); the Task 5 attach endpoint.
- Produces: `attachMediaAsset(getToken, campaignId, mediaAssetId, slot?)` in `campaigns-client.ts`; `useAttachMediaAsset(campaignId)` in `use-campaigns.ts`.

- [ ] **Step 1: Add the client call**

In `apps/customer-web/lib/campaigns-client.ts`, add after `uploadCreative`:

```ts
/** Attaches a file already in the Media Library. Same response as an upload,
 * including the advisory `warning`. */
export async function attachMediaAsset(
  getToken: GetToken,
  campaignId: number,
  mediaAssetId: number,
  slot = "all",
): Promise<UploadedCreative> {
  const res = await authedFetch(
    getToken,
    `/v1/customer/campaigns/${campaignId}/creatives`,
    jsonInit("POST", { mediaAssetId, slot }),
  )
  return res.json()
}
```

- [ ] **Step 2: Add the hook**

In `apps/customer-web/lib/use-campaigns.ts`, add `attachMediaAsset,` as the first name in the `@/lib/campaigns-client` import list, and add after `useUploadCreative`:

```ts
export function useAttachMediaAsset(campaignId: number) {
  const { getToken } = useAuth()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (mediaAssetId: number) => attachMediaAsset(getToken, campaignId, mediaAssetId),
    onSuccess: (creative) => {
      invalidate(campaignId)
      if (creative.warning) toast.warning(creative.warning)
    },
    onError: (error) => toast.error(messageOf(error)),
  })
}
```

- [ ] **Step 3: Add the picker to the creative field**

In `apps/customer-web/components/campaigns/creative-upload-field.tsx`:

Change the `lucide-react` import to `import { Film, FolderOpen, Trash2, Upload } from "lucide-react"`.

Add `type MediaAssetDto,` to the end of the `@workspace/ops-contracts` import list.

Add these imports after the `Button` import:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
```

Add after the `BlobPreview` import:

```tsx
import { MediaGrid } from "@/components/media/media-grid"
```

Change the hooks import to `import { useAttachMediaAsset, useDeleteCreative, useUploadCreative } from "@/lib/use-campaigns"` and add `import { useOrgPermissions } from "@/lib/use-org"` after it.

In `CreativeUploadField`, add after the `const remove = useDeleteCreative(campaignId)` line:

```tsx
  const attach = useAttachMediaAsset(campaignId)
  const { can } = useOrgPermissions()
  const [libraryOpen, setLibraryOpen] = useState(false)
```

and add after the `handleFiles` function:

```tsx
  async function handlePick(asset: MediaAssetDto) {
    // The hook toasts the reason on failure; the picker stays open to retry.
    const created = await attach.mutateAsync(asset.id).catch(() => null)
    if (!created) return
    onCreativesChange?.([...creatives, created])
    setLibraryOpen(false)
  }
```

Replace the upload `<Button … >…</Button>` element (the one whose `onClick` is `() => inputRef.current?.click()`) with:

```tsx
      <div className={cn("flex flex-col gap-2 sm:flex-row", atLimit && "hidden")}>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:flex-1"
          disabled={busy}
          loading={upload.isPending}
          loadingText="Uploading…"
          onClick={() => inputRef.current?.click()}
        >
          <Upload data-icon="inline-start" />
          {creatives.length > 0 ? "Add another creative" : "Upload creative"}
        </Button>
        {!disabled && can("media:read") ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:flex-1"
            disabled={busy}
            onClick={() => setLibraryOpen(true)}
          >
            <FolderOpen data-icon="inline-start" />
            Browse media library
          </Button>
        ) : null}
      </div>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>
              Pick a file you&apos;ve already uploaded. It stays in your library and can be used on
              other campaigns too.
            </DialogDescription>
          </DialogHeader>
          <MediaGrid
            selection={{
              format,
              attachedAssetIds: creatives.map((creative) => creative.media_asset_id),
              pendingAssetId: attach.isPending ? (attach.variables ?? null) : null,
              onSelect: (asset) => void handlePick(asset),
            }}
          />
        </DialogContent>
      </Dialog>
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck -w customer-web && npm run lint -w customer-web`
Expected: PASS

Manual check with `npm run dev`:
1. On `/media`, upload one 3:1 image (e.g. 960×320) and one square image (e.g. 320×320).
2. Start a new **taxi-top** campaign and reach the Creative step. Both **Upload creative** and **Browse media library** are shown.
3. Open the library: the 3:1 file shows "Ready for campaign"; the square file shows "Wrong shape" with its button disabled.
4. Click **Use this file** on the 3:1 file: the dialog closes, the creative tile appears, and **Continue** unlocks.
5. Reopen the library: that file now reads "Already added".
6. Start a **delivery-bike** campaign: the square file is now "Ready for campaign" and can be attached.
7. On `/media`, the 3:1 file shows "Used in 1 campaign". Remove it from the campaign; `/media` shows "Not used yet" and the file is still there.
8. Upload a new file inline in the Creative step, then open `/media`: it is listed.
9. Open a submitted campaign's detail page: thumbnails load and no Browse button is shown.

- [ ] **Step 5: Commit**

```bash
git add apps/customer-web/lib/campaigns-client.ts apps/customer-web/lib/use-campaigns.ts apps/customer-web/components/campaigns/creative-upload-field.tsx
git commit -m "feat(customer-web): attach creative from the media library in the campaign wizard"
```

---

### Task 9: Docs

**Files:**
- Modify: `docs/api/API.md`
- Modify: `docs/shared/DATABASE.md`
- Modify: `docs/shared/DATA-LAYER.md`
- Modify: `docs/customer/APP.md`
- Modify: `docs/shared/FEATURE-INVENTORY.md`
- Modify: `apps/web/prisma/README.md`
- Modify: `docs/superpowers/specs/2026-09-22-media-library-design.md` (append only)

- [ ] **Step 1: `docs/api/API.md`**

In the route overview table, add a row after the `/v1/customer/campaigns` row:

```md
| `/v1/customer/media` (+ `[id]`, `[id]/file`) | Customer Clerk JWT + `media:read` / `media:write` | Org Media Library — list, upload, rename, delete, file proxy |
```

In "Campaigns (advertiser + ops)", replace the two rows for `POST …/creatives` and `DELETE …/creatives/[creativeId]` with:

```md
| `POST` | `/v1/customer/campaigns/[id]/creatives` | Customer | Add creative. **Multipart** `file` uploads a new one (**PNG/JPG/GIF/MP4 only**, ≤50 MB) and also files it in the Media Library; **JSON** `{ mediaAssetId, slot? }` attaches a file already in the library. Either way the file must fit the campaign's panel — `400` with `issues.specs` otherwise; `409` if that file is already attached |
| `DELETE` | `/v1/customer/campaigns/[id]/creatives/[creativeId]` | Customer | Detach the creative while editable. The file stays in the Media Library |
```

After the paragraph that ends the Campaigns PDF notes (before the next `###` heading), add:

```md
### Media Library (advertiser)

Files are owned by the advertiser org, not by a campaign: one file can be attached to many campaigns. Every route checks the file's org and answers `404` (never `403`) for another org's file. Bytes are private Cloudinary assets streamed only through the `…/file` proxy.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/v1/customer/media` | Customer `media:read` | Paginated (`page`, `pageSize` default 24). `search` matches the name; `type=image\|video`; `usage=used\|unused`. Each item lists the `campaigns` using it |
| `POST` | `/v1/customer/media` | Customer `media:write` | Multipart `file` — PNG/JPG/GIF/MP4, ≤50 MB. No panel-shape check here; fit is judged when the file is attached. `502` if storage fails |
| `PATCH` | `/v1/customer/media/[id]` | Customer `media:write` | Rename — `{ name }`, 1–120 characters |
| `DELETE` | `/v1/customer/media/[id]` | Customer `media:write` | `409` naming the campaigns (`issues.campaigns`) while any campaign uses the file |
| `GET` | `/v1/customer/media/[id]/file` | Customer `media:read` | Stream the file's bytes |
```

- [ ] **Step 2: `docs/shared/DATABASE.md`**

On the "Private media never exposes its storage id" line, replace `` `CampaignCreative` `` with `` `MediaAsset` ``.

In the Campaigns table, replace the `CampaignCreative` row with:

```md
| `MediaAsset` | `media_assets` | A file in an advertiser org's Media Library. Org-owned (`org_id`, null once the org is deleted), reusable across campaigns. Only PNG/JPG/GIF/MP4 accepted — the supplier LED player can't decode anything else. `width`/`height`/`duration_seconds` are captured eagerly at upload, never backfilled |
| `CampaignCreative` | `campaign_creatives` | Attaches a `MediaAsset` to a campaign in a `slot`. Deleting a campaign removes these rows and keeps the files; a file can't be deleted while a row here points at it |
```

- [ ] **Step 3: `docs/shared/DATA-LAYER.md`**

Replace the `campaign_creatives` table row with:

```md
| `media_assets` | `MediaAsset` | Org-owned private Cloudinary files (width/height/duration captured at upload) — `/v1/customer/media` |
| `campaign_creatives` | `CampaignCreative` | Join row attaching a media asset to a campaign, with its panel `slot` |
```

In the numbered list under the supplier seam, replace item 1 with:

```md
1. Creative metadata (mime, bytes, width, height, duration) is captured eagerly at upload on `MediaAsset`, and `slot` on the attachment — never backfill for a supplier.
```

- [ ] **Step 4: `docs/customer/APP.md`**

Add a row after the `/campaigns/new` row:

```md
| `/media` | **API-backed** Media Library against `/v1/customer/media` — upload, search, filter (All / Images / Videos / Used / Unused), rename, delete. Files are org-wide and reusable; a file in use by a campaign can't be deleted. Video previews load on click |
```

In the `/campaigns/new` row, replace `(Brief → Flight & budget → Creative → Review)` with `(Brief → Flight & budget → Creative → Review; the Creative step uploads a new file or picks one from the Media Library)`.

- [ ] **Step 5: `docs/shared/FEATURE-INVENTORY.md`**

In the customer-web row for `/campaigns`, replace `creative upload (PNG/JPG/GIF/MP4) via Cloudinary private proxy` with `creative upload (PNG/JPG/GIF/MP4) or pick from the org Media Library (`/media`), via Cloudinary private proxy`.

In the Cloudinary paragraph, append `` `apps/api/app/v1/customer/media/*` `` to the list of callers, and add the sentence: "Campaign creatives are org-owned `MediaAsset` rows stored under `media/{orgId}/…`; files uploaded before the Media Library keep their `campaign-creatives/{campaignId}/…` ids."

- [ ] **Step 6: `apps/web/prisma/README.md`**

Append:

```md
## Deploy order: media library

The Media Library moves a creative's file columns from `campaign_creatives`
to a new `media_assets` table. It ships in two migrations so the API already
on prod never meets a schema it can't use:

1. `db:migrate:deploy` — applies `20261001000000_media_library` (additive:
   new table, nullable `campaign_creatives.media_asset_id`, permission grant).
2. `npm run db:media-library-backfill -w web` — links every existing creative
   to a new asset. Idempotent.
3. Deploy the app code.
4. `npm run db:media-library-backfill -w web` **again** — picks up any
   creative the old code wrote between steps 2 and 3. Until this runs, a
   campaign holding such a creative fails to load.
5. Later, once verified: the contract migration drops the old columns. It
   refuses to run while any creative is still unlinked.

Use the `:prod` variants of each script for production.
```

- [ ] **Step 7: Append the addendum to the spec**

Append to `docs/superpowers/specs/2026-09-22-media-library-design.md` (do not edit anything above it):

```md
---

## Addendum — 2026-10-01 (implementation plan)

Changes made while planning, recorded in
[the implementation plan](../plans/2026-10-01-media-library.md):

- **§3 `MediaAsset.org_id` is nullable with `onDelete: SetNull`**, not
  required with `Cascade`. `Cascade` on the org combined with `Restrict` on
  the attachment makes org deletion fail whenever a campaign still uses a
  file, and campaigns can already have `org_id = null`. Unused files are
  deleted with the org; in-use files stay, org-less, so the detached
  campaign's creative remains viewable by ops.
- **§3 Migration is expand → backfill → deploy → backfill → contract**, not
  one migration, to honour the additive-migration deploy rule.
- **§6 Existing files keep their `campaign-creatives/{campaignId}/…` ids.**
  Only new uploads use `media/{orgId}/…`.
- **§4 An inline campaign upload that fails the panel check is rejected
  entirely** and not kept in the library.
- **§5 Permissions** are granted in the migration to every role holding
  `creatives:write`, custom roles included.
- **§7 `apps/customer-mobile` library screens are deferred** to their own
  plan. Mobile's inline upload keeps working unchanged.
```

- [ ] **Step 8: Refresh the knowledge graph and commit**

Run: `graphify update .`
Expected: completes without error (`graphify-out/` is gitignored).

```bash
git add docs/api/API.md docs/shared/DATABASE.md docs/shared/DATA-LAYER.md docs/customer/APP.md docs/shared/FEATURE-INVENTORY.md apps/web/prisma/README.md docs/superpowers/specs/2026-09-22-media-library-design.md
git commit -m "docs: media library"
```

---

### Task 10: Production rollout (human-run)

**Do not run this as an agent without an explicit go-ahead.** Pick a quiet time: between steps 3 and 6 an advertiser who uploads, removes or edits a role in the old app can hit an error or leave a row that step 6 has to clean up. If a staging environment is in use, do the same sequence there first with the non-`:prod` scripts.

- [ ] **Step 1:** `npm run env:pull:prod -w web`
- [ ] **Step 2:** `npm run db:migrate:status:prod -w web` — expect exactly one pending migration, `20261001000000_media_library`. Stop if anything else is listed.
- [ ] **Step 3:** `npm run db:migrate:deploy:prod -w web`
- [ ] **Step 4:** `npm run db:media-library-backfill:prod -w web`
- [ ] **Step 5:** Merge the PR and wait until the `api` and `customer-web` deployments are live.
- [ ] **Step 6:** `npm run db:media-library-backfill:prod -w web` again.
- [ ] **Step 7:** Smoke test in production:
  - A campaign that existed before the change opens in customer-web and in ops, and its creative previews load.
  - `/media` lists the historical creatives.
  - Upload a file on `/media`, attach it to a draft from the wizard, remove it, delete it.
  - A Member-role user sees the Media page and can upload.

---

### Task 11: Contract migration (separate PR, after Task 10 is verified)

**Files:**
- Create: `apps/web/prisma/migrations/<YYYYMMDDHHMMSS>_media_library_contract/migration.sql` (timestamp from the day it is written; it must sort after `20261001000000`)
- Delete: `apps/api/scripts/media-library-backfill.test.ts`
- Modify: `apps/web/package.json` (remove the two `db:media-library-backfill` scripts)
- Modify: `apps/web/prisma/README.md`

- [ ] **Step 1: Write the migration**

```sql
-- Media Library (contract step). Refuses to run while any creative is still
-- unlinked, then drops the file columns that moved to media_assets.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "campaign_creatives" WHERE "media_asset_id" IS NULL) THEN
    RAISE EXCEPTION 'campaign_creatives still has rows with no media_asset_id — run db:media-library-backfill first';
  END IF;
END $$;

ALTER TABLE "campaign_creatives" ALTER COLUMN "media_asset_id" SET NOT NULL;

ALTER TABLE "campaign_creatives"
  DROP COLUMN IF EXISTS "resource_type",
  DROP COLUMN IF EXISTS "cloudinary_public_id",
  DROP COLUMN IF EXISTS "content_type",
  DROP COLUMN IF EXISTS "size_bytes",
  DROP COLUMN IF EXISTS "width",
  DROP COLUMN IF EXISTS "height",
  DROP COLUMN IF EXISTS "duration_seconds",
  DROP COLUMN IF EXISTS "original_filename";
```

- [ ] **Step 2: Apply to dev**

Run: `npm run db:media-library-backfill -w web`
Expected: `Script executed successfully.`

Run: `npm run db:migrate:deploy -w web`
Expected: the contract migration applies. If it raises "still has rows with no media_asset_id", a creative has no Cloudinary id to link by — inspect those rows before going further; do not delete them blindly.

- [ ] **Step 3: Apply to production**

Run: `npm run db:media-library-backfill:prod -w web`, then `npm run db:migrate:status:prod -w web` (expect only the contract migration pending), then `npm run db:migrate:deploy:prod -w web`.

Do this before Step 4, while the backfill scripts still exist. The deployed app code is unaffected either way: it stopped reading these columns in Task 3.

- [ ] **Step 4: Retire the backfill tooling**

Delete `apps/api/scripts/media-library-backfill.test.ts` (it inserts into the columns just dropped). Remove the `db:media-library-backfill` and `db:media-library-backfill:prod` lines from `apps/web/package.json`. Keep `apps/web/prisma/scripts/media-library-backfill.sql` as a historical record, like the other additive scripts. In `apps/web/prisma/README.md`, replace step 5 of "Deploy order: media library" with "5. Done — the contract migration has dropped the old columns, and the backfill script is historical."

Run: `npm run test -w api && npm run typecheck -w api`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/prisma/migrations apps/web/package.json apps/web/prisma/README.md
git rm apps/api/scripts/media-library-backfill.test.ts
git commit -m "feat(db): drop legacy creative file columns (media library contract step)"
```
