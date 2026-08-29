# Announcement images — research findings & implementation plan

Status: **implemented** (2026). `broadcastCreateSchema` includes `image_url`; `POST /v1/notifications/broadcast-image` uploads to Vercel Blob; ops-mobile compose uses `expo-image-picker`; Prisma additive SQL is `npm run db:announcements-image -w web`. See [FEATURE-INVENTORY.md](../shared/FEATURE-INVENTORY.md) (Vercel Blob + announcements).

The rest of this file is the original research/plan from before that work shipped. Treat it as historical context, not current-state.

---

---

## Part 1 — Current-state research

### 1. Composer UI — `apps/ops-mobile/app/(ops)/announcements/new.tsx`

A thin wrapper around a shared generic form component, not a custom screen:

```tsx
import { useState } from "react"
import { Alert } from "react-native"
import { useRouter } from "expo-router"
import { ANNOUNCEMENT_FORM_FIELDS, broadcastCreateSchema } from "@workspace/ops-contracts"
import { EntityFormScreen } from "@/components/EntityFormScreen"
...
const handleSubmit = async (values: Record<string, string>) => {
  const parsed = broadcastCreateSchema.safeParse({
    title: values.title,
    body: values.body,
    category: values.category || "announcement",
  })
  ...
  Alert.alert("Send to all customers?", "...", [...])
}
...
return (
  <EntityFormScreen
    title="New announcement"
    fields={ANNOUNCEMENT_FORM_FIELDS}
    initialValues={{ category: "announcement" }}
    submitLabel="Send to all customers"
    ...
  />
)
```

**Fields today:** only `category` (single-select), `title` (text), `body` (multiline text) — defined declaratively in `packages/ops-contracts/src/form-fields.ts` as `ANNOUNCEMENT_FORM_FIELDS` and rendered generically by `apps/ops-mobile/components/EntityFormScreen.tsx`.

**Form pattern:** All ops-mobile entity forms (leads, drivers, fleet, media-kit, announcements) share one generic renderer, `EntityFormScreen`, driven by a `FormFieldDef[]` array (`{ name, label, type?: "text"|"email"|"multiline", required?, options?, multi?, placeholder?, section? }`). It manages a flat `Record<string,string>` state, renders `TextInput` for text fields and a `BottomSheetPicker` for `options` fields. **There is no field type for images/files at all** — adding image support means either extending `FormFieldDef`/`EntityFormScreen` with a new field type, or building a bespoke picker section outside the generic renderer (more likely, given upload needs a preview + picker button, not a plain input).

**Existing image-picker pattern check:** `expo-image-picker` (`~17.0.11`) is listed as a dependency in both `apps/ops-mobile/package.json` and `apps/customer-mobile/package.json`, and is even pre-configured as a plugin in `customer-mobile`'s `app.json` (with permission strings mentioning "campaign creatives" — suggesting it was anticipated for a future feature). **But it is never imported or used anywhere in the codebase today.** No `expo-image-manipulator` or `expo-file-system` usage anywhere either. All "avatar" references in the repo are initials-based placeholder avatars, not real photo uploads. **There is no existing image-picker/upload pattern anywhere in either mobile app to copy from** — this is genuinely new code, though the dependency is already installed.

### 2. Schema — `packages/ops-contracts/src/schemas.ts` / `types.ts`

`broadcastCreateSchema` (schemas.ts:154-158):
```ts
export const broadcastCreateSchema = z.object({
  title: z.string().trim().min(1).max(65),
  body: z.string().trim().min(1).max(178),
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
})
export type BroadcastCreateInput = z.infer<typeof broadcastCreateSchema>
```
`ANNOUNCEMENT_CATEGORIES` (enums.ts:59-66): `["announcement", "campaign", "billing", "promo", "system"]`.

`AnnouncementDto` (types.ts:137-150):
```ts
export type AnnouncementDto = {
  id: number
  title: string
  body: string
  category: string
  sent_by_email: string
  target_count: number
  delivered_count: number
  invalid_count: number
  status: string
  created_at: string
  deleted_at: string | null
  deleted_by_email: string | null
}
```
No `image`/`image_url`/`media` field anywhere in this shape. `ANNOUNCEMENT_FORM_FIELDS` in `packages/ops-contracts/src/form-fields.ts:211-240` only declares `category`, `title`, `body`.

### 3. API backend — `apps/api`

- **Route:** `POST apps/api/app/v1/notifications/broadcast/route.ts` — auth via `requireOpsUser()`, validates body with `broadcastCreateSchema`, calls `broadcastToCustomers(parsed.data, sender)`, writes an audit event, returns 201 with the `AnnouncementDto`.
- **Business logic:** `apps/api/lib/push/broadcast-customers.ts`. ORM is **Prisma** (`@/lib/prisma`), schema at `apps/web/prisma/schema.prisma` (shared/single Prisma schema used by `apps/api`, even though it physically lives under `apps/web`). Relevant models:
  - `AnnouncementBroadcast` (table `announcement_broadcasts`): `id, title, body, category, sent_by_clerk_id, sent_by_email, target_count, delivered_count, invalid_count, status, created_at, deleted_at, deleted_by_email` — no image column.
  - `CustomerPushToken` (table `customer_push_tokens`): `id, expo_push_token, platform, created_at, updated_at`.
  - `PushTicket` (table `push_tickets`): per-token send/delivery outcome, linked to broadcast via `broadcast_id`.
  - Flow: fetch all `CustomerPushToken` rows → create `AnnouncementBroadcast` row (status `sending`/`sent`) → build Expo messages → `sendExpoPushMessages` → record tickets via `recordPushTickets` → delete dead tokens → update broadcast with `delivered_count`/`invalid_count`/`status`.
- **Push transport:** Raw HTTP to Expo's push service (`apps/api/lib/push/expo-push.ts`), not the Expo Server SDK package and not Firebase directly — posts JSON to `https://exp.host/--/api/v2/push/send` (chunked at 100/msg) and reads receipts from `https://exp.host/--/api/v2/push/getReceipts` (chunked at 1000).
- **Expo payload shape** (`ExpoPushPayload` type, expo-push.ts:11-21) before this feature: only `to, title, body, sound, channelId, color, priority, ttl, data`. No image/attachment field existed.
- **Delete/list routes:** `apps/api/app/v1/notifications/route.ts` (GET, paginated, ops auth) and `apps/api/app/v1/notifications/[id]/route.ts` (soft-delete).
- **Public read-only feed for the customer app:** `apps/api/app/v1/public/announcements/route.ts` — no auth, Prisma `announcementBroadcast.findMany({ where: { deleted_at: null }, take: 30, select: { id, title, body, category, created_at } })`. This is what `customer-mobile` actually polls. **Any new column must also be added to this `select` clause** or it won't reach the customer app.

### 4. Existing upload infrastructure — repo-wide search

**No reusable image/file upload infrastructure exists** that ops-mobile, customer-mobile, or `apps/api` already use for user-driven content. Searched for S3/`@aws-sdk`, Cloudinary, Supabase storage, `multer`, `formidable`, presigned URLs, "upload" — zero hits outside one unrelated area.

The **only** file/image storage system in the entire monorepo is **Payload CMS's `Media` collection** (`apps/web/collections/Media.ts`), backed by `@payloadcms/storage-vercel-blob` (Vercel Blob) when `BLOB_READ_WRITE_TOKEN` is set, with `sharp`-generated thumbnail/card/hero sizes. This is used **exclusively for the marketing site's CMS content** (blog posts, help articles) — a completely separate Next.js app (`apps/web`) from `apps/api` (which is what the mobile apps actually talk to), with separate auth (Clerk ops-auth vs. Payload's own `Users` collection). Reusing it directly would mean cross-app coupling that doesn't exist today.

`media-kit` (`apps/api/app/v1/media-kit/*`) is a red herring name-wise — it's just a lead-capture form (`name`, `email`) for people requesting Admobi's media kit PDF; nothing to do with image storage.

**Conclusion:** adding image upload means building new infrastructure from scratch on the `apps/api` side. **Confirmed via direct repo search (2026-08-02): no Cloudflare, Cloudinary, or AWS SDK/credentials exist anywhere in the codebase.** The only thing already live is Vercel Blob's `BLOB_READ_WRITE_TOKEN` in `apps/api/.env.local`, via the Payload integration described above.

### 5. Ops web dashboard — `apps/ops/app/(dashboard)/announcements/`

Has its own composer, but reuses the same contract/fields as mobile — `apps/ops/app/(dashboard)/announcements/announcements-view.tsx` renders a `SimpleFormDialog` driven by the **same** `ANNOUNCEMENT_FORM_FIELDS` array from `@workspace/ops-contracts`. Field list is identical to mobile: `category`, `title`, `body`. Since both surfaces derive their fields from the same shared constant, adding an image field to that shared array is the natural single point of extension for both — though each renderer (`EntityFormScreen` on mobile, whatever `SimpleFormDialog` uses on web) still needs its own upload-widget support added, since neither currently handles anything beyond text/select.

### 6. Customer-side rendering — `apps/customer-mobile`

Purely text today, no image-capable layout:
- `apps/customer-mobile/app/notifications.tsx` — `SectionList` grouped by "Today"/"Earlier", each row rendered by `NotificationRow`.
- `apps/customer-mobile/components/notifications/notification-row.tsx` — layout is a small icon-wrap (36×36, category icon like `Megaphone`/`Gift`/`Warning`, **not** a real image), then title (2 lines), body (2 lines), then category + relative time. **No `<Image>` component, no image URL field, no space reserved for a photo/banner.**
- `apps/customer-mobile/lib/notifications-data.ts` defines `NotificationItem` and `AnnouncementBroadcastDto` — both purely text.
- `apps/customer-mobile/lib/use-live-announcements.ts` fetches `GET /v1/public/announcements` and maps DTOs into `NotificationItem`s.
- Push side: `apps/customer-mobile/lib/notifications-core.ts` configures `expo-notifications`' foreground handler and Android channel — generic OS-level push handling, no rich-content/image attachment configured.

**To show an image**, both `NotificationRow` and the section-list layout need new UI, the DTO/item types need an `image_url` field, and the public API route's Prisma `select` needs the new column.

### Summary table

| Piece | Status |
|---|---|
| Shared field schema (`ANNOUNCEMENT_FORM_FIELDS`, `broadcastCreateSchema`, `AnnouncementDto`) | Exists, needs a new `image_url` field added in one place (`packages/ops-contracts`), consumed by both ops-mobile and ops-web |
| Prisma `AnnouncementBroadcast` model | Exists, needs an additive schema change (see migration convention below) |
| Broadcast send logic / Expo payload | Exists, but `ExpoPushPayload` had no image field — needs extending |
| Public feed route `select` | Exists, must whitelist the new column |
| Customer-mobile row UI | Text-only today, needs new `<Image>` UI |
| Image upload/storage backend | **Does not exist for these apps.** Only Payload+Vercel-Blob exists, scoped to `apps/web`'s CMS |
| `expo-image-picker` on mobile | Installed as a dependency in both mobile apps but **never used anywhere** — first real usage would be net-new code |

### Migration convention (important — do not use `prisma migrate`/`db push`)

This repo does **not** use Prisma's own migration history. Schema changes go through hand-written "additive" SQL scripts in `apps/web/prisma/scripts/*-additive.sql`, each with a header comment explaining how to run it, e.g. `apps/web/prisma/scripts/announcements-soft-delete-additive.sql`:

```sql
-- Safe additive migration: soft-delete support for announcement_broadcasts.
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard → SQL Editor → paste this entire file → Run
--   B) From repo root: npm run db:announcements-soft-delete -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

ALTER TABLE announcement_broadcasts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
...
```
The npm script behind it (`apps/web/package.json`): `"db:announcements-soft-delete": "dotenv -e .env.local -- prisma db execute --file prisma/scripts/announcements-soft-delete-additive.sql"`.

**Why:** the Postgres database backing `apps/api`'s Prisma schema is shared with Payload CMS's own tables and n8n workflow tables. Prisma's own `migrate`/`db push` would try to reconcile the *entire* database schema, including tables it doesn't know about, risking destructive drift. Any new column for this feature must follow the same additive-SQL-script pattern, and should be run manually (not by an agent) against the real database.

---

## Part 2 — Storage/CDN provider comparison

Requirement driving this: the user wants uploaded images enforced to a **specific size/resolution**, and this upload plumbing should be **reusable for a near-future feature — campaign creative uploads broadcast to the fleet** — not a one-off just for announcements.

Repo check performed 2026-08-02: **no Cloudflare, Cloudinary, or AWS credentials/SDKs exist anywhere in this codebase.** Vercel Blob is the only option with zero new setup (`BLOB_READ_WRITE_TOKEN` already live in `apps/api/.env.local`, via the Payload CMS integration).

| | **Vercel Blob** | **AWS S3 (+CloudFront)** | **Cloudflare R2 (+Images)** | **Cloudinary** |
|---|---|---|---|---|
| Already in this repo | Yes, live token today | Net-new | Net-new (no CF anywhere in repo, not even DNS) | Net-new |
| Setup effort | Trivial — one `put()` call | Meaningful — IAM, bucket policy, CORS, CDN | Two products to wire (R2 storage + Images transforms) | Moderate — one account, one SDK |
| Server-guaranteed dimensions | No transform API — dumb object storage | Not without building a Lambda/Sharp resize layer | Cloudflare Images does URL-based resize variants | URL-based transforms (`w_1200,h_600,c_fill`), most mature API for this |
| Bandwidth/egress cost model | Pay per GB stored + served | Pay per GB stored + CloudFront egress | Zero egress fees (R2's headline feature) | Bundled into per-plan "credits" (storage+bandwidth+transforms) |
| Video support (future creative) | No | DIY | DIY/separate product | Built-in transcoding |
| Direct-from-mobile upload (skip proxying through our API) | Possible but manual | Possible via presigned URLs | Possible via presigned URLs | First-class signed/unsigned upload presets, official RN patterns |
| Maturity for this exact job | General-purpose blob store | Industry-standard, but DIY for transforms | Growing, cheap at scale, less proven for image transforms specifically | Purpose-built media CDN, most mature docs/RN SDK |

**Why not Vercel Blob** despite it being already available: it can't enforce "exactly 1200×600" itself — that guarantee would live entirely in the mobile client's crop step, meaning a future web composer, a bug, or a direct API call could ship a wrong-sized/unoptimized image with nothing stopping it server-side. It also has no path into "resize this campaign creative into several placement sizes automatically" without building that transform layer ourselves later.

**Why not S3 or Cloudflare R2 as the primary pick:** both are excellent, cheap raw storage, but neither gives transforms without pairing a second service (Lambda+Sharp for S3, Cloudflare Images for R2) — more moving parts than justified on day one with zero traffic history to know if the cost delta will ever matter.

**Recommendation: Cloudinary.** The only option that (a) guarantees the 1200×600 output at the CDN layer via URL parameters — not just "trust the client," (b) has first-class React Native upload support (signed upload presets, so the mobile app can upload directly to Cloudinary instead of proxying large files through our own API), and (c) already covers video transcoding if fleet campaign creatives ever include video. Tradeoff: a genuinely new vendor account/API keys, and it's not the cheapest at very high volume — but at this stage, correctness and reuse matter more than shaving storage cost, and the free tier comfortably covers this for a long while. If volume ever justifies it, migrating to Cloudflare R2+Images later is a storage-layer swap, not a rewrite of every consumer, since everything downstream just deals in URLs.

**What's needed from the user to proceed with Cloudinary:** a Cloudinary account, its `cloud_name`, API key/secret, and an upload preset — account/billing decision is the user's to make.

---

## Part 3 — Implementation plan (pending provider confirmation)

1. **Generic upload endpoint**, not announcement-specific, so it's reusable for fleet campaign creatives: `POST /v1/media/upload` in `apps/api`, taking a `purpose` field (`"announcement-image"` today, `"campaign-creative"` later) mapping to a per-purpose dimension/size profile server-side. Enforces 1200×600 (`c_fill` crop) for announcements via Cloudinary transform params — no separate resize code to maintain.
2. **Schema**: add `image_url` to `AnnouncementBroadcast` via a new additive SQL script (`apps/web/prisma/scripts/announcements-image-additive.sql`) following the exact convention above. Not to be run automatically — hand off the script + command to the user, same as the existing `db:announcements-soft-delete` pattern.
3. **Push payload**: `richContent.image` on the Expo push message — Android shows it in the banner automatically; **iOS silently ignores it and falls back to text-only** (per explicit decision to skip the native Notification Service Extension work for now — see below).
4. **ops-mobile composer**: rebuilt as a bespoke screen (not the generic `EntityFormScreen` used by Leads/Fleet/Drivers) — image picker → client-side preview/crop to a 2:1 frame → direct upload to Cloudinary using a signed preset fetched from our API → `image_url` submitted with the rest of the form.
5. **customer-mobile**: `NotificationRow` gets an image slot; the public announcements feed route adds `image_url` to its Prisma `select`.
6. Ops web dashboard composer stays out of scope unless requested — shares the same underlying schema, so adding it later is additive.

### iOS rich push — explicitly deferred

iOS rich-banner images require a native Notification Service Extension. Expo's core team explicitly declined to ship this as a built-in feature (confirmed via their GitHub PR discussion, expo/expo#36202 — they use a third-party build-time codegen tool, `@bacons/apple-targets`, requiring manual Swift code, and closed the PR without merging, citing complexity). This can only be verified by an actual EAS Build + real device/TestFlight test, which cannot be done from this environment. **Decision: skip for now.** Android gets the rich image in its push banner automatically (no native work needed); both platforms show the image in the in-app notification list. Revisit the iOS extension as a separate follow-up once real-device testing is available.

### Partial edits already made, not yet consistent

Two files have incomplete edits from before this plan was written — they reference `image_url`/`richContent` ahead of the schema actually having that field, so they do not currently compile cleanly:
- `apps/api/lib/push/expo-push.ts` — added `richContent?: { image: string }` to `ExpoPushPayload`.
- `apps/api/lib/push/broadcast-customers.ts` — added `image_url` to the Prisma create call and conditional `richContent` on the push message.

Nothing has been run or deployed. These will be finished once the storage provider is confirmed and the schema field lands.

---

## Open decision

Proceed with **Cloudinary** per the plan above, or default to shipping with **Vercel Blob** today (zero new accounts, no server-guaranteed dimensions) and revisit Cloudinary as a follow-up once an account is set up?
