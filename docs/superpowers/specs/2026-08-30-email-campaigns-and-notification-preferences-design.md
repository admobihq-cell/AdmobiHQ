# Email Campaigns & Notification Preferences — Design

**Date:** 2026-08-30
**Status:** Draft for review
**Author:** Victor Musembi (with Claude)

## Summary

Two connected capabilities:

1. **Ops email campaigns** — draft an email in the ops console and send it to a
   real audience (advertisers, drivers, fleet partners, leads/waitlist) drawn
   from the database and Clerk, with audience filters, a branded rich-text
   body, test sends, per-recipient delivery tracking, and legal unsubscribe
   handling.
2. **Self-serve notification preferences** — advertisers and drivers get a
   Notifications tab where they opt in/out of optional email categories.
   Categories the platform needs to operate the account are shown but locked.

The same suppression check wraps **every** outbound email (campaign and
transactional), so a preference set in the tab or via an unsubscribe link is
honoured everywhere. Required categories are never suppressible, so transactional
mail is unaffected.

## Context / current state

- **Email:** Resend, single sender `Admobi <noreply@admobihq.com>` (overridable
  via `SENDER_EMAIL`). Helpers in `apps/api/lib/email/` — `send-email.ts`
  (HTML string) and `resend.ts` (React Email). Branded layout in
  `templates/shared/EmailLayout.tsx` + `email-theme.ts`. Existing transactional
  templates: driver application decisions, campaign confirmation, support, admin
  alerts.
- **Announcements:** `AnnouncementBroadcast` + `AnnouncementDelivery` models.
  Ops composes at `apps/ops/app/(dashboard)/announcements/`; `broadcast-announcement.ts`
  fans out to Expo push + writes in-app inbox rows for customer/driver × web/mobile.
  **No email channel today.**
- **Identity:** three separate Clerk instances — ops (`CLERK_SECRET_KEY`),
  customer/advertiser (`CUSTOMER_CLERK_SECRET_KEY`), driver (`DRIVER_CLERK_SECRET_KEY`),
  with admin clients in `lib/customer-clerk.ts` / `lib/driver-clerk.ts`.
  `resolveFirstNames(audience, ids)` in `lib/push/recipient-names.ts` does a
  batched (100/req) Clerk lookup — the pattern to extend for emails.
- **Where recipient emails live:**
  | Audience | Email source | Login? |
  |---|---|---|
  | Advertiser | `Customer.email` (always present; `clerk_user_id` nullable — dormant auth) | Yes (customer Clerk) |
  | Driver | **Driver Clerk instance only** — `DriverProfile` has no email column; join on `DriverProfile.clerk_user_id` | Yes (driver Clerk) |
  | Fleet partner | `FleetPartner.email` | No |
  | Lead | `Lead.email` | No |
  | Waitlist | `WaitlistEntry.email` (`@unique`) | No |
- **Preferences tab:** `apps/customer-web/components/settings/notifications-settings-view.tsx`
  exists but is a hardcoded, disabled "Illustrative" placeholder. Driver-web has
  no equivalent.
- **Ops RBAC:** `OPS_PERMISSIONS` in `packages/ops-contracts/src/enums.ts`;
  `requireOpsPermission("<perm>")` in `apps/api/lib/auth.ts`. Audit via
  `auditFromOpsUser` / `recordAuditEvent`.
- **Prisma schema:** `apps/web/prisma/schema.prisma`, snake_case columns,
  explicit `@@map`, integer autoincrement PKs.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Separate "Email campaigns" ops surface**, not an email channel bolted onto the announcement composer. | Marketing email has its own lifecycle (draft → test → send), its own audiences and filters, its own compliance surface. Announcements stay push/in-app. |
| D2 | **Audiences + simple filters** for v1. | Whole-audience sends plus a small fixed set of filters per audience. No arbitrary segment builder. |
| D3 | **Multiple real From-addresses by email type**, on a **dedicated bulk subdomain** `mail.admobihq.com` (`marketing@`, `updates@`). Transactional stays on `noreply@admobihq.com`. | Real distinct senders as requested; subdomain isolation protects transactional deliverability from bulk-send reputation. **Fallback if the subdomain is not wanted:** `marketing@admobihq.com` / `updates@admobihq.com` on the root domain. |
| D4 | **Email-only preferences**, split required vs optional per audience. Required render locked with a "Required" badge. | Matches the ask; keeps the surface small. Push/in-app per-category toggles are out of scope. |
| D5 | **One email-keyed `EmailPreference` table** (Approach A) — single enforcement path for logged-in and anonymous recipients; cross-audience dedupe. | Alternative per-audience tables (B) duplicate enforcement logic and miss dedupe; Clerk `privateMetadata` (C) can't be filtered in bulk and doesn't cover fleet/leads. |
| D6 | **Rich-text body in the existing branded layout.** Ops writes subject + preheader + formatted body (headings, bold, links, one image, one button) → sanitized HTML → dropped into `EmailLayout`. Merge field `{{first_name}}`. | Fast to build, hard to break, on-brand. Block/HTML-paste composers deferred. |
| D7 | **Unsubscribe link + `List-Unsubscribe` / `List-Unsubscribe-Post` headers** on every non-required email, resolving to a tokenised no-login page. | Required for bulk sending to real inboxes and Gmail/Yahoo one-click-unsubscribe rules. |
| D8 | **Synchronous batched send** from one API route (Resend batch endpoint, 100/call, `maxDuration = 300`). | Audience is hundreds now. Queue/cron drain is documented as the upgrade path, not built. |
| D9 | **New `email_campaigns` ops permission**, separate from `announcements`. | Cleaner RBAC + audit separation; sending real external mail is a distinct trust boundary. |
| D10 | All four audiences (advertiser, driver, fleet_partner, lead/waitlist) are targetable. Only advertiser + driver get a self-serve preferences tab; the rest are managed by unsubscribe link only. | Fleet/leads have no login surface. |
| D11 | **Open/click/bounce tracking** via a Resend webhook, shown in the campaign detail view. `complained` / hard `bounced` auto-suppress all mail for that address. | Requested; also protects sender reputation. |

### Open items to confirm before implementation

- **D3:** subdomain `mail.admobihq.com` vs root-domain addresses.
- **Category taxonomy (§4):** confirm the required/optional split per audience
  matches how the product actually communicates.
- **Leads/waitlist consent:** sending marketing to `Lead` / `WaitlistEntry`
  addresses assumes their signup covers marketing contact. Confirm the signup
  copy/terms support this, or restrict lead sends to transactional-style
  "announcements" only.

## Architecture

### 1. Data model — new Prisma models (`apps/web/prisma/schema.prisma`)

```prisma
/// One row per email address. Absence of a row = subscribed to every optional
/// category for that audience. Required categories are never represented here.
model EmailPreference {
  id                     Int      @id @default(autoincrement())
  email                  String   @unique          // normalized lower-case
  audience               String                     // advertiser | driver | fleet_partner | lead
  clerk_user_id          String?                    // set for advertiser/driver when known
  unsubscribed_all       Boolean  @default(false)   // hard opt-out (manual, complaint, or bounce)
  unsubscribed_categories String[] @default([])     // optional-category keys turned off
  suppression_reason     String?                    // manual | unsubscribe | complaint | bounce
  created_at             DateTime @default(now())
  updated_at             DateTime @updatedAt

  @@index([audience])
  @@index([clerk_user_id])
  @@map("email_preferences")
}

model EmailCampaign {
  id               Int       @id @default(autoincrement())
  subject          String
  preheader        String?
  body_html        String                            // sanitized, pre-merge
  body_json        Json?                              // editor document, for re-editing
  email_type       String                            // marketing | update | announcement
  category         String                            // one optional category (see taxonomy)
  audience         String                            // advertiser | driver | fleet_partner | lead
  filters          Json      @default("{}")
  status           String    @default("draft")       // draft | sending | sent | failed
  recipient_count  Int       @default(0)
  sent_count       Int       @default(0)
  skipped_count    Int       @default(0)
  failed_count     Int       @default(0)
  created_by_email String
  sent_at          DateTime?
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt

  recipients EmailCampaignRecipient[]

  @@index([status, created_at])
  @@map("email_campaigns")
}

model EmailCampaignRecipient {
  id            Int           @id @default(autoincrement())
  campaign_id   Int
  campaign      EmailCampaign @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  email         String
  name          String?
  clerk_user_id String?
  status        String        @default("pending")    // pending | sent | skipped_suppressed | failed
  resend_id     String?       @unique
  error         String?
  delivered_at  DateTime?
  opened_at     DateTime?
  clicked_at    DateTime?
  bounced_at    DateTime?
  complained_at DateTime?
  created_at    DateTime      @default(now())

  @@index([campaign_id, status])
  @@map("email_campaign_recipients")
}
```

Migration is additive only — no changes to existing tables.

### 2. Category taxonomy (`packages/ops-contracts/src/`)

New `enums.ts` exports plus a helper describing each category (key, label,
description, `required: boolean`, audiences it applies to).

| Audience | Required (locked on) | Optional (opt-out-able) |
|---|---|---|
| `advertiser` | `account_security`, `billing`, `campaign_status` | `product_updates`, `weekly_digest`, `promotions` |
| `driver` | `account_security`, `application_status`, `payout` | `product_updates`, `promotions`, `tips_news` |
| `fleet_partner` | *(none)* | `partner_updates`, `promotions` |
| `lead` | *(none)* | `announcements`, `promotions` |

- A campaign carries exactly one `category`; the composer only offers optional
  categories valid for the chosen `audience`.
- Existing transactional templates are tagged with their required category at
  their call sites (e.g. driver decision email → `application_status`). The
  suppression wrapper (§3) then covers them too, but since required categories
  can't be in `unsubscribed_categories`, behaviour is unchanged.
- `email_type` → From address:
  `marketing` → `Admobi Marketing <marketing@mail.admobihq.com>`,
  `update` / `announcement` → `Admobi Updates <updates@mail.admobihq.com>`.
  Transactional keeps `Admobi <noreply@admobihq.com>`.

### 3. Suppression wrapper (`apps/api/lib/email/`)

- `config.ts` gains `getSenderEmail(emailType?: "transactional" | "marketing" | "update")`.
- New `suppression.ts`:
  - `normalizeEmail(email): string`
  - `filterSuppressed(recipients, category): { deliverable, skipped }` — one
    `EmailPreference.findMany({ where: { email: { in: [...] } } })`, drop rows
    where `unsubscribed_all` or `category ∈ unsubscribed_categories`. Required
    categories short-circuit to "all deliverable".
  - `isSuppressed(email, category): Promise<boolean>` — single-recipient path
    for transactional sends.
- `send-email.ts` / `resend.ts` gain an optional
  `unsubscribe?: { email: string; category: string }` param. When present:
  - append the unsubscribe footer to the rendered HTML,
  - set headers `List-Unsubscribe: <https://api…/v1/email/unsubscribe?token=…>, <mailto:unsubscribe@admobihq.com>`
    and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
  - Resend's `send`/`batch` payload supports a `headers` map.

### 4. Recipient resolution (`apps/api/lib/email/campaigns/resolve-recipients.ts`)

`resolveRecipients(audience, filters): Promise<{ email: string; name?: string; clerkUserId?: string }[]>`

| Audience | Source | Filters (v1) |
|---|---|---|
| `advertiser` | `prisma.customer.findMany` | `hasAccount` (`clerk_user_id != null`), `createdWithinDays` |
| `driver` | `prisma.driverProfile.findMany` → batched **driver-Clerk** email + name lookup (new `resolveContacts("driver", ids)` alongside `resolveFirstNames`) | `status` (`approved` / `submitted` / …), `city`, `createdWithinDays` |
| `fleet_partner` | `prisma.fleetPartner.findMany` | `status` (`pending`/`verified`/`active`), `city` |
| `lead` | `prisma.lead.findMany` + `prisma.waitlistEntry.findMany` | `status`, `budget_range`, `source`; exclude `deleted_at != null` |

- All queries exclude soft-deleted rows.
- Normalize + dedupe by email across the result (a lead who later became an
  advertiser is contacted once).
- `resolveContacts` never throws — a Clerk hiccup drops that recipient rather
  than failing the campaign (same contract as `resolveFirstNames`).

### 5. Send engine (`apps/api/lib/email/campaigns/send-campaign.ts`)

```
sendCampaign(campaignId, { test?: boolean, opsEmail?: string })
  1. load campaign; guard status ∈ {draft, failed}
  2. if test → recipients = [opsEmail], skip suppression, skip recipient rows
  3. else:
       resolveRecipients(audience, filters)
       insert EmailCampaignRecipient rows (status pending)
       set campaign.status = sending, recipient_count
  4. for each batch of 100:
       { deliverable, skipped } = filterSuppressed(batch, category)
       mark skipped rows status = skipped_suppressed
       render EmailLayout with per-recipient {{first_name}} + unsubscribe URL
       resend.batch.send([...])  // from = getSenderEmail(email_type), headers per recipient
       write resend_id + status = sent / failed per row
  5. set campaign counts + status (sent, or failed if 0 sent and >0 attempted)
  6. audit event (email_campaigns / send)
```

- Route: `apps/api/app/v1/email-campaigns/[id]/send/route.ts`,
  `requireOpsPermission("email_campaigns")`, `export const maxDuration = 300`.
  `?test=1` for the test send.
- Merge-field rendering reuses the strip/clean logic already in
  `broadcast-announcement.ts` `renderTemplate` (extract it to a shared util
  `apps/api/lib/email/merge-fields.ts` and have both callers use it).
- Rate limiting: Resend batch is one call per 100; if a batch 429s, back off
  and retry that batch up to 3× before marking the batch failed.

### 6. Unsubscribe (`apps/api/app/v1/email/unsubscribe/`)

- Token = `base64url(email) + "." + HMAC_SHA256(email, UNSUBSCRIBE_SECRET)`.
  Stateless, no expiry (unsubscribe links must keep working).
- `POST /v1/email/unsubscribe?token=…` (one-click): verify token → upsert
  `EmailPreference` for that email, add the campaign's category to
  `unsubscribed_categories` (or `unsubscribed_all` if the link says so) → `200`.
- `GET /v1/email/unsubscribe?token=…` → minimal no-login HTML page (served from
  the API route or a `apps/web` route) listing that audience's optional
  categories as toggles + a "unsubscribe from everything" option. Saves via the
  same POST.
- New env: `UNSUBSCRIBE_SECRET`.

### 7. Resend webhook (`apps/api/app/v1/webhooks/resend/route.ts`)

- Verify signature with `RESEND_WEBHOOK_SECRET` (Svix-style headers).
- Map `email.delivered | opened | clicked | bounced | complained` by
  `resend_id` → `EmailCampaignRecipient`, set the matching timestamp.
- On `complained` or `bounced` with `type = "hard"`: upsert `EmailPreference`
  with `unsubscribed_all = true`, `suppression_reason = complaint | bounce`.
- New env: `RESEND_WEBHOOK_SECRET`. Configure the endpoint in the Resend
  dashboard.

### 8. Ops UI (`apps/ops/app/(dashboard)/email-campaigns/`)

- `page.tsx` — list: subject, audience, email type, status, sent/skipped/failed
  counts, sent date. Uses the existing `DataTable` + `PageHero` patterns.
- Compose (dialog or `/email-campaigns/new`):
  1. Audience select → reveals that audience's filter controls.
  2. Email type (`marketing` / `update`) + category (filtered to the audience's
     optional categories).
  3. Subject + preheader.
  4. Rich-text body — introduce a lightweight editor (e.g. Tiptap) producing
     sanitized HTML; toolbar: bold, italic, link, H2, bullet list, one image
     upload (reuse the announcement image pipeline), one button (label + URL).
     Merge-field insert for `{{first_name}}` with a preview swap.
  5. Live preview rendered through `EmailLayout`.
  6. Resolved recipient count (calls a `POST /v1/email-campaigns/preview-count`).
  7. "Send test to me" / "Send campaign" (confirm dialog with the count).
- Detail view: campaign meta + per-recipient table (email, status, delivered/
  opened/clicked/bounced) with status filters.
- Contracts + client: `packages/ops-contracts` (schemas, enums, form fields) and
  `packages/ops-api-client`.
- Nav entry in `apps/ops/components/ops-shell.tsx`, gated on `email_campaigns`.

### 9. Self-serve preference tabs

- **API:**
  - `GET/PUT apps/api/app/v1/customer/notification-preferences/route.ts`
    (customer Clerk auth) — resolve the signed-in user's primary email from
    Clerk, return `{ categories: [{ key, label, description, required, enabled }] }`,
    PUT upserts `EmailPreference` (`clerk_user_id` + `email` both stored).
  - `GET/PUT apps/api/app/v1/driver/notification-preferences/route.ts`
    (driver Clerk auth) — same, driver taxonomy.
  - Email-change reconciliation: on GET, if the Clerk primary email differs from
    the stored `EmailPreference.email` for that `clerk_user_id`, migrate the row
    to the new email (keep the opt-outs).
- **customer-web:** replace the placeholder body of
  `notifications-settings-view.tsx` with a client component that loads from the
  API, renders `SettingsToggleRow` per category, required rows `disabled` with a
  "Required" badge + tooltip ("Needed to run your account and campaigns"),
  optional rows toggle + PUT on change (optimistic). Remove the "Illustrative"
  badge.
- **driver-web:** add `app/(shell)/settings/(prefs)/notifications/page.tsx` +
  a `notifications-settings-view.tsx` mirroring customer-web, wired to the driver
  API and driver `driver-notifications-client` conventions. Add the nav/tab
  entry alongside the existing preferences tab.

### 10. Environment / infra prerequisites

- Resend: verify `mail.admobihq.com` (SPF/DKIM/DMARC), confirm `marketing@` and
  `updates@` senders. Enable open + click tracking on the sending domain.
  Add a webhook to `…/v1/webhooks/resend`.
- New env vars (all apps' `.env` + Vercel): `UNSUBSCRIBE_SECRET`,
  `RESEND_WEBHOOK_SECRET`, optional `MARKETING_SENDER_EMAIL` /
  `UPDATES_SENDER_EMAIL` overrides.
- `packages/ops-contracts` `OPS_PERMISSIONS` gains `email_campaigns`; seed it
  onto the `org:admin` implicit set and expose it in the roles editor.

## Error handling

- **Recipient resolution partial failure:** Clerk batch failure drops those
  recipients (logged), campaign still sends to the rest. Campaign notes the
  shortfall in an `error` summary field if `resolved < expected`.
- **Send route timeout risk:** batches are sequential; ~hundreds of recipients
  ≈ a few batches, well under 300s. If the audience grows past ~5k the route
  should move to a queue/cron drain (documented, not built) — add a hard guard
  that refuses a synchronous send above e.g. 5,000 recipients with a clear error.
- **Resend batch error:** per-batch retry (3×, backoff) then mark that batch's
  rows `failed`; campaign completes as `sent` if any batch succeeded, `failed`
  if none did. Failed campaigns can be re-sent (only `pending`/`failed`
  recipient rows are retried).
- **Duplicate webhook events:** timestamp writes are idempotent (set-if-null).
- **Unsubscribe token tampering:** constant-time HMAC compare; invalid token →
  generic 400, no information leak.
- **Test send** never writes recipient rows, never touches suppression, always
  uses the real From address so the ops user sees the true rendering.

## Testing

- **Unit:**
  - `suppression.filterSuppressed` — required category bypass, `unsubscribed_all`,
    per-category opt-out, empty/absent rows, email normalization.
  - unsubscribe token round-trip + tamper rejection.
  - merge-field render (shared util) — name present/absent, orphaned comma
    cleanup (port existing `broadcast-announcement` cases).
  - `resolveRecipients` per audience with mocked Prisma + Clerk — filters,
    soft-delete exclusion, cross-audience dedupe.
- **Integration (API):**
  - `POST /v1/email-campaigns/[id]/send` with a mocked Resend — recipient rows
    created, suppressed rows skipped, counts correct, audit event written,
    permission enforced.
  - `POST /v1/email/unsubscribe` one-click → `EmailPreference` updated.
  - `POST /v1/webhooks/resend` — signature check, timestamp + auto-suppression.
  - `GET/PUT` preference routes for both audiences — auth, required-category
    rejection on PUT, email-change migration.
- **Contracts:** `packages/ops-contracts` schema tests for the campaign create
  schema and category/audience validity.
- **Manual smoke:** verify domain in Resend staging, send a test campaign to a
  personal inbox, confirm From address, unsubscribe footer, one-click header,
  and that the webhook flips `opened_at`.

## Build phases

1. **Foundation** — Prisma models + migration; category taxonomy in
   `ops-contracts`; `email_campaigns` permission; `suppression.ts` +
   `getSenderEmail(type)`; wrap existing transactional sends with the
   suppression check (no behaviour change).
2. **Send engine + ops UI** — `resolveRecipients` (advertiser + driver),
   `resolveContacts` Clerk helper, `send-campaign.ts`, send/preview-count
   routes, ops list + compose + detail UI, contracts + client.
3. **Compliance** — unsubscribe token, one-click POST, no-login GET page,
   footer + headers in `send-email`/`resend`.
4. **Self-serve tabs** — customer + driver preference APIs and UI; email-change
   reconciliation.
5. **More audiences** — `fleet_partner` and `lead`/`waitlist` in
   `resolveRecipients` + composer options; confirm lead consent first.
6. **Tracking** — Resend webhook, per-recipient status in the detail view,
   auto-suppression on bounce/complaint.

Each phase is independently shippable; phases 3 and 4 gate any real external
send to a non-test audience.

## Out of scope (v1)

- Block-based or raw-HTML email composer.
- Arbitrary segment builder / saved segments.
- Scheduled/recurring campaigns and automated drip sequences.
- A/B subject testing.
- Per-category push/in-app preference toggles.
- SMS / WhatsApp channels.
- Queue/cron drained sending (documented upgrade path; hard-guarded at 5k).
