# Media Library — Design

**Date:** 2026-09-22
**Status:** Approved for planning
**Scope:** `apps/customer-web`, `apps/customer-mobile`, `apps/api`, `apps/web/prisma`

Introduces a reusable, org-owned Media Library for advertiser creatives, replacing
today's model where a creative is owned 1:1 by the campaign it was uploaded into.

Related: [GitHub #107](https://github.com/admobihq-cell/AdmobiHQ/issues/107) ·
[AUTH.md](../../shared/AUTH.md) ·
[Advertiser Organizations design](2026-09-07-advertiser-organizations-design.md)

---

## 1. Problem

Today, `CampaignCreative` is owned outright by a `Campaign` (`campaign_id` is
required, `onDelete: Cascade`). An advertiser who wants to reuse the same
artwork across two campaigns has to upload it twice — there is no way for one
physical asset to be attached to more than one campaign at a time, no way to
browse past uploads independent of a campaign, and deleting a campaign
destroys creatives that might otherwise still be wanted.

Issue #107 specs a Media Library that decouples creatives from campaigns:
upload once, reuse anywhere, browse/search/rename/delete independent of any
single campaign, and pick from the library (or upload inline) from the
campaign creative step.

Google Drive / Google Photos import, mentioned in the original feature
request, is out of scope for this design — see §7.

---

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Ownership | Split into `MediaAsset` (the file, org-owned) + a thin `CampaignCreative` join row (campaign_id + media_asset_id + slot) | Only structure that supports one asset attached to many campaigns at once, which issue #107 requires. A nullable `campaign_id` on the existing table can't represent that; cloning the file on each "select from library" duplicates storage and breaks "which campaigns use this asset." |
| Storage provider | Stay on Cloudinary | Already fully wired: private/authenticated delivery, signed URL minting, video+image metadata extraction on upload, `lib/private-media.ts` abstraction shared with driver documents. No reason to add a second provider. |
| Existing creatives | Migrate every existing `CampaignCreative` row into a `MediaAsset` owned by that campaign's `org_id`, in the same migration that splits the table | Makes historical creatives searchable/reusable too, not just new uploads. |
| Validation | Split into upload-time (file type/size, extract metadata) and attach-time (format compatibility, unchanged `checkCreativeForFormat` logic) | An asset uploaded straight into the library has no campaign/format in context yet, so "is this the right aspect ratio" can't be answered until it's being attached to something. |
| Tenant scope | `MediaAsset.org_id`, same authorization pattern as campaigns/support cases | Consistent with every other org-scoped resource; no new access-control shape to invent. |
| Google Drive/Photos import | Phase 2, not built now | Large, separable scope (OAuth, picker UI, download+reupload, token lifecycle, security review). Data model reserves a `source` column so it slots in later without rework. |

---

## 3. Data model

```prisma
model MediaAsset {
  id                    Int      @id @default(autoincrement())
  org_id                Int
  org                   AdvertiserOrg @relation(fields: [org_id], references: [id], onDelete: Cascade)
  name                  String
  resource_type         String   // "image" | "video" — mirrors Cloudinary's, as today
  cloudinary_public_id  String   @unique
  content_type          String
  size_bytes            Int
  width                 Int?
  height                Int?
  duration_seconds      Decimal? @db.Decimal(8, 2)
  original_filename     String?
  status                String   @default("ready") // "ready" | "invalid"
  source                String   @default("upload") // "upload" — "google_drive" | "google_photos" reserved
  created_by_clerk_user_id String
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  attachments CampaignCreative[]

  @@index([org_id, created_at])
  @@index([org_id, resource_type])
  @@map("media_assets")
}

model CampaignCreative {
  id             Int        @id @default(autoincrement())
  campaign_id    Int
  campaign       Campaign   @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  media_asset_id Int
  media_asset    MediaAsset @relation(fields: [media_asset_id], references: [id], onDelete: Restrict)
  slot           String     @default("all")
  created_at     DateTime   @default(now())

  @@unique([campaign_id, media_asset_id, slot])
  @@index([campaign_id])
  @@index([media_asset_id])
  @@map("campaign_creatives")
}
```

`onDelete: Restrict` on `media_asset` is a DB-level backstop, not the primary
UX: the delete route checks attachments first and returns a 409 naming the
campaigns still using the asset (same shape as the last-owner-removal 409s
already in `/v1/customer/org/members/[id]`), so a delete attempt never
surfaces a raw constraint-violation error to the advertiser.

**Migration** (single migration, run once): for every existing
`CampaignCreative` row, create a `MediaAsset` (columns copied across,
`org_id` from the campaign's `org_id`, `created_by_clerk_user_id` from the
campaign's `clerk_user_id`), then rewrite the `CampaignCreative` row down to
`{ id, campaign_id, media_asset_id, slot, created_at }`. Idempotent by
construction the same way `backfill-advertiser-orgs.ts` is — a partial re-run
finds nothing left to convert.

---

## 4. Validation — upload-time vs. attach-time

Today `checkCreativeForFormat(campaign.format, width, height)` runs once, at
upload, because the campaign (and therefore its format) is always known. In
the library, upload happens with no campaign in context, so that check moves:

- **`POST /v1/customer/media`** (upload into the library): file-type and
  max-size checks (same `CREATIVE_MIME_TYPES` / `MAX_CREATIVE_BYTES` as
  today), then upload to Cloudinary and read back width/height/duration.
  Status is `"ready"` on success. There is no per-format pass/fail at this
  point — a 4:3 image is exactly as "ready" as a 9:16 one; readiness here
  means "the file itself is usable," not "usable for a specific panel."
- **Attaching to a campaign** (either path — upload-inline or select-from-library):
  `checkCreativeForFormat` runs against the campaign's format, exactly as
  today. The library picker, once a campaign format is known, shows the same
  "✓ Ready for campaign" / "⚠ needs attention" badge from issue #107's mockup
  per asset, computed against that format — so an advertiser can see at a
  glance which library assets already fit before picking one.

---

## 5. API surface

New:
- `POST /v1/customer/media` — upload (multipart, mirrors today's creative upload minus the format check)
- `GET /v1/customer/media` — list, paginated, `search` by name, `filter` by resource_type / used / unused
- `PATCH /v1/customer/media/[id]` — rename
- `DELETE /v1/customer/media/[id]` — delete; 409 (with the attached campaign names) if still attached anywhere
- `GET /v1/customer/media/[id]/file` — signed fetch, org-checked, mirrors `campaigns/[id]/creatives/[creativeId]/file/route.ts`

Changed:
- `POST /v1/customer/campaigns/[id]/creatives` — accepts either a new file
  (unchanged multipart path — now also creates a `MediaAsset` row
  transparently, so every upload lands in the library) or `mediaAssetId` to
  attach an existing one, format-checked either way
- `DELETE /v1/customer/campaigns/[id]/creatives/[creativeId]` — detaches
  (deletes the join row) only; never deletes the underlying `MediaAsset`

New permissions `media:read` / `media:write`, granted to the same starter
roles that hold `creatives:write` today (owner + whichever of Manager/Member
already gets it — confirmed during planning against the current seed).

---

## 6. Storage organization & isolation

Cloudinary folder convention moves from campaign-centric to org-centric:
`media/{orgId}/{assetUuid}`, replacing today's `campaign-creatives/{campaignId}/{uploadId}`.
This is cosmetic — folder placement in Cloudinary provides no access control
on its own.

The actual isolation boundary is unchanged from every other org-scoped
resource in this app, and does not depend on Cloudinary in any way:

1. Every asset uploads with Cloudinary's `type: "authenticated"` delivery —
   unreachable without a signed URL minted fresh, server-side, per request.
2. `cloudinary_public_id` never reaches the client; API responses expose only
   the DB row id.
3. Every route resolves the DB row, checks `media_asset.org_id === auth.access.orgId`
   (404, not 403, on mismatch — same "don't confirm existence" pattern used
   for campaigns), and only mints a signed URL after that check passes.

There is one shared Cloudinary account for the whole platform; Cloudinary has
no native multi-tenancy here. The API is the only isolation boundary, exactly
as it already is for campaigns and support cases.

---

## 7. UI

- New **Media** section in the `apps/customer-web` sidebar: upload button,
  search, filter chips (All / Images / Videos / Used / Unused), grid of
  cards (preview, name, type, dimensions/duration, "used in N campaigns"),
  rename and delete actions. Matches issue #107's mockup.
- Campaign wizard's creative step gains a **Browse Media Library** option
  alongside today's inline upload. Both open the same underlying picker
  component (`<MediaGrid>` in selection mode vs. full-page mode), so the
  full-page library and the in-wizard picker are one component, not two.
- `apps/customer-mobile` gets the equivalent screens; not detailed further
  here — planning should confirm whether mobile ships in the same phase or
  trails web.

---

## 8. Out of scope for this design (phase 2+)

Matches issue #107's own "don't overbuild V1" list, plus the addition agreed
in brainstorming:

- Google Drive / Google Photos import (OAuth, picker, download+reupload,
  token lifecycle) — `MediaAsset.source` reserves `"google_drive"` /
  `"google_photos"` values so this slots in later without a model change
- AI-generated creatives, video editing, creative resizing
- Creative version history, advanced folders/tags
- Creative performance analytics, automated optimization
- Advanced multi-stage approval workflows, creative scheduling
- Async/webhook-driven processing pipeline — V1 stays synchronous like
  today's upload (Cloudinary returns width/height/duration inline); revisit
  if upload sizes or volume make that too slow

---

## 9. Testing

- An org cannot read, rename, delete, or fetch the file of another org's
  `MediaAsset` (404 on every route)
- The same asset attached to two campaigns: deleting one campaign detaches it
  from that campaign only — the `MediaAsset` and the other campaign's
  attachment survive
- Deleting a `MediaAsset` still attached to any campaign returns 409 naming
  the campaigns, and does not delete anything
- An asset that fails `checkCreativeForFormat` for campaign A but passes for
  campaign B can be attached to B even after being rejected for A
- Migration: running the `CampaignCreative` → `MediaAsset` split against a
  snapshot of prod data leaves every historical creative attached to exactly
  the campaign it was originally uploaded into, and idempotent on a second run
