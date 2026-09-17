# Campaigns End-to-End (Advertiser → Cloudinary → Ops Review → Playout-Ready) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the localStorage/AsyncStorage-only campaign mock into a real, database-backed feature across **all four surfaces** (customer-web, customer-mobile, ops, ops-mobile):

- Advertisers build a campaign in a **full-page multi-step flow** (not a side sheet) and upload creative to **Cloudinary** (private/authenticated delivery).
- Ops reviews from a new **Campaigns** sidebar entry (web) and a new section (ops-mobile) — Approve / Request changes / Reject, with an advertiser-visible reason.
- Every state change fires the **full notification set**: email, in-app inbox row, push, and toast/inline feedback.
- Both calendars read real campaigns and colour them by review status.
- The schema and creative pipeline are shaped so the **supplier screen APIs** can be bolted on without a re-upload or a migration rewrite.

**Architecture:** This is a **clone of the driver-verification vertical slice**, one layer at a time. Every layer already exists for `DriverProfile` / `DriverDocument` and should be mirrored, not reinvented:

| Layer | Driver (copy this) | Campaign (build this) |
|---|---|---|
| Prisma model | `DriverProfile` + `DriverDocument` | `Campaign` + `CampaignCreative` |
| Additive SQL | `driver-profiles-additive.sql` | `campaigns-additive.sql` |
| Cloudinary | `apps/api/lib/driver-document-storage.ts` | generalized → `apps/api/lib/private-media.ts` |
| Store/DTO | `driver-profile-store.ts`, `driver-profile-dto.ts` | `campaign-store.ts`, `campaign-dto.ts` |
| Owner API | `/v1/driver/profile`, `/v1/driver/documents` | `/v1/customer/campaigns/*` |
| Ops API | `/v1/driver-applications/*` | `/v1/campaigns/*` |
| In-app inbox table | `DriverNotification` | `CustomerNotification` |
| In-app inbox API | `/v1/driver/notifications` | `/v1/customer/notifications` |
| Merged feed hook | `driver-web/lib/use-driver-notifications.ts` | `customer-web/lib/use-customer-notifications.ts` (extend) |
| Ops web list+detail | `(dashboard)/driver-applications/*` | `(dashboard)/campaigns/*` |
| Ops mobile list+detail | `ops-mobile/app/(ops)/driver-applications/*` | `ops-mobile/app/(ops)/campaigns/*` |
| Owner stepper | `driver-web/components/profile-setup/stepper.tsx` | `customer-web/components/campaigns/new/*` |
| Status banner | `driver-verification-section.tsx` | campaign detail review banner |
| Emails | `DriverApplicationSubmitted` / `DriverApplicationDecision` | `CampaignSubmitted` / `CampaignDecision` |
| Review trail | `audit_events` (reuse as-is) | `audit_events` (reuse as-is) |

**Tech Stack:** Next.js App Router, Prisma 7 + Neon Postgres, Cloudinary (authenticated delivery type), Clerk (three separate instances — ops / driver / **customer**), Zod, TanStack Query, FullCalendar, Expo / React Native + expo-notifications + expo-image-picker, sonner (web toasts), Turborepo, vitest.

---

## Global Constraints

- **No `prisma migrate`.** The Neon DB is shared with self-hosted n8n. Schema changes ship as `apps/web/prisma/scripts/campaigns-additive.sql` run with `prisma db execute`, exactly like every other `*-additive.sql`. Edit `schema.prisma` for the generated client, but create no migration folder.
- **Never cross Clerk instances.** Advertiser routes use `requireCustomerAccess()` (`apps/api/lib/api-utils.ts:86`) + `customerClerkClient`. Ops routes use `requireOpsPermissionAccess("campaigns")`. A campaign is owned by `clerk_user_id` from the **customer** instance.
- **Creative bytes never reach a browser via a Cloudinary URL.** Upload with `type: "authenticated"`, store only the `public_id`, stream bytes through an authenticated proxy — the rule `apps/api/lib/driver-document-storage.ts` already documents. Ownership mismatch returns **404, not 403**. (Supplier delivery is a separate, later path — see *Supplier / screen-API seam* below. It needs **no re-upload**.)
- **Two-part status.** `campaigns.status` stores only the *review* lifecycle (`draft`, `submitted`, `approved`, `rejected`, `changes_requested`, `cancelled`). The *flight phase* (`unscheduled` / `scheduled` / `live` / `completed`) is **derived from `starts_on` / `ends_on` at read time** — no cron, no scheduler, no drift.
- **Edit lock.** Editable only in `draft` / `changes_requested` / `rejected` (mirrors `EDITABLE_STATUSES` in `driver-profile-store.ts`). Writes outside those return 409.
- **Rejection reason is advertiser-visible.** One field, `review_reason`, shown verbatim on every surface and in the decision email. Internal ops commentary goes to `audit_events`, not a second column.
- **Notifications never block a response.** Every email / push / inbox write goes in a trailing `try { … } catch (e) { console.error(…) }`, exactly like `/v1/driver/profile/submit/route.ts`. A dead Expo token must never fail a submit.
- **No new toast dependency on mobile.** `packages/mobile-ui` is an empty stub and neither Expo app has a toast library. Mobile feedback uses the existing `ApiErrorBanner` + inline pending/success states that `ops-mobile/app/(ops)/driver-applications/[id].tsx` already uses. Web uses the `sonner` `Toaster` already mounted in `customer-web/app/layout.tsx:71`.
- **Commit** after each task with the message shown in its final step. Per `CLAUDE.md`: **no `Co-Authored-By` trailer, no "Generated with Claude Code" line.**
- Run commands from the repo root: `c:\Users\victo\Documents\GitHub\AdmobiHQ`.

---

## Notification design

There is currently **no per-user lifecycle push anywhere in the repo** — driver decisions write a `DriverNotification` row and send an email, but nothing reaches the driver's device. `notifyOpsStaffAlert` (`apps/api/lib/push/ops-alerts.ts`) pushes to *all* ops devices, and `broadcastAnnouncement` pushes to *everyone*. Campaigns need a **targeted, single-user push**, so Task 8 adds `notifyUserPush(audience, clerkUserId, …)` — a small helper that is deliberately audience-generic so the driver flow can adopt it later without another rewrite.

**Full matrix — build every cell:**

| Event | Advertiser email | Advertiser in-app inbox | Advertiser push | Advertiser toast / inline | Ops |
|---|---|---|---|---|---|
| Draft saved | — | — | — | web: silent autosave; mobile: inline "Saved" | — |
| Creative uploaded | — | — | — | toast / inline row state | — |
| Creative rejected (size/mime) | — | — | — | toast / inline error | — |
| **Submitted** | `CampaignSubmitted` | ✅ `campaign_submitted` | ✅ | "Submitted for review" | `notifyOpsStaffAlert` push + `AdminAlert` email + sidebar badge |
| **Approved** | `CampaignDecision` | ✅ `campaign_approved` | ✅ | — | — |
| **Changes requested** | `CampaignDecision` + reason | ✅ `campaign_changes_requested` (body = reason) | ✅ | — | — |
| **Rejected** | `CampaignDecision` + reason | ✅ `campaign_rejected` (body = reason) | ✅ | — | — |
| Unapproved (ops walk-back) | `CampaignDecision` + reason | ✅ `campaign_changes_requested` | ✅ | — | — |
| Ops review action succeeded | — | — | — | — | web: `toast.success`; mobile: inline |
| Any API failure | — | — | — | `toast.error(formatApiError(e))` / `ApiErrorBanner` | same |
| Flight started / ended | — | — | — | — | — *(deferred — needs a cron; see out-of-scope)* |

The advertiser inbox becomes a **merged feed** (announcements + campaign lifecycle), which is a direct copy of `apps/driver-web/lib/use-driver-notifications.ts` — two infinite queries, summed unread counts, `source:` prefix on the feed id.

---

## Creative specification (supplier hardware — authoritative)

These are the real screen specs. They live in **one** place — `packages/ops-contracts/src/creative-specs.ts` — because four apps (customer-web, customer-mobile, ops, ops-mobile) plus the API all need the same numbers and the same wording. Never retype them into a component.

| Format | Physical canvas | Pitch | Sides | Aspect |
|---|---|---|---|---|
| `taxi_top` | **960 mm × 320 mm** | — | **Double-sided** | **3 : 1** |
| `delivery_bike` | **320 mm × 320 mm** | **P2.5** | **Three sides** | **1 : 1** |

**Accepted file formats — PNG, JPG, GIF, MP4 only.** The supplier console states verbatim: *"Note: Materials only support PNG, JPG, GIF, MP4 format!"*

> **This is a correction to the pre-approval plan, which allowed WebP and WebM. Both must be removed.** The player cannot decode them, so accepting them would let an advertiser pass review with creative that silently fails on the vehicle. `.jpeg` is the same format as `.jpg` and is accepted. The supplier's local file browser also filters `*.bmp`, but BMP is **absent from the supported-materials list** — it is a file-picker artifact, not a playable format. Do not accept BMP.

**Do not build transcoding.** The supplier upload interface has a built-in **Transcoding toggle** that converts MP4 into hardware-friendly profiles for lag-free, battery-sane mobile playback. That is their side of the line. We store the advertiser's original MP4 and hand it over; re-encoding it ourselves would degrade the master for no gain.

**Validation rule — aspect ratio is enforced, exact pixels are advisory.**

```
hard fail  → wrong mime type; over MAX_CREATIVE_BYTES; aspect ratio off by >2%
soft warn  → aspect correct but pixel dimensions below the recommended canvas
```

<!-- ponytail: aspect-ratio hard / pixel-canvas soft. The brief gives 960×320 and 320×320 as the
     "active pixel canvas" in millimetres, so whether those numbers are also the literal pixel
     resolution is unconfirmed (320×320 mm at P2.5 = 128×128 px, which would make the mm figure
     and the px figure different things). A hard aspect check plus a soft dimension warning is
     correct under BOTH readings and blocks nobody. Tighten to an exact-pixel hard check once the
     supplier confirms the panel resolution. -->

**Open question for the product owner — does not block:** confirm the **pixel** resolution of each panel (is the taxi top 960×320 px, or 960×320 mm at a pitch that yields something else?). The soft-warning threshold becomes a hard check once that's known.

**Per-side creative.** The taxi top is double-sided and the bike box is three-sided, so `CampaignCreative` carries a nullable `slot` column defaulting to `"all"` (same creative everywhere — the overwhelmingly common case, and the only one with UI in this plan). Per-side artwork needs no migration when it's wanted, only a picker.

**Supplier playlist item types we do *not* build.** The player also supports scrolling text boxes, digital/analog clocks, embedded web pages, and environmental-sensor readouts (vehicle temperature). These are supplier-side playlist primitives, not advertiser uploads — a campaign in this plan is creative files only. Recorded in `DATA-LAYER.md` so the capability isn't lost, but nothing here builds them.

---

## Supplier / screen-API seam

The database is **not** the end of the pipeline: approved campaigns will eventually be dispatched to supplier screen APIs that actually play the ads. This plan does **not** build that integration, but it must not block it. Three decisions, recorded here so they aren't silently made wrong:

1. **Creative metadata is captured at upload time, not inferred later.** `CampaignCreative` stores `resource_type`, `content_type`, `size_bytes`, `width`, `height`, and `duration_seconds` — read straight off the Cloudinary upload response. This is exactly the payload every screen/CMS API asks for, and reconstructing it later means re-downloading every asset. **Non-negotiable in Task 1.**

2. **Private storage does not block supplier delivery, so keep it.** Because we hold the `public_id`, a supplier-facing URL can be minted server-side at dispatch time — either a signed Cloudinary URL or a token-scoped proxy route (the repo already mints HMAC access tokens in `apps/api/lib/support-token.ts` and compares them with `timingSafeEqual`). **No re-upload is required later.** Uploading as public "just in case" would be an irreversible privacy downgrade for an advertiser's unreleased creative; don't.

3. **Dispatch state is a separate axis from review state — and stays unbuilt.** "Ops approved it" and "the supplier network accepted it" are different facts. Do **not** widen `campaigns.status` to carry both, and do **not** add speculative `dispatched_at` / `external_ref` columns with no consumer. When the first supplier contract is real, it lands as its own additive table (`campaign_placements`: campaign, supplier, external ref, screen ids, accepted/rejected, playout counts) — additive SQL, no rewrite of anything in this plan. Task 15 writes this down in `docs/shared/DATA-LAYER.md` so the next person doesn't cram it into `status`.

**Open question for the product owner (does not block this plan):** whether suppliers pull creative from a URL we mint, or we push bytes to their API. Decision 2 above works for both.

---

## File Structure

**New files:**

*Database*
- `apps/web/prisma/scripts/campaigns-additive.sql`

*API*
- `apps/api/lib/private-media.ts` — generalized Cloudinary helper (image **and video**)
- `apps/api/lib/campaign-store.ts`, `apps/api/lib/campaign-dto.ts`, `apps/api/lib/campaign-dto.test.ts`
- `apps/api/lib/push/user-push.ts` — targeted single-user push
- `apps/api/lib/push/customer-notification-inbox.ts`
- `apps/api/lib/email/templates/CampaignSubmitted.tsx`, `CampaignDecision.tsx`
- `apps/api/app/v1/customer/campaigns/route.ts`, `[id]/route.ts`, `[id]/submit/route.ts`
- `apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts`, `[creativeId]/route.ts`, `[creativeId]/file/route.ts`
- `apps/api/app/v1/customer/notifications/route.ts`, `read/route.ts`, `[id]/route.ts`
- `apps/api/app/v1/campaigns/route.ts`, `[id]/route.ts`, `[id]/review/route.ts`, `[id]/creatives/[creativeId]/file/route.ts`

*Customer web*
- `lib/campaigns-client.ts`, `lib/use-campaigns.ts`, `lib/customer-notifications-client.ts`
- `app/(shell)/campaigns/new/page.tsx` + `loading.tsx`
- `components/campaigns/new/campaign-wizard.tsx` + `steps/{brief,flight,creative,review}-step.tsx`
- `components/campaigns/creative-upload-field.tsx`, `components/campaigns/campaign-review-banner.tsx`

*Customer mobile*
- `lib/campaigns-client.ts`, `lib/use-campaigns.ts`, `lib/customer-notifications-client.ts`
- `app/(tabs)/campaigns/[id]/edit.tsx` (wizard; `new.tsx` is rewritten in place)
- `components/campaigns/creative-picker.tsx`, `components/campaigns/campaign-review-banner.tsx`

*Ops web*
- `app/(dashboard)/campaigns/page.tsx`, `campaigns-view.tsx`, `[id]/page.tsx`, `[id]/campaign-detail-view.tsx`
- `components/campaign-detail-skeleton.tsx`

*Ops mobile*
- `app/(ops)/campaigns/_layout.tsx`, `index.tsx`, `[id].tsx`

**Deleted:**
- `apps/customer-web/lib/campaigns.ts`, `apps/customer-web/components/campaigns/new-campaign-form.tsx`
- `apps/customer-mobile/lib/campaigns.ts`

---

## Task 1: Database layer — campaigns, creatives, customer notifications

**Files:** modify `apps/web/prisma/schema.prisma`, `apps/web/package.json`; create `apps/web/prisma/scripts/campaigns-additive.sql`

- [ ] **Step 1: Verify no table-name collision.** `campaigns`, `campaign_creatives`, and `customer_notifications` must be free on the shared Neon instance (n8n owns 100+ tables here). Against a **non-production** DB:
  ```
  npm run -w web db:pull -- --print | grep -iE "^model (Campaign|CustomerNotification)"
  ```
  On collision, prefix all three `admobi_*` and adjust every `@@map`. Do not proceed until verified.

- [ ] **Step 2: Add `Campaign` to `schema.prisma`:**

```prisma
/// One advertiser campaign, owned by a CUSTOMER Clerk instance user id.
/// Mirrors DriverProfile's draft → submitted → reviewed lifecycle. `status`
/// holds ONLY the review lifecycle; the flight phase (scheduled / live /
/// completed) is derived from starts_on / ends_on at read time — see
/// apps/api/lib/campaign-dto.ts. Never store it, or it drifts.
///
/// Supplier dispatch state is deliberately NOT here — see the
/// "Supplier / screen-API seam" note in DATA-LAYER.md before adding it.
model Campaign {
  id            Int    @id @default(autoincrement())
  clerk_user_id String

  name      String
  objective String? // awareness, traffic, launch, promotion, other
  market    String? // CBD, Westlands, Karen, Kilimani, Mombasa Rd, Eastlands
  corridors String? // free-text corridor/route notes for the account manager
  format    String  @default("taxi_top") // taxi_top, delivery_bike, both
  notes     String?

  budget_kes Decimal?  @db.Decimal(12, 2)
  starts_on  DateTime? @db.Date
  ends_on    DateTime? @db.Date

  status            String    @default("draft") // draft, submitted, approved, rejected, changes_requested, cancelled
  submitted_at      DateTime?
  reviewed_at       DateTime?
  reviewed_by_email String?
  /// Advertiser-visible, verbatim. Required whenever a decision is not "approved".
  review_reason     String?

  contact_name  String?
  contact_email String?
  contact_phone String?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  creatives CampaignCreative[]

  @@index([clerk_user_id, created_at])
  @@index([status, created_at])
  @@index([starts_on, ends_on])
  @@map("campaigns")
}
```

- [ ] **Step 3: Add `CampaignCreative`.** The dimension/duration columns are what the supplier screen APIs will require — capture them at upload, never backfill:

```prisma
/// A single uploaded creative asset (image or video) for a campaign.
/// cloudinary_public_id uses Cloudinary's "authenticated" delivery type and
/// is never exposed to a browser — always served via an authenticated proxy,
/// exactly like DriverDocument.
///
/// width / height / duration_seconds are read off the Cloudinary upload
/// response and stored eagerly: they are the exact spec fields a supplier
/// screen API asks for, and recovering them later means re-downloading every
/// asset. Do not make them lazy.
model CampaignCreative {
  id                   Int      @id @default(autoincrement())
  campaign_id          Int
  campaign             Campaign @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  /// "image" | "video" — mirrors Cloudinary's resource_type; needed to sign
  /// the fetch URL correctly.
  resource_type        String   @default("image")
  cloudinary_public_id String   @unique
  content_type         String
  size_bytes           Int
  width                Int?
  height               Int?
  duration_seconds     Decimal? @db.Decimal(8, 2)
  original_filename    String?
  /// Which face of the vehicle unit this creative plays on. The taxi top is
  /// double-sided and the bike box is three-sided, so the hardware needs this
  /// even though the app only offers "all" today. "all" | "side_a" | "side_b"
  /// | "left" | "right" | "rear".
  slot                 String   @default("all")
  created_at           DateTime @default(now())

  @@index([campaign_id])
  @@map("campaign_creatives")
}
```

- [ ] **Step 4: Add `CustomerNotification`** — a field-for-field copy of `DriverNotification`, so the inbox plumbing can be copied too:

```prisma
/// A per-advertiser in-app notification (campaign submitted / reviewed).
/// Written by the same routes that trigger the matching email + push — see
/// apps/api/app/v1/customer/campaigns/[id]/submit and
/// apps/api/app/v1/campaigns/[id]/review. Merged with AnnouncementDelivery
/// rows into one feed client-side, exactly like the driver apps do.
model CustomerNotification {
  id            Int    @id @default(autoincrement())
  clerk_user_id String

  type  String // campaign_submitted, campaign_approved, campaign_rejected, campaign_changes_requested
  title String
  body  String
  /// Deep link target, e.g. "/campaigns/42" — used by both the web inbox row
  /// and the Expo notification tap handler.
  href  String?

  read_at    DateTime?
  created_at DateTime  @default(now())

  @@index([clerk_user_id, created_at])
  @@map("customer_notifications")
}
```

- [ ] **Step 5: Create `campaigns-additive.sql`** — `CREATE TABLE IF NOT EXISTS` for all three tables plus `CREATE INDEX IF NOT EXISTS` for all six indexes, in the style of `driver-profiles-additive.sql`. `Decimal @db.Decimal(12,2)` → `NUMERIC(12,2)`; `DateTime @db.Date` → `DATE`; `DateTime` → `TIMESTAMPTZ`; `updated_at` gets `DEFAULT NOW()`.

- [ ] **Step 6: Add scripts to `apps/web/package.json`** next to `db:integrations`:
  ```json
  "db:campaigns": "dotenv -e .env.local -- prisma db execute --file prisma/scripts/campaigns-additive.sql",
  "db:campaigns:prod": "dotenv -e .env.production.local -- prisma db execute --file prisma/scripts/campaigns-additive.sql",
  ```

- [ ] **Step 7: Apply and regenerate.** `npm run -w web db:campaigns`, then the repo's prisma generate. Confirm `prisma.campaign`, `prisma.campaignCreative`, `prisma.customerNotification` exist.

- [ ] **Step 8: Commit** — `feat(db): add campaigns, campaign_creatives, and customer_notifications tables`

---

## Task 2: Contracts — enums, Zod schemas, DTOs, ops-api-client

**Files:** modify `packages/ops-contracts/src/{enums,schemas,types,index,contracts.test}.ts`, `packages/ops-api-client/src/index.ts`

- [ ] **Step 1: `enums.ts`** — add `CAMPAIGN_STATUSES` (`draft, submitted, approved, rejected, changes_requested, cancelled`), `CAMPAIGN_FLIGHT_PHASES` (`unscheduled, scheduled, live, completed`), `CAMPAIGN_FORMATS` (`taxi_top, delivery_bike, both`), `CAMPAIGN_OBJECTIVES` (`awareness, traffic, launch, promotion, other`), each as an `as const` tuple + exported type. Append `"campaign"` and `"campaign_creative"` to `AUDIT_ENTITY_TYPES`, and `"campaigns"` to `OPS_PERMISSIONS`.

- [ ] **Step 2: `schemas.ts`** — `campaignCreateSchema` (`name` trim 1–120 required, everything else optional, dates as `YYYY-MM-DD` via regex), `campaignUpdateSchema` (`.partial()`), `campaignReviewSchema` (mirror `driverProfileReviewSchema`). Add a `.refine` so `ends_on >= starts_on` when both are present.

- [ ] **Step 3: `types.ts`** — `CampaignCreativeDto`, `CampaignDto` (all columns; `budget_kes` as `string | null`; dates as `YYYY-MM-DD | null`; plus `flight_phase` and `creatives[]`), `CampaignListItemDto` (flattened ops row), and `CustomerNotificationDto` (copy `DriverNotificationDto`, plus `href: string | null`).

- [ ] **Step 3b: create `packages/ops-contracts/src/creative-specs.ts`** — the single source of truth for the hardware spec, consumed by the API validator, both advertiser upload UIs, and both ops review UIs. Nothing retypes these numbers.
  ```ts
  export const CREATIVE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "video/mp4"] as const
  export const CREATIVE_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".mp4"] as const
  export const CREATIVE_SLOTS = ["all", "side_a", "side_b", "left", "right", "rear"] as const

  export type CreativeSpec = {
    label: string
    widthMm: number
    heightMm: number
    aspectRatio: number
    sides: number
    sidesLabel: string
    pitch: string | null
    /** Advisory pixel canvas — see the aspect-hard / pixels-soft rule. */
    recommendedWidthPx: number
    recommendedHeightPx: number
  }

  export const CREATIVE_SPECS: Record<"taxi_top" | "delivery_bike", CreativeSpec> = {
    taxi_top: {
      label: "Taxi-top LED",
      widthMm: 960, heightMm: 320, aspectRatio: 3,
      sides: 2, sidesLabel: "Double-sided", pitch: null,
      recommendedWidthPx: 960, recommendedHeightPx: 320,
    },
    delivery_bike: {
      label: "Delivery bike box",
      widthMm: 320, heightMm: 320, aspectRatio: 1,
      sides: 3, sidesLabel: "Three sides", pitch: "P2.5",
      recommendedWidthPx: 320, recommendedHeightPx: 320,
    },
  }

  export const ASPECT_TOLERANCE = 0.02

  /** Specs a campaign must satisfy. `both` must satisfy BOTH panels, so a
   * campaign in that format needs one creative per aspect ratio. */
  export function specsForFormat(format: CampaignFormat): CreativeSpec[]
  export function checkCreativeDimensions(
    spec: CreativeSpec, width: number, height: number,
  ): { ok: boolean; level: "ok" | "warn" | "fail"; message?: string }
  ```
  Include a `creative-specs.test.ts`: exact-canvas passes; 1920×640 passes (correct 3:1, larger); 640×640 fails against `taxi_top` and passes against `delivery_bike`; 970×320 fails the 2% tolerance; an undersized-but-correct-aspect image warns rather than fails.

- [ ] **Step 4: `index.ts`** — re-export everything new, including `creative-specs.ts`.

- [ ] **Step 5: `contracts.test.ts`** — name required; `ends_on < starts_on` rejected; `reason` optional on `approved` and required-by-route otherwise; bad date format rejected.

- [ ] **Step 6: `ops-api-client/src/index.ts`** — add a `campaigns` namespace to both the type and the factory, copying the `driverApplications` block (`list`, `get`, `review`, `creativeFileUrl`). Both ops web **and ops-mobile** consume this.

- [ ] **Step 7: Verify** — `npm run -w @workspace/ops-contracts test`; monorepo typecheck.

- [ ] **Step 8: Commit** — `feat(contracts): add campaign enums, schemas, DTOs, and ops client namespace`

---

## Task 3: Cloudinary — generalize the private-media helper

**Files:** create `apps/api/lib/private-media.ts`; modify `apps/api/lib/driver-document-storage.ts`

The existing helper is image-only and driver-named. Creatives include **video** (taxi-top LED). Generalize once; do not write a second copy.

- [ ] **Step 1: Create `private-media.ts`** by lifting the three functions with `resourceType: "image" | "video"` threaded through:
  - `uploadPrivateAsset(file, publicId, resourceType)` — same data-URI upload and `asset_folder` derivation (**the Dynamic Folder Mode comment is load-bearing — keep it**). Return `{ publicId, contentType, sizeBytes, width, height, durationSeconds }` read off the Cloudinary response. Those last three are the supplier-spec fields from Task 1 — plumb them through, don't drop them.
  - `destroyPrivateAsset(publicId, resourceType)` — same best-effort swallow.
  - `fetchPrivateAsset(publicId, resourceType)` — same sign-and-fetch. **Keep `analytics: false`** (the "Must supply sdk_semver" note is load-bearing). Images keep `width: 800, crop: "limit", quality: "auto", fetch_format: "auto"`; video uses `quality: "auto"` only — no width cap, no `fetch_format`, because a reviewer must see what will actually play.

- [ ] **Step 2: Reduce `driver-document-storage.ts`** to its constants, `buildDriverDocumentPublicId`, and three one-line re-exports calling the generic functions with `"image"`. **Do not touch any driver route.** Pure refactor — driver behaviour must be byte-identical.

- [ ] **Step 3: Add creative constants**, importing `CREATIVE_MIME_TYPES` from `@workspace/ops-contracts` rather than redeclaring the list:
  ```ts
  export const ALLOWED_CREATIVE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif"])
  export const ALLOWED_CREATIVE_VIDEO_TYPES = new Set(["video/mp4"])
  export const MAX_CREATIVE_BYTES = 50 * 1024 * 1024
  export const MAX_CREATIVES_PER_CAMPAIGN = 6
  export function buildCampaignCreativePublicId(campaignId: number, uploadId: string): string
  ```
  **No WebP, no WebM, no BMP** — the supplier player decodes PNG, JPG, GIF, MP4 and nothing else. Accepting a format that fails silently on the vehicle is worse than rejecting it at upload.

  **Animated GIF:** Cloudinary classifies GIF under `resource_type: "image"`, so it takes the image upload path. Verify an animated GIF survives the round trip **without losing animation** — the `fetch_format: "auto"` transform on the image fetch path can flatten it. If it does, special-case GIF to skip `fetch_format`.

- [ ] **Step 3b: Do NOT transcode.** The supplier console has its own Transcoding toggle that converts MP4 into hardware-friendly playback profiles. Store the advertiser's original and hand it over untouched. No ffmpeg, no Cloudinary eager video transforms.

- [ ] **Step 4: Verify — this is the regression risk of the whole plan.** Upload a document in driver-web, view it in ops, view it in ops-mobile. All three must still work.

- [ ] **Step 5: Commit** — `refactor(api): generalize Cloudinary private-media helper for images and video`

---

## Task 4: API — campaign store, DTOs, derived flight phase

**Files:** create `apps/api/lib/campaign-store.ts`, `campaign-dto.ts`, `campaign-dto.test.ts`

- [ ] **Step 1: `campaign-store.ts`** — mirror `driver-profile-store.ts`: `EDITABLE_STATUSES`, `getOwnedCampaign(clerkUserId, id)` (returns null, never throws, on missing **or** foreign — callers turn that into 404), `missingCampaignFields`, `missingCampaignCreatives`.

- [ ] **Step 2: `campaign-dto.ts`** — `toCampaignDto`, `toCampaignCreativeDto`, `toCampaignListItemDto`, plus:
  ```ts
  /** Flight phase is derived, never stored — a stored "live" goes stale the
   * moment a date passes and would need a cron to fix. `today` is injectable
   * so tests don't depend on the wall clock. */
  export function flightPhase(status, startsOn, endsOn, today = new Date()): CampaignFlightPhase
  ```
  <!-- ponytail: day-resolution in server-local time. Kenya is UTC+3 with no DST, so one fixed
       offset is correct today; pass a tz through if a second market lands. -->
  `budget_kes` serializes with `.toString()` — Prisma `Decimal` is not JSON-safe.

- [ ] **Step 3: `campaign-dto.test.ts`** — every `flightPhase` branch (non-approved, no dates, before start, on start, mid-window, on end, after end) with an injected `today`; `missingCampaignFields` on an empty and a complete row.

- [ ] **Step 4: Verify** — the API test suite passes.

- [ ] **Step 5: Commit** — `feat(api): add campaign store, DTO mappers, and derived flight phase`

---

## Task 5: API — customer notification inbox

**Files:** create `apps/api/lib/push/customer-notification-inbox.ts` and the three `/v1/customer/notifications` routes

- [ ] **Step 1: `customer-notification-inbox.ts`** — copy `driver-notification-inbox.ts` verbatim against `prisma.customerNotification`, adding `href` to the select and DTO. Same cursor pagination, same `unread_count`.
- [ ] **Step 2: Routes** — copy `/v1/driver/notifications/{route,read,[id]}` against `requireCustomerAccess()`: `GET` (cursor-paginated page), `POST read` (mark all), `PATCH [id]` (toggle one).
- [ ] **Step 3: Verify** — with a manually inserted row, confirm the page, the unread count, and both read paths.
- [ ] **Step 4: Commit** — `feat(api): add customer in-app notification inbox`

---

## Task 6: API — targeted single-user push

**Files:** create `apps/api/lib/push/user-push.ts`

Today nothing pushes to **one** user — `notifyOpsStaffAlert` hits every ops device and `broadcastAnnouncement` hits everyone. Campaign decisions need a targeted push.

- [ ] **Step 1: `user-push.ts`** — one exported function, audience-generic so the driver flow can adopt it later without a rewrite:
  ```ts
  /** Fire-and-forget push to every device registered to one user. Audience
   * selects the token table; "customer" and "driver" both work, so the driver
   * lifecycle routes can adopt this without a second helper. */
  export async function notifyUserPush(
    audience: "customer" | "driver",
    clerkUserId: string,
    message: { title: string; body: string; href?: string; data?: Record<string, string> },
  ): Promise<void>
  ```
  Look up tokens by `clerk_user_id` on the matching token table, build Expo payloads with the same `sound`/`channelId`/`color`/`priority` fields `ops-alerts.ts` uses, call `sendExpoPushMessages`, `recordPushTickets({ audience, outcomes })`, and delete `invalidTokens`. Wrap the whole body in try/catch that only `console.error`s.
- [ ] **Step 2: No-token no-op.** A user with zero registered devices (web-only advertiser) must return silently — the common case, not an error.
- [ ] **Step 3: Verify** — with a real device token registered on customer-mobile, confirm a push arrives and a `push_tickets` row lands; then confirm a user with no tokens is a clean no-op.
- [ ] **Step 4: Commit** — `feat(api): add targeted single-user push helper`

---

## Task 7: Emails

**Files:** create `apps/api/lib/email/templates/CampaignSubmitted.tsx`, `CampaignDecision.tsx`

- [ ] **Step 1: `CampaignSubmitted.tsx`** — copy `DriverApplicationSubmitted.tsx`; props `{ name, campaignName }`. There is an existing, unrelated `CampaignConfirmation.tsx` (marketing lead capture) — do **not** reuse or modify it.
- [ ] **Step 2: `CampaignDecision.tsx`** — copy `DriverApplicationDecision.tsx`; props `{ name, campaignName, decision, reason }`. When not approved, render `reason` in the same emphasized block — this is the advertiser's email-side view of the rejection reason.
- [ ] **Step 3: Verify** — render both via `renderTemplate` and eyeball; confirm `sendEmail` is skipped cleanly when `contact_email` is null.
- [ ] **Step 4: Commit** — `feat(api): add campaign submitted and decision email templates`

---

## Task 8: API — advertiser campaign routes (with the full notification set)

**Files:** create the six routes under `apps/api/app/v1/customer/campaigns/`

Every route opens with `requireCustomerAccess()`. Add `auditFromCustomerUser` to `apps/api/lib/audit.ts` alongside `auditFromDriverUser` (`app: "customer-web"`) if absent.

- [ ] **Step 1: `route.ts`** — `GET` lists this user's campaigns; `POST` creates a `draft` from `campaignCreateSchema`.
- [ ] **Step 2: `[id]/route.ts`** — `GET` (404 via `getOwnedCampaign`); `PATCH` 409 outside `EDITABLE_STATUSES`; `DELETE` only on `draft`, destroying every Cloudinary asset before the row.
- [ ] **Step 3: `[id]/creatives/route.ts`** — `POST` multipart, copying `/v1/driver/documents/route.ts`: 409 if not editable, mime check against the image **or** video allow-list, size check, `MAX_CREATIVES_PER_CAMPAIGN` check, upload, then create the row **including `width`, `height`, `duration_seconds`, `slot`**. Campaigns hold a list, so append rather than replace-by-type.

  **Dimension check runs server-side, after upload, before the DB write** — Cloudinary's response is the only trustworthy source of the real dimensions, and a client-side check is a convenience, not a gate. Call `checkCreativeDimensions(spec, width, height)` from `@workspace/ops-contracts` for each spec in `specsForFormat(campaign.format)`:
  - `fail` → `destroyPrivateAsset` the just-uploaded asset, then `jsonError` 400 with the spec message (never leave an orphan the DB doesn't know about);
  - `warn` → save the row and return the warning in the response body so the UI can surface it without blocking;
  - `ok` → save.

  Videos report `width`/`height` from Cloudinary too, so the same check covers MP4.
- [ ] **Step 4: `[id]/creatives/[creativeId]/route.ts`** — `DELETE` one: 409 if not editable, ownership check, destroy, delete.
- [ ] **Step 5: `[id]/creatives/[creativeId]/file/route.ts`** — copy the driver file proxy exactly, including `Cache-Control: private, max-age=300` and the 404-on-mismatch comment. Pass `resource_type` through to `fetchPrivateAsset`.
- [ ] **Step 6: `[id]/submit/route.ts`** — copy `/v1/driver/profile/submit/route.ts`: 409 if not editable; 400 with `{ missingFields, missingCreatives }` if incomplete; set `status: "submitted"`, `submitted_at`, `review_reason: null`; audit. Then **one trailing try/catch** firing all five notifications from the matrix: `customerNotification.create` (`campaign_submitted`, `href: /campaigns/:id`), `notifyUserPush("customer", …)`, `sendEmail(CampaignSubmitted)`, `sendAdminEmail(AdminAlert, type: "campaign", reviewUrl("/campaigns/" + id))`, `notifyOpsStaffAlert`.
- [ ] **Step 7: Verify** — exercise all six via `bruno/` or curl. Confirm a second customer account gets **404** (not 403) on another user's campaign and creative file. Confirm a submit with a dead Expo token still returns 200.
- [ ] **Step 8: Commit** — `feat(api): add advertiser campaign CRUD, creative upload, and submit with notifications`

---

## Task 9: API — ops campaign review routes

**Files:** create the four routes under `apps/api/app/v1/campaigns/`; modify `apps/api/lib/push/ops-alerts.ts`

- [ ] **Step 1: `route.ts`** — `GET` under `requireOpsPermissionAccess("campaigns")`, paginated exactly like `/v1/driver-applications`, supporting `?status=` and `?q=` (name / contact email contains). Returns `PaginatedResponse<CampaignListItemDto>`.
- [ ] **Step 2: `[id]/route.ts`** — `GET` full `CampaignDto` with creatives.
- [ ] **Step 3: `[id]/review/route.ts`** — copy `/v1/driver-applications/[id]/review/route.ts` line for line: review from `submitted`; "unapprove" walk-back from `approved` when `decision !== "approved"`; 400 when a non-approve decision has no `reason`; write `status`, `reviewed_at`, `reviewed_by_email: access.email`, `review_reason` (null on approve); `auditFromOpsUser` with `entity_type: "campaign"`. Then one trailing try/catch firing the three advertiser notifications: `customerNotification.create` (type per decision, **body = the reason** for non-approvals), `notifyUserPush("customer", campaign.clerk_user_id, …)`, `sendEmail(CampaignDecision)`.
- [ ] **Step 4: `[id]/creatives/[creativeId]/file/route.ts`** — copy the ops driver-document proxy, gated on `requireOpsPermissionAccess("campaigns")` + `campaign_id` match.
- [ ] **Step 5: `ops-alerts.ts`** — the `"campaign"` alert type exists but its `ROUTE_SEGMENT` maps to `leads`, so the push deep-links to the wrong ops-mobile screen. Point it at `campaigns` and confirm the `leads` alert path (used by the marketing lead form) still resolves correctly — that form fires the same alert type today, so **check whether it needs its own type** rather than silently redirecting existing alerts.
- [ ] **Step 6: Verify** — approve, request-changes, reject, and unapprove; confirm the audit row lands on ops `/activity`, `review_reason` returns on the advertiser `GET`, and all three advertiser notifications fire.
- [ ] **Step 7: Commit** — `feat(api): add ops campaign list, detail, review, and creative proxy routes`

---

## Task 10: Customer web — real data + full-page create flow

**Files:** create `lib/campaigns-client.ts`, `lib/use-campaigns.ts`, `app/(shell)/campaigns/new/*`, `components/campaigns/new/*`, `creative-upload-field.tsx`, `campaign-review-banner.tsx`; modify `campaigns-view.tsx`, `campaign-detail-view.tsx`, `campaign-status-badge.tsx`, `campaign-calendar.ts`; delete `lib/campaigns.ts`, `new-campaign-form.tsx`

- [ ] **Step 1: `lib/campaigns-client.ts`** — copy the `authedFetch` shape from `driver-web/lib/driver-profile-client.ts` (**not** `announcements-client.ts` — its 4-second `AbortSignal.timeout` will kill a 50MB video upload). Export the full CRUD + `uploadCreative` (FormData; **do not set `Content-Type`**, the browser sets the boundary), `deleteCreative`, `submitCampaign`, `creativeFileUrl`.
- [ ] **Step 2: `lib/use-campaigns.ts`** — TanStack Query hooks keyed `["customer-campaigns"]` / `["customer-campaign", id]`, mutations invalidating both, and `toast.success` / `toast.error(formatApiError(e))` in `onSuccess` / `onError` so every surface gets the matrix's toast row for free. Single source of truth for the list, detail, and calendar.
- [ ] **Step 3: `campaign-status-badge.tsx`** — take `CampaignStatus` + `CampaignFlightPhase` from contracts. Render the **flight phase** for approved campaigns (`Scheduled` / `Live` / `Completed`) and the **review status** otherwise (`Draft`, **`In queue`** for `submitted`, `Changes needed`, `Rejected`, `Cancelled`). Ops sees the raw status; advertisers see "In queue".
- [ ] **Step 4: `campaign-review-banner.tsx`** — advertiser counterpart to the driver status card. Nothing for `draft`/`approved`; amber "In queue — we're reviewing this" for `submitted`; destructive-bordered block carrying `review_reason` verbatim for `rejected` / `changes_requested`, with an "Edit and resubmit" button. Copy the markup from `driver-verification-section.tsx`.
- [ ] **Step 5: `app/(shell)/campaigns/new/page.tsx`** — a **real route**, not a Sheet. Reads `?start=` / `?end=` so the calendar can deep-link a window, and `?id=` to resume/edit. Chrome mirrors the driver stepper's full-screen surface: sticky bar with `<Logo markHeight={18} />` + close routing to `/campaigns`, then `mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14`. Add `loading.tsx`.
- [ ] **Step 6: `campaign-wizard.tsx`** — copy `driver-web/components/profile-setup/stepper.tsx`: `@workspace/ui/components/stepper`, a `% complete` line, per-step completion derived from the campaign (so a `changes_requested` campaign resumes at the first incomplete step). Steps: **Brief** (name, objective, market, corridors, format) → **Flight & budget** (native `<input type="date">`, no picker dependency; budget KES) → **Creative** (upload/preview/delete, ≥1 required) → **Review** (read-only summary + Submit). Creates the draft on leaving step 1 and `PATCH`es per step, so a half-finished campaign survives a refresh.
- [ ] **Step 7: `creative-upload-field.tsx`** — copy `driver-web/components/profile-setup/document-upload-field.tsx`, extended for multiple files and video. Previews go through `creativeFileUrl` + `fetch` + `URL.createObjectURL` with cleanup (the ops `DocumentPreview` pattern) — **never** an `<img src>` pointed at Cloudinary. Video renders in `<video controls>`.

  **Surface the spec at the upload point, from `CREATIVE_SPECS` — never hardcode the numbers.** For the campaign's selected format, render above the dropzone:
  - **Taxi-top LED** — `960 × 320 mm` canvas, `3:1`, **double-sided**
  - **Delivery bike box** — `320 × 320 mm` canvas, `P2.5`, **three sides**
  - *"PNG, JPG, GIF or MP4 · up to 50 MB"*, and for `format: "both"`, make clear that **both** aspect ratios are needed.

  Set `accept=".png,.jpg,.jpeg,.gif,.mp4"` from `CREATIVE_FILE_EXTENSIONS`. Pre-check dimensions client-side (an `Image()` / `<video>` `loadedmetadata` read) purely for instant feedback — the server check in Task 8 is the real gate. Render a server `warn` as an amber note on the row, not a failure.
- [ ] **Step 8: `campaigns-view.tsx`** — delete the `Sheet` / `SheetTrigger` / `NewCampaignForm` block; the floating button becomes `<Button asChild><Link href="/campaigns/new">`. Data from `useCampaigns()`. Filters: `All / In queue / Scheduled / Live / Draft / Needs changes`. Drop the "saved on this device" copy. Add a loading skeleton and an empty state pointing at `/campaigns/new`.
- [ ] **Step 9: `campaign-detail-view.tsx`** — real data via `useCampaign(id)`; `CampaignReviewBanner` under the title; a creatives strip; keep the illustrative spend/impression stats but key them off the derived flight phase and label them clearly as estimates. Add Edit (editable statuses only) and Cancel.
- [ ] **Step 10: `campaign-calendar.ts`** — retype against `CampaignDto` (`starts_on` / `ends_on`). `parseDisplayDates` and the month-name table existed only to recover dates from seeded `"Jun 1 – Aug 31"` strings; with real columns that path is dead — delete it and its tests.
- [ ] **Step 11: Delete** `lib/campaigns.ts` and `new-campaign-form.tsx`. Grep stragglers: `rg "lib/campaigns\"|NewCampaignForm|createdLocally" apps/customer-web`.
- [ ] **Step 12: Verify** — sign in, walk the wizard with a real image and a real MP4, submit; confirm "In queue", the toast, and the ops row.
- [ ] **Step 13: Commit** — `feat(customer-web): replace local campaign store with API-backed full-page campaign flow`

---

## Task 11: Customer web — calendar + merged notification inbox

**Files:** modify `components/calendar/campaign-calendar-view.tsx`, `flight-calendar.tsx`, `lib/use-customer-notifications.ts`; create `lib/customer-notifications-client.ts`

- [ ] **Step 1:** Swap `getCampaigns()` / `scheduleCampaign()` / `rescheduleCampaign()` for the query hooks. Drag-to-move and drag-to-resize call `updateCampaign`, optimistic with rollback on error.
- [ ] **Step 2:** Only editable-status campaigns are draggable — `editable: false` on events for `submitted` / `approved` / `cancelled`, with a toast explaining a refused drag. A campaign under review must not silently change dates.
- [ ] **Step 3:** Colour by review status and update the legend: **Live** (primary), **Scheduled** (primary/45), **In queue** (amber), **Needs changes** (destructive), **Draft** (muted).
- [ ] **Step 4:** Replace the "Plan a flight" `Sheet` with a link to `/campaigns/new?start=…&end=…` — one create surface, not two. Keep the "Unscheduled" sidebar; "Start on this day" becomes a `PATCH`.
- [ ] **Step 5: `customer-notifications-client.ts`** — copy `driver-web/lib/driver-notifications-client.ts` against `/v1/customer/notifications`.
- [ ] **Step 6: `use-customer-notifications.ts`** — currently announcements-only. Rewrite it as the **merged** two-source hook, copying `driver-web/lib/use-driver-notifications.ts`: two infinite queries (`["customer-announcements"]`, `["customer-notifications"]`), summed unread counts, `source:` prefix on feed ids, per-source read routing. Extend `notifications-map.ts` with a `campaignNotificationToFeedItem` mapper (`category: "Campaign"`, `tone: "info"`, `href` → row link).
- [ ] **Step 7: Verify** — a campaign decision appears in the header bell and `/notifications` alongside announcements, in correct time order, with a working unread count and deep link.
- [ ] **Step 8: Commit** — `feat(customer-web): real-data calendar and merged campaign notification inbox`

---

## Task 12: Customer mobile — campaign flow

**Files:** create `lib/campaigns-client.ts`, `lib/use-campaigns.ts`, `components/campaigns/creative-picker.tsx`, `campaign-review-banner.tsx`; rewrite `app/(tabs)/campaigns/{index,new,[id]}.tsx`; modify `components/calendar/campaign-calendar-view.tsx`, `components/ui/status-badge.tsx`, `lib/campaign-calendar.ts`; delete `lib/campaigns.ts`

`new.tsx` is already a full-screen route, so the "not a side sheet" requirement is satisfied by structure — the work is making it multi-step and API-backed.

- [ ] **Step 1: `lib/campaigns-client.ts` + `use-campaigns.ts`** — mirror the web clients against the same endpoints, using the app's existing authed-fetch + TanStack Query setup. No AsyncStorage.
- [ ] **Step 2: `creative-picker.tsx`** — `expo-image-picker` (already a dependency at `~17.0.11`) with `mediaTypes` covering images **and** videos. Upload as `FormData` with `{ uri, name, type }`; enforce the same mime/size limits client-side for a fast failure, and show inline per-file progress and error rows. Render the same `CREATIVE_SPECS` block as web (canvas mm, aspect, sides, `PNG · JPG · GIF · MP4`) above the picker — imported from contracts, not retyped. The picker returns `width`/`height`, so warn inline on a bad aspect before spending the user's mobile data on the upload.
- [ ] **Step 3: `new.tsx`** — rewrite as the same four-step wizard, using the app's existing step/progress components. Creates the draft after step 1, `PATCH`es per step. Add `[id]/edit.tsx` reusing the same component for resume/edit.
- [ ] **Step 4: `campaign-review-banner.tsx`** — RN equivalent of the web banner, showing `review_reason` verbatim.
- [ ] **Step 5: `index.tsx` / `[id].tsx`** — real data, new status filters, review banner on the detail screen, creatives strip (image thumbnails via the authenticated proxy; video with a play affordance).
- [ ] **Step 6: `status-badge.tsx` + `campaign-calendar.ts`** — same status/phase split and same dead-code deletion as web.
- [ ] **Step 7: Calendar** — real data, same colour legend. Skip drag-to-reschedule on mobile unless it already exists; tapping a day and picking a campaign is enough.
- [ ] **Step 8: Feedback** — no toast library exists here. Use inline banners and pending/disabled button states (the `ops-mobile` `ApiErrorBanner` pattern). **Do not add a toast dependency.**
- [ ] **Step 9: Delete** `apps/customer-mobile/lib/campaigns.ts`; grep for stragglers.
- [ ] **Step 10: Verify** — on a device: create, upload a photo and a video from the camera roll, submit, receive the push, tap it and land on the campaign.
- [ ] **Step 11: Commit** — `feat(customer-mobile): API-backed campaign flow with creative upload`

---

## Task 13: Customer mobile — push handling + merged inbox

**Files:** modify `lib/notifications-core.ts`, `lib/notifications-data.ts`, `app/notifications.tsx`, `components/notifications/*`

- [ ] **Step 1:** Extend the inbox source to merge `/v1/customer/notifications` with the existing announcement feed — same two-query merge as Task 11.
- [ ] **Step 2:** Handle the notification **tap**: `expo-notifications`' response listener reads `data.href` (set by `notifyUserPush`) and routes to `/campaigns/:id`. Confirm this works from cold start, background, and foreground.
- [ ] **Step 3:** Confirm the customer push token registers with `clerk_user_id` populated after sign-in — `notifyUserPush` looks up by `clerk_user_id`, and a token registered only against `anonymous_device_id` will never receive a campaign push. Fix the registration call if it doesn't re-upsert on sign-in.
- [ ] **Step 4: Verify** — approve a campaign in ops; the push lands, the tap deep-links, the inbox row is there and marks read.
- [ ] **Step 5: Commit** — `feat(customer-mobile): merged campaign notification inbox and push deep links`

---

## Task 14: Ops web — sidebar, list, detail, review

**Files:** create `app/(dashboard)/campaigns/*`, `components/campaign-detail-skeleton.tsx`; modify `components/ops-shell.tsx`, `app/(dashboard)/layout.tsx`, `lib/entity-pages.ts`, `lib/queries/entities.ts`, `components/status-badge.tsx`

- [ ] **Step 1: `lib/entity-pages.ts`** — add `CAMPAIGNS_PAGE` (columns: Submitted, Campaign, Advertiser, Market, Flight, Budget, Status).
- [ ] **Step 2: `lib/queries/entities.ts`** — `listCampaigns(...)` (copy `listDriverApplications`) and `getPendingCampaignsCount` (copy `getPendingDriverApplicationsCount`, `where: { status: "submitted" }`, same `unstable_cache` wrapper).
- [ ] **Step 3: `ops-shell.tsx`** — add the nav item after Driver Applications with `permission: "campaigns"`. `Megaphone` is already imported for Campaign Leads; if the two read confusingly side by side, give Campaigns `MonitorPlay`. Add `"campaigns"` to the `canSeeNotifications` list.

  **Generalize the badge.** Replace the hardcoded `item.href === "/driver-applications"` check (`ops-shell.tsx:259`) with a `pendingCounts: Partial<Record<string, number>>` prop keyed by href. A third hardcoded branch is the wrong shape.
- [ ] **Step 4: `app/(dashboard)/layout.tsx`** — fetch the campaigns count under the same permission guard and pass the combined `pendingCounts` map.
- [ ] **Step 5: List page** — copy `driver-applications/{page,driver-applications-view}.tsx`: `requireOpsPermission("campaigns")`, `PageHero`, status `Select`, `DataTable`, `TablePagination`, the `toast.error(formatApiError(...))` effect, and the `meta: { cellClassName: "p-0" }` full-cell-link trick.
- [ ] **Step 6: Detail page** — copy `driver-application-detail-view.tsx`: back arrow, name, submitted timestamp, `StatusBadge`; "Last review note" block; `DetailRow` block (advertiser, market, corridors, format, flight window, budget, objective, notes); a **creatives grid** reusing the `DocumentPreview` blob-fetch + `ImageLightbox` pattern with a `<video controls>` branch; and the decision panel (Approve / Request changes / Reject with required `Textarea` reason, plus Unapprove). Add `campaign-detail-skeleton.tsx`.

  **Each creative tile shows its spec compliance** — `1920 × 640 · 3:1 ✓ taxi-top` or `800 × 600 · 4:3 ✗ expected 3:1` — computed with the same `checkCreativeDimensions` the API used, plus file size, MP4 duration, and the `slot`. A reviewer must see at a glance that artwork will actually render on the panel rather than judging it by eye.
- [ ] **Step 7: `status-badge.tsx`** — it already styles `draft`/`submitted`/`approved`/`rejected`/`changes_requested`. Add only `cancelled`, `live`, `scheduled`, `completed`.
- [ ] **Step 8: Verify** — as an ops **member** with only `campaigns`: nav item + badge appear, list loads, a decision succeeds, the badge decrements, every other section stays hidden. Without the permission, `/campaigns` redirects to `/home`.
- [ ] **Step 9: Commit** — `feat(ops): add campaigns review section with sidebar entry and pending badge`

---

## Task 15: Ops mobile — campaign review

**Files:** create `app/(ops)/campaigns/{_layout,index,[id]}.tsx`; modify `app/(ops)/_layout.tsx` and the ops-mobile dashboard/menu

- [ ] **Step 1:** Copy `app/(ops)/driver-applications/` wholesale — `_layout.tsx` (39 lines), `index.tsx` (155), `[id].tsx` (321) — retargeted at `client.campaigns.*`. The ops-api-client namespace from Task 2 means no new fetch code.
- [ ] **Step 2: `_layout.tsx` registration** — add the `campaigns` screen next to `driver-applications` (`app/(ops)/_layout.tsx:160`) and add the entry to the ops-mobile menu/dashboard, gated on the `campaigns` permission.
- [ ] **Step 3: `[id].tsx`** — same review panel (`ApiErrorBanner`, `reviewMutation`, reason `TextInput` required for non-approve, confirm dialog for Approve). Creatives render via the ops proxy URL with the bearer token; video gets a play affordance rather than an inline player if that's simpler.
- [ ] **Step 4: Push deep link** — Task 9 pointed the `campaign` alert's `ROUTE_SEGMENT` at `campaigns`; confirm tapping the ops alert lands on `/(ops)/campaigns/:id`.
- [ ] **Step 5: Verify** — on a device: receive the ops alert for a new submission, tap through, review with a reason, confirm the advertiser sees it.
- [ ] **Step 6: Commit** — `feat(ops-mobile): add campaign review section`

---

## Task 16: Round-trip verification

- [ ] **Step 1:** Advertiser (web) creates a campaign through the full-page wizard with one image + one video, submits.
- [ ] **Step 2:** Confirm **all five submit-side notifications**: advertiser toast, advertiser inbox row, advertiser push (if a device is registered), advertiser email, ops push + admin email + sidebar badge increment.
- [ ] **Step 3:** Ops web detail page — both creatives preview (image lightbox, video plays). Request changes with a reason.
- [ ] **Step 4:** Confirm **all four decision-side notifications** reach the advertiser: inbox row whose body is the reason, push, email with the reason, and the banner on reload. The campaign is editable again.
- [ ] **Step 5:** Advertiser (mobile) edits, re-uploads creative from the camera roll, resubmits. Ops **approves** from ops-mobile.
- [ ] **Step 6:** Advertiser sees `Scheduled` (or `Live`), and the campaign renders in the right colour on **both** calendars.
- [ ] **Step 7:** Ops **unapproves**; confirm the walk-back and the reason reach the advertiser.
- [ ] **Step 8:** Sign in as a second advertiser; confirm `GET /v1/customer/campaigns/<other id>` and the creative file route both return **404**.
- [ ] **Step 9:** Confirm ops `/activity` lists every create / submit / review event.
- [ ] **Step 10:** Full check suite — lint, typecheck, unit tests, Playwright `e2e/`, and an EAS `--environment preview` build for both Expo apps (per the repo's mobile build rule, never bake the builder's LAN IP).

---

## Task 17: Documentation

Per `CLAUDE.md`, docs ship in the same change.

- [ ] **Step 1: `docs/api/API.md`** — all thirteen new endpoints, their auth (customer Clerk vs. ops `campaigns` permission), the multipart creative contract, and the 404-not-403 ownership rule.
- [ ] **Step 2: `docs/customer/APP.md` + `APP-MOBILE.md`** — replace the "campaigns live in localStorage" description on both: full-page wizard, creative upload, submit-for-review, status + rejection-reason surfaces, merged notification inbox, push deep links, calendar drag rules.
- [ ] **Step 3: `docs/ops/OPS-ADMIN.md` + `MOBILE-OPS.md`** — the Campaigns section on both surfaces, decision semantics (approve / request changes / reject / unapprove), that the reason is **advertiser-visible**, and that `campaigns` is a new grantable permission.
- [ ] **Step 4: `docs/shared/DATA-LAYER.md`** — the three new tables + `npm run -w web db:campaigns`; the derived-flight-phase rule so nobody adds a `live` column; and **the supplier / screen-API seam note in full** — creative metadata is captured eagerly, private storage does not block supplier delivery and needs no re-upload, and dispatch state lands as its own additive `campaign_placements` table rather than being crammed into `campaigns.status`. Include the **hardware spec table** (960×320 mm double-sided taxi top; 320×320 mm P2.5 three-side bike box; PNG/JPG/GIF/MP4 only, no WebP/WebM/BMP; supplier-side transcoding) and the list of **supplier playlist primitives we deliberately don't build** (text boxes, clocks, web pages, environmental sensors), so neither the spec nor the unused capability is lost.
- [ ] **Step 5: `docs/shared/DEPLOYMENT.md`** — `campaigns-additive.sql` in the ordered per-environment migration checklist; `CLOUDINARY_URL` is now load-bearing for a second feature.
- [ ] **Step 6: `docs/shared/FEATURE-INVENTORY.md`** — move campaigns from mock/placeholder to shipped; note the first targeted per-user push in the repo.
- [ ] **Step 7:** `graphify update .`
- [ ] **Step 8: Commit** — `docs: document the end-to-end campaign submission, review, and notification flow`

---

## Deliberately out of scope

| Deferred | Why | Add when |
|---|---|---|
| **Supplier screen-API dispatch** (`campaign_placements`, playout reporting, impression reconciliation) | No supplier contract or API spec in the repo yet. Task 1 + Task 17 leave the seam open: creative specs are already stored, private storage needs no re-upload, and dispatch state has a documented home. | The first supplier integration is specified. |
| **Flight start / end notifications** | The only cell in the matrix that needs a scheduler — everything else is request-triggered. A cron is a new operational surface for a nice-to-have. | Advertisers ask for go-live alerts; then one Vercel cron over `starts_on` / `ends_on`. |
| **Real impressions / spend** | The detail page's spend and impression figures stay clearly-labelled estimates. Real numbers come from supplier playout reporting, not from us. | Supplier reporting lands. |
| **Retrofitting `notifyUserPush` onto driver decisions** | Task 6 makes it audience-generic so this is a two-line change, but touching the live driver flow inside this plan widens the blast radius. | Immediately after this ships, as its own small change. |
| **`driver-mobile` changes** | Drivers don't create or review campaigns. Nothing to do. | Never, unless drivers get campaign visibility. |
| ~~Creative spec validation~~ — **now in scope** | The supplier spec arrived (960×320 double-sided taxi top, 320×320 P2.5 three-side bike box, PNG/JPG/GIF/MP4). Built in Tasks 2, 3, 8, 10, 12, 14. | — |
| **Exact-pixel hard validation** | Aspect ratio is enforced hard; pixel dimensions only warn, because whether 960×320 is millimetres or pixels is unconfirmed. The soft check is correct under both readings. | The supplier confirms panel resolution — then flip `checkCreativeDimensions` to a hard check. |
| **Per-side creative** (different artwork on side A vs B, or the bike's three faces) | The `slot` column exists and defaults to `"all"`, so this is a picker, not a migration. Most advertisers want one creative everywhere. | An advertiser asks for per-face artwork. |
| **Supplier playlist primitives** — scrolling text boxes, digital/analog clocks, embedded web pages, vehicle temperature readouts | These are player-side features configured in the supplier console, not advertiser file uploads. A campaign here is creative files. | Ops wants to compose playlists from our side rather than theirs. |
| **Video transcoding** | The supplier console has its own Transcoding toggle producing hardware-friendly profiles. Re-encoding here would degrade the master for no gain. | Never, unless the supplier drops that feature. |
| **Pricing / invoicing on approval** | Payments are a separate track (Pesapal). `budget_kes` is stated intent, not a charge. | The payments slice lands. |
| **Mobile toast library** | `packages/mobile-ui` is an empty stub and neither Expo app has one. Inline banners already carry this weight in ops-mobile. | A broader mobile design-system pass, not this feature. |
| **Internal-only ops notes** | `audit_events` already records who decided what, when. A second private column duplicates it. | Ops needs threaded internal discussion — which is a support-case shape, not a column. |
