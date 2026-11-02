# Admobi — Feature & Architecture Inventory

A reproducible, engineer-facing reference for everything the monorepo actually contains: every route/screen per app, every third-party integration wired in, the data model, and the architectural decisions behind them — with file citations throughout. Built so a second engineer can independently re-derive the LOC figures and effort estimate in [AUDIT-VALUATION.md](./AUDIT-VALUATION.md) rather than take them on faith.

Compiled by direct repository inspection on 2026-08-27; living-doc corrections 2026-08-29; LOC and surface counts re-derived 2026-08-30, and again on **2026-10-26** against `d56bb92b`, which is the commit all five Vercel projects were serving in production that day. The October pass covers campaigns end to end, advertiser organizations, driver SOS, generated documents, and the 2026-10-18 security hardening. It also corrects screens previously listed as real that render `placeholder-data` fixtures. All paths are relative to the repo root.

---

## 0. How to reproduce the LOC numbers

```bash
git ls-files                      # 2,107 tracked files, 455,837 lines total (2026-10-26)
```

What remains isn't all code — see [AUDIT-VALUATION.md §1](./AUDIT-VALUATION.md#1-architectural-overview--lines-of-code) for the exclusions (`package-lock.json`, `.agents/`/`.claude/` skill markdown, docs, the generated `apps/web/public/app-demo/` Expo export). After excluding those, plus native `android/`/`ios/` Expo build directories, `node_modules`, tests, `.d.ts`, Payload-generated types/import maps, and migrations, real hand-written TS/TSX/JS across `apps/*`, `packages/*`, `scripts/`, and repo-root tooling totals **127,299 lines** (2026-10-26).

Calibration: the same script run against the 2026-08-30 commit (`30297000`) returns 95,094, about 1% under the 96,053 recorded then. Treat **~+32K lines (+34%) since 30 Aug** as the reliable delta. Any recount should exclude the same categories to land on a comparable number.

---

## 1. Feature inventory — routes, pages, and screens by app

Enumerated from `app/**/page.tsx` and `app/**/route.ts(x)` (Next.js apps) or Expo Router's `app/**/*.tsx` excluding `_layout`, `+html`, and `+not-found` (mobile apps). Each screen is classified as one of:

- **Real**: wired to the API.
- **Sample data**: the UI is complete but renders `lib/placeholder-data` fixtures, usually because payments or vehicle telemetry don't exist yet.
- **Placeholder**: a generic "coming soon" component.

This distinction matters for anyone re-deriving engineering hours per app.

### 1.1 `apps/web` — marketing site + Payload CMS

19 pages, 2 API routes, 5 CMS collections.

| Route | Purpose |
|---|---|
| `/` | Homepage — hero with roof-screen video, services section, markets, get-started panel, JSON-LD schema |
| `/products-solutions` | Product/solutions page — scroll-morph hero, taxi-top LED panel demo |
| `/drivers` | Driver recruitment page + FAQ schema |
| `/partner-fleet` | Fleet-partner recruitment + lead form |
| `/product-demo` | Interactive in-browser phone-mockup demo |
| `/start-campaign` | Campaign lead-capture form → `/v1/public/leads` (Turnstile-verified) |
| `/media-kit` | Media kit request form → `/v1/public/media-kit` |
| `/pricing` | Pricing page with live campaign cost simulator |
| `/blog`, `/blog/[slug]` | Blog index + post (Payload-backed, ISR `revalidate=86400` + on-demand tags) |
| `/help`, `/help/[slug]`, `/help/faq` | Searchable knowledge base, article view, FAQ page (Payload-backed, same ISR) — see [HELP-CMS.md](../web/HELP-CMS.md) |
| `/help/contact` | Contact-support form (creates a support case) |
| `/design-system` | Internal token/component reference (noindex) |
| `/privacy`, `/terms` | Legal pages |
| `/admin/[[...segments]]` | Payload CMS admin UI mount |
| `/sentry-example-page` | Dev-only Sentry test page |
| `(payload)/api/[...slug]` | Payload REST API catch-all |
| `/api/sentry-example` | Dev-only Sentry exception test endpoint |

Form submissions end on a shared "what happens next" confirmation (`SubmissionSuccess`) that sets a 3–7 working-day expectation.

Collections (`apps/web/collections/`, Postgres schema `cms`): **BlogPosts**, **HelpArticles**, **HelpCategories** (draft/publish; hooks call `revalidateTag` + `revalidatePath`), **Users** (Payload's own admin auth, unrelated to Clerk), **Media** (Vercel Blob-backed uploads with generated thumbnail/card/hero sizes).

### 1.2 `apps/api` — business API (route handlers only, no UI)

**110 route handlers** under `/v1/` (107 `route.ts` + 3 `route.tsx` PDF renderers). The generated list is on the API landing page; [API.md](../api/API.md) is the reference. Grouped by resource:

| Resource | Routes | Notes |
|---|---|---|
| Health / misc | `health`, `me`, `stats`, `audit`, `flags`, `users` | `users` is admin-only (security audit M4) |
| CRM | `leads`, `fleet`, `drivers`, `waitlist`, `media-kit` × (list, `[id]`, `bulk`) + `public/{leads,drivers,waitlist,media-kit}` | Full CRUD + public intake; leads/drivers intake verifies Cloudflare Turnstile |
| Campaigns (ops) | `campaigns`, `[id]`, `[id]/review`, `[id]/creatives/[creativeId]/file` | Review queue: approve / request changes / reject / unapprove |
| Campaigns (advertiser) | `customer/campaigns`, `[id]`, `[id]/submit`, `[id]/creatives(+[creativeId], +file)`, `[id]/proof-of-play`, `statement` | Org-scoped; `proof-of-play` and `statement` render PDFs |
| Advertiser org (advertiser) | `customer/org`, `members(+[id])`, `roles(+[roleId])`, `invitations/[invitationId]`, `invitations/accept/[token]`, `invitations/decline/[token]`, `admin-requests(+[id])`, `transfer-ownership`, `leave`, `delete-organization`, `deletion-status`, `activity` | 15 routes, each permission-gated; invite/member routes rate-limited |
| Advertiser orgs (ops) | `advertiser-orgs`, `[id]` | Ops directory + detail |
| Driver applications | `driver-applications`, `[id]`, `[id]/review`, `[id]/documents/[docId]/file` | Onboarding review pipeline, decision emails |
| Driver self-service | `driver/profile(+submit)`, `driver/documents(+[id], +file)` | Profile + Cloudinary document upload |
| Driver SOS | `driver/sos`, `[id]`, `[id]/location`, `[id]/messages`, `[id]/photos` | Report, foreground location re-ping, thread, photo evidence |
| Safety incidents (ops) | `safety-incidents`, `[id]`, `[id]/messages`, `[id]/photos/[photoId]/file` | Triage queue — see [SAFETY-SOS.md](./SAFETY-SOS.md) |
| Documents | `ops/documents/export` | PDF of any ops list (rows posted in) |
| Support | `support`, `[id]`, `[id]/messages`, `public/support(+[id], +messages)` | Ops inbox + token-authenticated public case access |
| Announcements / inboxes | `notifications(+[id])`, `broadcast`, `broadcast-image`, `public/announcements`, `customer/{announcements, mobile-announcements, notifications}`, `driver/{announcements, mobile-announcements, notifications}` (each with `[id]`/`read` variants) | Templated broadcast compose (`{{first_name}}`, `{{org_name}}`) + per-surface, cursor-paginated inboxes |
| Push tokens/receipts | `push-tokens`, `public/push-tokens`, `public/driver-push-tokens`, `push-receipts/check` | Expo token registration + cron-gated receipt reconciliation |
| Team / roles (ops) | `team`, `team/[userId]`, `team/invitations/[invitationId]`, `roles`, `roles/[roleId]` | Clerk-backed staff management, custom RBAC |
| Public config | `public/config` | Unauthenticated flag poll; 5 min in-memory + `s-maxage=300`; rate-limit only on cache miss |

### 1.3 `apps/ops` — internal operations console

**35 pages.** Sign-in/sign-up (Clerk), then a dashboard shell: Home, Overview (stats + quick links), Map (simulated demo fleet with H3 markets — see [OPS-ADMIN.md](../ops/OPS-ADMIN.md#network-map-demo-fleet)), Leads, Fleet, Drivers, Waitlist, Media Kit, Driver Applications (+ detail/review), **Campaigns** (+ detail/review), **Advertiser orgs** (+ detail), **SOS** (+ incident), Announcements, Support (+ thread detail), Finances, Activity (audit feed), Content (links to Payload admin), Team, Team Roles, Users (+ Customers, Admins), Settings (+ Flags, **Integrations** ledger, Tour).

**Notifications** is a permission-filtered "attention queue" that aggregates open review work (submitted driver applications, live support cases) and new public-form submissions client-side from existing ops-API endpoints, with a per-browser "triaged" flag. The header bell shares it, and it is not linked in the sidebar.

Status: 34 real, 1 **sample data** (Finances — payout/transfer actions open "coming soon" dialogs). List pages export selected rows as CSV, XLSX, or PDF.

Per the team's own docs, this app is **UI-only by design** for business CRUD; every entity action calls `apps/api`. The exceptions are server-rendered stats (read-only Prisma) and the admin-only integrations ledger (Prisma server actions).

### 1.4 `apps/customer-web` — advertiser web console

**27 pages + 3 routes** (`/api/health`, `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`).

| Route | Status |
|---|---|
| `/`, `/map` | **Real** — overview with live campaign data; Map uses `@workspace/geo` |
| `/campaigns`, `/campaigns/[id]`, `/campaigns/new` | **Real** — list/detail + full-page create/edit wizard against `/v1/customer/campaigns`; creative upload (PNG/JPG/GIF/MP4) via Cloudinary private proxy; budget statement + proof-of-play PDFs |
| `/calendar` | **Real** — FullCalendar; drag a window to pre-fill a new campaign; drag only while editable |
| `/notifications` | **Real** — merged announcements + campaign lifecycle inbox; header bell shares it |
| `/settings/team`, `/settings/team/roles`, `/settings/activity`, `/invitations/[token]` | **Real** — org members, roles, org-scoped activity log, invitation accept/decline with explicit consent |
| `/settings`, `/settings/account`, `/settings/notifications` (preferences), `/settings/tour` | **Real** |
| `/settings/support`, `/settings/support/new`, `/settings/support/[id]` | **Real** — support case list + new + thread |
| `/auth/login`, `/auth/login/advertiser`, `/auth/signup`, `/auth/signup/advertiser`, `/auth/sso-callback/advertiser` | Clerk auth flow (own instance), company name captured at sign-up |
| `/deliveries`, `/deliveries/[id]` | **Feature-flag gated** — redirects to `/` unless the `deliveries` platform flag is on; booking and messaging are "coming soon" |
| `/settings/billing` | **Sample data** — wallet UI renders fixtures; no payment provider yet (Pesapal planned) |
| `/reports` | **Placeholder** — generic `ComingSoon` |

Totals: 23 real, 2 flag-gated, 2 sample data or placeholder. `/notifications` is reachable but deliberately not a sidebar link; `/calendar` is in the sidebar. Org permission handling in the UI is described in [APP.md](../customer/APP.md).

### 1.5 `apps/driver-web` — driver web console

**18 pages + `/api/health`.** Everything in the `(gated)` route group shows a "complete your profile" panel until ops approves the driver; settings sit outside the gate.

| Route | Status |
|---|---|
| `/sos`, `/sos/[id]` | **Real** — report an incident (type, photos, location), then live tracking + thread while open |
| `/notifications` | **Real** — merges application-lifecycle events (`DriverNotification`) and announcements into one cursor-paginated feed; header bell shares it. Not a sidebar link |
| `/settings`, `/settings/profile`, `/settings/account`, `/settings/preferences`, `/settings/tour` | **Real** — profile setup and document upload live here |
| `/settings/support`, `/settings/support/[id]` | **Real** |
| `/auth/login`, `/auth/signup`, `/auth/sso-callback` | Clerk auth flow (own instance) |
| `/` (dashboard), `/earnings`, `/routes` | **Sample data** — fixture earnings and route history (needs telemetry) |
| `/deliveries` | **Feature-flag gated** — sample jobs, "Accept" disabled |
| `/payouts` | **Placeholder** — `ComingSoon`, "ops settles earnings manually" |

Totals: 13 real, 1 flag-gated, 4 sample data or placeholder.

### 1.6 Mobile apps (Expo Router, file-based)

**`apps/ops-mobile`** — 48 screens. Full CRUD (list/detail/new/edit) for Leads, Fleet, Drivers, Waitlist, Media Kit on the shared `EntityList`/`EntityDetail`/`EntityFormRoute` pattern; Support; Team + Roles (+ new/detail); Driver Applications review; Announcements compose (image upload via `expo-image-picker`); **Campaigns** review; **Advertiser orgs** (+ detail); **SOS** (+ incident); Activity, Content, Map, Dashboard, Profile, Notifications; onboarding replay; a non-staff stub that catches customer accounts. Finances is **sample data**. See [MOBILE-OPS.md](../ops/MOBILE-OPS.md).

**`apps/customer-mobile`** — 20 screens. Home (live data), Map, Campaigns (list/calendar toggle with pull-to-refresh, detail, full-screen wizard + creative upload), merged Notifications inbox with push deep links, Settings hub (account, team, roles, activity, notifications, support list/new/detail, web-app handoff), invitation acceptance, Clerk auth. Billing is **sample data**. See [APP-MOBILE.md](../customer/APP-MOBILE.md).

**`apps/driver-mobile`** — 18 screens. A 4-step Profile Setup wizard (profile + ID upload → tax/payout details + document upload → review/submit), Settings, Support (list/new/detail), Notifications inbox, **SOS** (report + incident, with 120s foreground location re-ping via `expo-location`), Clerk auth. Home, Earnings, Routes are **sample data**; Deliveries is **flag-gated** sample jobs; **Payouts** is a placeholder. See [DRIVER-APP.md](../driver/DRIVER-APP.md).

### Surface totals

| App | Routes/pages/screens | Real / gated / sample or placeholder |
|---|---:|---|
| `apps/web` | 19 pages + 2 API + 5 collections | All real |
| `apps/api` | 110 route handlers | All real |
| `apps/ops` | 35 pages | 34 real, 1 sample |
| `apps/customer-web` | 27 pages + 3 routes | 23 real, 2 flag-gated, 2 sample/placeholder |
| `apps/driver-web` | 18 pages + 1 route | 13 real, 1 flag-gated, 4 sample/placeholder |
| `apps/ops-mobile` | 48 screens | 47 real, 1 sample |
| `apps/customer-mobile` | 20 screens | 19 real, 1 sample |
| `apps/driver-mobile` | 18 screens | 13 real, 1 flag-gated, 4 sample/placeholder |
| **Total** | **~301 distinct surfaces** | 13 sample/placeholder, 4 flag-gated |

The 2026-08-30 edition counted ops-mobile screens including `_layout` files (56) and listed several fixture-backed driver and wallet screens as real. The figures above use the stricter method throughout.

---

## 2. Integrations inventory

Every third-party service actually wired into the code — confirmed by reading the integration point, not just a package.json mention. Where noted, production enablement was checked against the `admobi-api` Vercel project's environment variables on 2026-10-26.

### Cloudinary — private media (driver documents, campaign creatives, SOS photos)

`apps/api/lib/storage/private-media.ts` wraps the `cloudinary` v2 SDK for **authenticated** (private) assets — images and video. Three thin wrappers sit on it: `lib/driver/driver-document-storage.ts` (image-only), `lib/campaigns/campaign-creative-storage.ts` (PNG/JPG/GIF/MP4), and `lib/safety/incident-photo-storage.ts`. Bytes reach clients only through authenticated `/file` proxy routes. Callers: `apps/api/app/v1/driver/documents/*`, `driver-applications/*`, `customer/campaigns/*/creatives/*`, `campaigns/*/creatives/*/file`, `driver/sos/[id]/photos`, `safety-incidents/*/photos/*/file`.

*Announcement images shipped on Vercel Blob as [ANNOUNCEMENT-IMAGES-PLAN.md](../web/ANNOUNCEMENT-IMAGES-PLAN.md) proposed. Cloudinary was added for private documents and later extended to campaign creatives and incident photos.*

### Clerk — three independent instances

No shared session between instances; no satellite domains.

| Instance | Web provider | Mobile provider | Restriction |
|---|---|---|---|
| Ops | `apps/ops/app/layout.tsx` (`ClerkProvider`, `@clerk/nextjs`) | `apps/ops-mobile/app/_layout.tsx` (`@clerk/clerk-expo`) | `@admobihq.com` email domain only |
| Customer | `apps/customer-web/app/layout.tsx` | `apps/customer-mobile/app/_layout.tsx` | None — email + Google |
| Driver | `apps/driver-web/app/layout.tsx` | `apps/driver-mobile/app/_layout.tsx` | None — email + Google |

`apps/api/middleware.ts` runs `clerkMiddleware()` for CORS/session cookies on ops-origin calls; it does **not** verify customer or driver tokens. Those use dedicated modules: `apps/api/lib/auth.ts` (ops), `lib/customer/customer-auth.ts`, and `lib/driver/driver-auth.ts`. `apps/api/lib/support/support.ts` tries the customer Clerk secret, then the driver Clerk secret, to disambiguate a bearer token when the calling surface isn't otherwise known.

Clerk proves identity only. Authorization lives in Postgres: `OpsRole` for staff, and `AdvertiserOrg`/`AdvertiserRole`/`AdvertiserMember` for advertisers, resolved with a permission cache in `customer-auth.ts`. See [AUTH.md](./AUTH.md).

### Resend — transactional email

`apps/api/lib/email/` — two send paths: `resend.ts` (SDK, React-rendered templates) and `send-email.ts` (raw `fetch` direct to the Resend API). **Twelve React templates:**

- admin alert
- advertiser org invite
- campaign confirmation, campaign submitted, campaign decision
- driver application submitted, driver application decision
- driver confirmation
- fleet partner confirmation
- safety incident alert
- support case confirmation, support case reply

Transactional mail sends from `mail.admobihq.com`, and marketing broadcasts from `news.admobihq.com`. Email is backend-only: no web or mobile app calls Resend directly.

### Cloudflare Turnstile — bot check

`apps/api/lib/turnstile.ts` verifies the widget token server-side. `public/leads` and `public/drivers` return 403 without a valid token. `public/support` still creates the case, because the mobile apps can't run Turnstile, but only sends the confirmation email when the token verified. **Live in production:** `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are set.

### Upstash Redis — rate limiting

`apps/api/lib/rate-limit.ts` — sliding-window limiter via `@upstash/ratelimit` + `@upstash/redis`, keyed by client IP. **Fails open** (unthrottled, not a 500) when the Upstash env vars are unset. It protects every `apps/api/app/v1/public/*` route, plus advertiser invitation acceptance and member management. **Live in production:** Upstash credentials are set.

### PDF and spreadsheet generation

`takumi-pdf` renders React templates server-side in `apps/api/lib/pdf/`: shared `document-shell`, `data-table`, and `summary-list` primitives, an embedded logo, and page numbers. There are two templates. `EntityExportPdf` serves ops list exports. `CampaignStatementPdf` serves the advertiser budget statement and proof-of-play. Proof-of-play deliberately reports the **booked schedule**, not measured plays, because no telemetry exists yet. `exceljs` builds styled XLSX exports in the browser in `apps/ops` (`lib/xlsx.ts`).

### Vercel Blob — two unrelated uses

1. **Payload CMS media** (`apps/web/collections/Media.ts`) — blog/help-article images via `@payloadcms/storage-vercel-blob`, conditional on `BLOB_READ_WRITE_TOKEN`. `addRandomSuffix` was removed in October because it made every resized size 404.
2. **Announcement images** (`apps/api/app/v1/notifications/broadcast-image/route.ts`) — direct `@vercel/blob` `put()`, 5MB cap, jpeg/png/webp only, `access: "public"`. The URL surfaces in Android push notifications (`richContent.image` in `apps/api/lib/push/expo-push.ts`). iOS falls back to text-only because there is no Notification Service Extension yet.

### Payload CMS

`payload` and `@payloadcms/*` are on 3.91.0, aligned on one version (security audit M5). The CMS serves the marketing site only: blog, help center, media, and its own `Users`/auth collection, entirely separate from Clerk. Tables live in the `cms` Postgres schema (`schemaName: "cms"` in `apps/web/payload.config.ts`). The config throws on any Vercel deploy without `PAYLOAD_SECRET`. See [DATA-LAYER.md](./DATA-LAYER.md).

### MapLibre + H3 — coverage, route, and market maps

`packages/ui/src/components/map.tsx` wraps `maplibre-gl` (web), exporting `Map`, `MapMarker`, `MapControls`, `MapRoute`, `MapGeoJSON` (choropleth), and `MapArc`, plus a shared `MapCanvas` loading skeleton. Geometry comes from `packages/geo`:

- `nairobi.ts`: commute corridors, commented "not survey-grade".
- `markets.ts`: the six campaign markets (CBD, Westlands, Karen, Kilimani, Mombasa Rd, Eastlands) as `h3-js` resolution-8 cell sets, with `marketAt()` point lookup and outlines.

The ops Map runs a **simulated** demo fleet over these layers. Mobile apps render the same maps inside a WebView. This is a visualization layer, **not** a live GPS-tracking or dispatch engine.

### Device location — SOS only

`expo-location` (driver-mobile) and browser geolocation (driver-web) capture a position when an incident is reported, then re-ping every 120s, in the foreground only, while it is open (`apps/driver-mobile/lib/use-incident-ping.ts`). Only the latest position is stored (`SafetyIncident.last_lat/lng/last_location_at`), with no history table. The server refuses pings on closed incidents and on incidents older than 6h (`pingAdmission` in `apps/api/lib/safety/safety-incident.ts`). This is the only live-location path in the system.

### Calendar — FullCalendar

`@fullcalendar` powers the customer-web campaign planner (`components/calendar/campaign-calendar-view.tsx`). customer-mobile has its own native calendar view.

### Push notifications — Expo push service (raw HTTP, not the Expo Server SDK)

`apps/api/lib/push/expo-push.ts` POSTs directly to `https://exp.host/--/api/v2/push/send` and `/getReceipts`, chunked at 100/1000 messages respectively; dead tokens (`DeviceNotRegistered`, `InvalidCredentials`) are marked for cleanup.

Data model:

- `OpsPushToken`, `CustomerPushToken`, `DriverPushToken`: one token table per Clerk instance.
- `PushTicket`: the per-message send record.
- `AnnouncementBroadcast` and `AnnouncementDelivery`: the broadcast and its per-recipient deliveries.
- `CustomerNotification` and `DriverNotification`: per-user lifecycle inboxes.

Send paths:

- Broadcasts support merge tags (`lib/push/announcement-template.ts`).
- `notifyUserPush` (`lib/push/user-push.ts`) sends targeted single-user push, used for campaign decisions and submit confirmations.
- `notifyOpsStaffAlert` fans alerts out to ops staff. SOS uses a MAX-importance Android channel.

A daily cron (`apps/api/vercel.json`, `0 3 * * *`) hits `/v1/push-receipts/check` to reconcile delivery receipts. It accepts either a `CRON_SECRET` bearer token or an authenticated ops session.

### Sentry — error tracking + performance monitoring

Shared via `packages/sentry-config` (`@sentry/nextjs` for web, api, ops, customer-web, driver-web; `@sentry/react-native` for all three Expo apps — the current native SDK, not the deprecated `sentry-expo`). Authorization failures log `[authz] 403 forbidden` from the guard wrappers.

### Pesapal — chosen, not integrated

Pesapal API 3.0 is the planned collections provider: M-Pesa, Airtel Money, and cards through one hosted checkout with IPN confirmation. See [ROADMAP.md](./ROADMAP.md). Billing-detail fields already exist on `AdvertiserOrg` for it to consume, but **no Pesapal API calls exist in the code yet**.

### n8n — self-hosted automation (parked)

`n8n-project/` holds a Docker Compose + Caddy VPS deployment. Its tables moved to their own `n8n` Postgres schema in September. The image is pinned and port 5678 is bound to loopback. Per security audit C3, it gets its own database or a schema-limited role before it is redeployed.

### Feature flags

`PlatformFlag` model — public/unauthenticated to *read* (flags are visibility toggles, never secrets), Clerk ops JWT required to *write*. Currently one flag in production use: `deliveries`. Ops toggles it from `apps/ops/app/(dashboard)/settings/(prefs)/flags/page.tsx`. Every client fetches `/v1/public/config` with a 5-minute Next.js cache (`revalidate: 300`) and fails closed to an empty flag set on any error ("flags are additive UI, never load-bearing" — `apps/driver-web/lib/flags.ts`). The API also keeps an in-memory 5-minute cache and sets `s-maxage=300`, so CDN/edge can serve repeats without waking Neon. This is the mechanism behind the ~5-minute, no-redeploy propagation documented in DEPLOYMENT.md.

### Support case identity system

Anonymous, email-based access without requiring sign-in. A random 24-byte token is generated per case, only its SHA-256 hash is persisted (`apps/api/lib/support/support-token.ts`), and the raw token is returned once to the submitter. A separate `SupportIdentity` table mints one token per email address, so a user can look up all their cases without re-authenticating per case. The email-token path lists anonymous cases only (audit M1). Signed-in callers resolve identity through Clerk bearer tokens instead. Advertiser invitation tokens reuse the same generate-and-hash helpers (`lib/advertiser/advertiser-invite-token.ts`).

### Audit trail — never blocks the write it's auditing

`apps/api/lib/audit.ts` — `recordAuditEvent()` is the single write path, wrapped in try/catch with only a `console.error` on failure and no rethrow. Its doc comment reads "Never throws — failures are logged only". Typed wrappers (`auditFromOpsUser`, `auditFromDriverUser`, `auditPublic`) get this guarantee for free. Advertiser and ops-reviewed campaign events are stamped with `org_id`, which powers the org-scoped activity log.

### Stack versions confirmed

TanStack Query v5, react-hook-form v7 + `@hookform/resolvers` (Zod bridge), Zod 4 (set via root `package.json` overrides), Prisma Client 7 (`@prisma/adapter-pg` driver-adapter mode — no bundled query-engine binary), Next.js 16.

---

## 3. Data model

| | Prisma (business data) | Payload (editorial CMS) |
|---|---|---|
| Schema location | `apps/web/prisma/schema.prisma` → Postgres schema `public` | `apps/web/collections/` → Postgres schema `cms` |
| Model/collection count | **34 models** | **5 collections** |
| CRM & intake | `Lead`, `FleetPartner`, `Driver`, `WaitlistEntry`, `MediaKitRequest`, `Customer` | `BlogPosts`, `HelpArticles`, `HelpCategories`, `Media`, `Users` |
| Campaigns | `Campaign`, `CampaignCreative` | |
| Advertiser orgs | `AdvertiserOrg`, `AdvertiserRole`, `AdvertiserMember`, `AdvertiserInvitation`, `AdvertiserAdminRequest` | |
| Drivers | `DriverProfile`, `DriverDocument`, `DriverNotification` | |
| Safety | `SafetyIncident`, `SafetyIncidentPhoto`, `SafetyIncidentUpdate` | |
| Messaging | `OpsPushToken`, `CustomerPushToken`, `DriverPushToken`, `AnnouncementBroadcast`, `AnnouncementDelivery`, `PushTicket`, `CustomerNotification` | |
| Support | `SupportCase`, `SupportIdentity`, `SupportMessage` | |
| Platform | `PlatformFlag`, `OpsRole`, `OpsRoleAssignment`, `AuditEvent`, `Integration` | |
| Consumed by | `apps/api` (all business routes), `apps/ops` (server-rendered stats, integrations ledger) | `apps/web` server components only |
| Migration discipline | One Neon instance, three Postgres schemas: `public` (Prisma), `cms` (Payload), `n8n`. See [DATA-LAYER.md](./DATA-LAYER.md) and the full schema reference in [DATABASE.md](./DATABASE.md). |

`@workspace/ops-contracts` mirrors this domain in Zod schemas/DTOs, consumed both client-side (`react-hook-form` + `@hookform/resolvers/zod`) and server-side in `apps/api` route handlers, so one schema is validated identically on both ends. It also holds:

- domain enums: campaign and safety statuses, the 9 advertiser permissions, and starter roles;
- `exportFileName()`, which slugifies export filenames;
- `safeRedirectPath()`;
- the demo-ad catalogue shared by the ops map and the marketing site.

---

## 4. Architectural decisions worth flagging to a reviewer

- **Five independent Vercel projects, not one multi-tenant router.** `admobihq.com` (`admobi-hq-web`), `api.admobihq.com` (`admobi-api`), `ops.admobihq.com` (`admobi-ops`), `app.admobihq.com` (`admobi-app`), and `driver.admobihq.com` (`admobi-driver`) are separate Vercel projects sharing one GitHub repo, each with its own root directory, domain, and env vars. There are five request hooks repo-wide:
  - `apps/web/middleware.ts`: an Edge 404 for scanner/probe paths;
  - `apps/api`, `apps/customer-web`, and `apps/driver-web` `middleware.ts`: CORS/session;
  - `apps/ops/proxy.ts`: the Next 16 name for middleware.

  None does cross-app hostname routing. All five `vercel.json` files set `ignoreCommand` (`scripts/vercel-ignore-build.mjs`) so untouched apps skip rebuilds. The API also defines the daily cron. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).
- **Deploy ordering is a real operational constraint.** `NEXT_PUBLIC_API_URL` is inlined at build time, so the API must deploy before any frontend redeploys after an API URL change.
- **API bundles stay lean.** `apps/api/lib/load-env.ts` must not build a path into `apps/web`. Next's file tracer would otherwise ship the whole web app inside every API function, a regression fixed on 2026-10-25.
- **Authorization lives in Postgres, not Clerk.** Ops uses `OpsRole`. Advertisers get editable per-org roles with a privilege ceiling (`canGrantRole()`). Swapping identity providers would not touch tenancy.
- **Telemetry is the deliberate missing layer.** The following are all designed around a vehicle-telemetry pipeline that doesn't exist yet:
  - proof-of-play (schedule-only by design);
  - driver earnings, routes, and payouts (sample data);
  - campaign Reports (placeholder);
  - the ops map (simulated).
- **Location is minimized on purpose.** SOS location is foreground-only, latest position only, and cut off server-side. This avoids the background-location store-review burden and Neon compute cost.
- **Rate limiting fails open.** Missing Upstash credentials silently disable throttling rather than erroring. That is correct for local dev, and a real production risk if forgotten during a Vercel env migration. It is configured in production today.
- **Security posture is documented.** [SECURITY.md](./SECURITY.md) covers the trust model and controls, and [SECURITY-AUDIT-2026-10-18.md](./SECURITY-AUDIT-2026-10-18.md) tracks findings to remediation. Still open:
  - ops Clerk MFA (a dashboard setting);
  - Payload roles;
  - SecureStore for mobile support tokens;
  - CODEOWNERS;
  - alerting on `[authz]` 403s.
- **`packages/mobile-ui` has no tracked files.** The directory name remains, but nine packages carry code. The three Expo apps style themselves independently.
- **Tests: 43 files**, up from 6 on 2026-08-30. Coverage concentrates on domain logic: `packages/ops-contracts` (9 files), advertiser org/RBAC, the campaign lifecycle, PDF templates and primitives, push, safety, storage, `packages/geo`, and repo scripts, plus one Playwright marketing smoke spec. UI component coverage remains the gap. See [AUDIT-VALUATION.md §4](./AUDIT-VALUATION.md#4-devops-deployment--production-hygiene).
- **CI builds and gates; it does not deploy.** The Vercel deploy step in `master.yml` is written but commented out, so production deploys ride on Vercel's Git integration. Signed Android release APKs are built by tag-triggered workflows (`android-release-{ops,customer,driver}-mobile.yml`), and JS-only fixes ship as EAS OTA updates. See [MOBILE-BUILDS.md](./MOBILE-BUILDS.md).

---

## 5. How this maps to the valuation

[AUDIT-VALUATION.md](./AUDIT-VALUATION.md) derives its hours estimate from the 96,053-line total recorded on 2026-08-30, at a stated blended throughput of 15 lines/hour. Re-run against today's 127,299 lines (§0), the same method adds roughly **32K lines, or about 2,150 hours at the same rate**. That growth is concentrated in campaigns, advertiser organizations/RBAC, SOS, and generated documents.

To re-derive independently:

1. Take the per-app LOC breakdown in [AUDIT-VALUATION.md §1](./AUDIT-VALUATION.md#1-architectural-overview--lines-of-code), or re-run the `git ls-files` methodology yourself.
2. Apply your own hourly rate and throughput assumption.
3. Layer in the two percentage premiums and two flat capitalizations from the ledger.

The real / sample / placeholder status in §1 should drive any per-app weighting. The 13 sample-data or placeholder screens are finished UI over fixture data. Price them as UI work only, because the payment and telemetry systems behind them are unbuilt.

---

## 6. Competitive comparison — vs. a third-party vendor quote

A third-party agency quoted a phased build of a comparable taxi-top/OOH advertising platform (verbatim quote received 2026-08-25). Each line is checked against this repository's actual code, not the marketing pitch, and was re-checked on 2026-10-26.

### Phase 1 — Professional Online Presence (quoted KES 80,000–180,000)

| Ask | Admobi status |
|---|---|
| Home, services, contact, enquiry form | ✅ Built — `apps/web` homepage with services section, `/products-solutions`, `/help/contact`, plus 4 lead-capture forms (campaign, drivers, fleet, media-kit) |
| Booking request form (manual) | ✅ Exceeded — forms persist to Postgres via Prisma and trigger Resend confirmation emails |
| WhatsApp chat | ✅ Built — sitewide floating button (`apps/web/components/landing/whatsapp-fab.tsx`) |
| Basic client login | ✅✅ Far exceeded — 3 independent Clerk instances plus multi-user advertiser organizations |
| About page, portfolio/gallery | ❌ **Missing** — no `/about` or gallery/portfolio route in `apps/web/app/` |
| Google Maps office location | ❌ **Missing** — MapLibre coverage/market maps exist, but no "here's our office" pin |
| M-Pesa payment integration | ❌ **Missing** — Pesapal chosen and billing fields modeled on `AdvertiserOrg`, but no payment API call anywhere. "M-Pesa" otherwise appears only as a driver payout-method label and in sample wallet fixtures |

### Phase 2 — Online Booking System (quoted KES 150,000–300,000)

| Ask | Admobi status |
|---|---|
| Client registration, dashboard | ✅✅ Far exceeded — organizations with teams, roles, invitations, and activity log on web + mobile |
| Campaign status tracking | ✅ Built — `draft → submitted → approved` plus `changes_requested`, `rejected`, `cancelled`; derived flight phase (scheduled/live/completed); email + in-app + push notifications |
| Online booking | ✅ Built — full-page wizard with creative upload on customer-web + customer-mobile; ops review on web + mobile |
| Campaign calendar | ✅ Built — FullCalendar on web (drag to pre-fill a booking), calendar view on mobile |
| Invoice generation | ⚠️ Partial — campaign budget statement PDF (`customer/campaigns/statement`); not a numbered tax invoice |
| Payment confirmation | ❌ **Missing** — blocked on the payment gateway |

### Phase 3 — Live Tracking (quoted KES 300,000–700,000)

| Ask | Admobi status |
|---|---|
| Client notifications | ✅✅ Far exceeded — Expo push, per-user and per-surface inboxes, templated broadcasts with images, receipt reconciliation cron |
| Route history | ⚠️ Partial — driver route-history map screens exist on web and mobile but render fixtures (earlier editions said "Built") |
| Analytics dashboard | ⚠️ Partial — ops stats/overview with charts and a live advertiser overview; customer Reports page is still a placeholder |
| Live campaign map | ⚠️ Partial — interactive coverage and H3 market maps; the ops fleet view is simulated |
| GPS tracking (live) | ⚠️ Partial — live driver location during open SOS incidents only; no fleet-wide vehicle tracking |
| Proof of campaign delivery | ⚠️ Partial — proof-of-play PDF of the booked schedule; no measured plays or photo verification |

### Verdict

The quote describes a single brochure website with a manual booking process that eventually bolts on GPS, priced at **KES 530,000–1,180,000** across all three phases. Since that quote, Admobi has closed most of its Phase 2 (self-serve booking, review, calendar, statements) and has partial answers to two Phase 3 items. Admobi is an 8-application platform:

- 3 independently authenticated tenant surfaces, with multi-user advertiser organizations;
- 34 business models;
- EAS-built native apps for three actor types;
- push, audit, and safety infrastructure;
- a shared design system and API contract layer.

It is not the same tier of product, and the [reconstructive-cost valuation](./AUDIT-VALUATION.md) reflects that gap.

Three gaps remain, ranked:

1. **No payment collection.** Booking now works end to end and stops exactly at payment, so Pesapal is the shortest path to revenue.
2. **No vehicle telemetry.** SOS proves the location plumbing works, but there is no fleet tracking and no measured plays. Proof-of-play, driver earnings, routes, and payouts all wait on this.
3. **A few Phase-1 marketing-site basics are missing outright:** the About page, a gallery/portfolio, and an office-location map. These are the cheapest items on either list to close.

---

## 7. Software engineering fundamentals implemented

Distinct from §2 (which catalogs *third-party services*), this section catalogs the standard computer-science and platform-engineering *patterns* that every production SaaS needs regardless of vendor, and confirms which of them Admobi has actually implemented, with citations.

### 7.1 Identity, access control & tenancy

| Pattern | Implementation | Where |
|---|---|---|
| **Authentication** | Clerk, 3 fully independent tenant instances (ops, customer, driver) — no shared session, no satellite domains; JWT bearer tokens verified server-side | `apps/api/lib/auth.ts`, `lib/customer/customer-auth.ts`, `lib/driver/driver-auth.ts` |
| **Ops RBAC** | Resource-scoped `requireOpsPermissionAccess("<resource>")` gates every ops route individually, backed by `OpsRole` + `OpsRoleAssignment` | `apps/api/lib/api-utils.ts:68`, `apps/api/lib/auth.ts` |
| **Multi-tenant RBAC** | 9 advertiser permissions (`campaigns:read/write`, `creatives:write`, `reports:read`, `billing:read/write`, `team:manage`, `org:manage`, `activity:read`), editable roles per org, `Admin`/`Member` starter roles, checked by `requireCustomerPermissionAccess()` | `apps/api/lib/api-utils.ts:116`, `packages/ops-contracts/src/enums.ts` |
| **Tenant isolation (IDOR)** | Every advertiser read/write is scoped to the caller's `orgId`. Customer-facing PDFs query their own rows rather than accepting posted data | `apps/api/lib/campaigns/campaign-store.ts` (`getOwnedCampaign`, `listOwnedCampaigns`) |
| **Privilege ceiling** | `canGrantRole()` blocks granting more than you hold, changing your own role, and approving your own admin request. Admin promotion is owner-only | `apps/api/lib/advertiser/advertiser-org.ts:22` |
| **Consent-based invitations** | Hashed single-use invite tokens with explicit accept/decline; acceptance rate-limited | `apps/api/lib/advertiser/advertiser-invite-token.ts` |
| **Capability-based access (no login required)** | Support-case possession tokens; only the SHA-256 hash is persisted | `apps/api/lib/support/support-token.ts`, `apps/api/lib/support/support.ts` |
| **Timing-safe secret comparison** | Cron-secret and support-token checks use constant-time comparison | `apps/api/app/v1/push-receipts/check/route.ts`, `apps/api/lib/support/support.ts` |
| **CORS control** | Centralized origin allow-listing driven by an env var | `apps/api/lib/cors.ts`, `API_CORS_ORIGINS` |

### 7.2 Data & API reliability patterns

| Pattern | Implementation | Where |
|---|---|---|
| **Boundary schema validation** | Zod schemas validate the same shape on client and server | `packages/ops-contracts/src/` |
| **Soft deletion** | `deleted_at DateTime?` on 6 models (Lead, FleetPartner, Driver, WaitlistEntry, MediaKitRequest, AnnouncementBroadcast); organization deletion has its own status flow | `apps/web/prisma/schema.prisma`, `v1/customer/org/deletion-status` |
| **Pagination** | Offset `page`/`pageSize` on back-office lists (default 20); cursor `?cursor=` + `next_cursor` on notification inboxes | `apps/api/app/v1/leads/route.ts:18`; `apps/api/lib/push/announcement-inbox.ts` |
| **Idempotent writes** | Waitlist signup upserts by email | `apps/api/app/v1/public/waitlist/route.ts` |
| **State-machine guards** | Campaign transitions enforced server-side (409 on submit/review from the wrong state; proof-of-play refused until approved and scheduled) | `v1/customer/campaigns/[id]/submit`, `v1/campaigns/[id]/review`, `.../proof-of-play` |
| **Audit logging** | Single non-blocking write path, org-stamped for advertiser actions | `apps/api/lib/audit.ts:29` |
| **Rate limiting** | Sliding-window limiter by client IP on every public route, invitation acceptance, and member management; fails open when unconfigured | `apps/api/lib/rate-limit.ts` |
| **Feature flagging** | `PlatformFlag` — public read, Clerk-gated write, 5-minute fetch + CDN cache, fails closed | `apps/web/prisma/schema.prisma`, `apps/driver-web/lib/flags.ts`, `apps/api/app/v1/public/config/route.ts` |

### 7.3 Messaging, documents & storage

| Pattern | Implementation | Where |
|---|---|---|
| **Transactional email** | 12 React templates, two send paths (SDK + raw HTTP), split sending domains | `apps/api/lib/email/` |
| **Push fan-out + delivery tracking** | Chunked Expo sends, per-recipient delivery rows, per-message tickets, merge-tag templates, targeted single-user push, daily receipt reconciliation that prunes dead tokens | `apps/api/lib/push/`, `apps/api/vercel.json` |
| **Server-side document generation** | React-to-PDF with shared primitives; browser-side styled XLSX; filenames slugified so user input can't break out of `Content-Disposition` | `apps/api/lib/pdf/`, `apps/ops/lib/xlsx.ts`, `exportFileName()` |
| **Object storage with signed/authenticated URLs** | One private-media module serves driver documents, campaign creatives, and incident photos through API-streamed signed reads; less-sensitive assets (CMS media, announcement images) use public Vercel Blob URLs — a deliberate two-tier trust split | `apps/api/lib/storage/private-media.ts` vs. `apps/api/app/v1/notifications/broadcast-image/route.ts` |

### 7.4 Security, platform & operational hygiene

| Pattern | Implementation | Where |
|---|---|---|
| **Browser hardening** | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` on all five Next apps; `poweredByHeader: false` | `apps/*/next.config.mjs` |
| **Bot verification** | Cloudflare Turnstile verified server-side on public lead/driver/support intake | `apps/api/lib/turnstile.ts` |
| **Open-redirect protection** | `safeRedirectPath()` on post-auth redirects (with tests) | `packages/ops-contracts/src/safe-redirect.ts` |
| **Privacy-minimized location** | Foreground-only, latest-position-only, server-side admission cutoff | `apps/api/lib/safety/safety-incident.ts:49` |
| **Security review** | Source review of every API route, SAST greps, `npm audit`, full git-history secret scan, passive production probes; findings tracked to remediation | `docs/shared/SECURITY-AUDIT-2026-10-18.md` |
| **Multi-layer caching** | Marketing ISR (`revalidate: 86400` plus on-demand `revalidateTag` on CMS publish), request-time fetch caching (`revalidate: 300` on the flag poll, matching API `s-maxage=300`), client-side query caching (TanStack Query); support polling and CMS drafts tuned so Neon compute can sleep | `apps/web/lib/seo/isr.ts`, `apps/driver-web/lib/flags.ts`, `packages/query-client/src/client.ts` |
| **Stale-deploy recovery** | customer-web reloads once per tab when a deploy rotates the chunks an open tab references | `apps/customer-web/lib/stale-deploy-reload.ts` — see [APP.md](../customer/APP.md) |
| **Health checks** | Liveness endpoint per backend surface, used in deploy smoke tests | `apps/api/app/v1/health/route.ts`, `/api/health` on customer-web/driver-web |
| **Scheduled jobs** | One production cron (Vercel Cron, daily) reconciling push delivery receipts | `apps/api/vercel.json` |
| **Observability** | Sentry on all 8 apps via one shared config package; `[authz] 403` logging from guard wrappers | `packages/sentry-config/` |
| **Centralized secrets management** | Infisical, 3 environments (dev/staging/prod) × 8 apps, pulled to `.env.local` per app | `docs/shared/DEPLOYMENT.md` §Infisical environments |
| **CI gating + supply chain** | Every PR runs install → `prisma generate` → typecheck → lint → build → unit tests → Playwright e2e; third-party actions SHA-pinned; Dependabot | `.github/workflows/pr.yml`, `.github/workflows/master.yml` |
| **Schema discipline** | One Neon instance split into `public` / `cms` / `n8n` schemas | `docs/shared/DATA-LAYER.md` |
| **Automated testing** | 43 test files — domain logic and contracts well covered, UI thin | See §4 |

None of this list is unusual for a mature product — that's the point of including it. What's notable for a system at this stage is the *count* of patterns implemented consistently across 8 apps by one small team. By 2026-08-30 that already meant RBAC, soft-delete, idempotency, audit logging, rate limiting, feature flags, signed-URL storage, and multi-layer caching. By 2026-10-26 it also meant multi-tenant authorization, tenant isolation, privilege ceilings, bot checks, browser hardening, and a documented security audit. That is infrastructure many funded startups still lack a year into building, and not scaffolding a vendor quote like §6's would include at any phase.
