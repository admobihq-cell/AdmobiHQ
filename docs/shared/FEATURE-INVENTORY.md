# Admobi — Feature & Architecture Inventory

A reproducible, engineer-facing reference for everything the monorepo actually contains: every route/screen per app, every third-party integration wired in, the data model, and the architectural decisions behind them — with file citations throughout. Built so a second engineer can independently re-derive the LOC figures and effort estimate in [AUDIT-VALUATION.md](./AUDIT-VALUATION.md) rather than take them on faith.

Compiled by direct repository inspection on 2026-08-27; living-doc corrections 2026-08-29. All paths are relative to the repo root.

---

## 0. How to reproduce the LOC numbers

```bash
git ls-files                      # 2,187 tracked files, 3,022,965 lines total
```

The headline 3.02M-line total is dominated by non-code artifacts — see [AUDIT-VALUATION.md §1](./AUDIT-VALUATION.md#1-architectural-overview--lines-of-code) for the full breakdown of what to exclude (`graphify-out/`, `.agents/`/`.claude/` tooling, `package-lock.json`). After excluding those, plus native `android/`/`ios/` Expo build directories, `node_modules`, and generated files, real hand-written TS/TSX/JS across `apps/*` and `packages/*` totals **94,424 lines**. Any recount should exclude the same categories to land on a comparable number; a rough eyeball pass that doesn't exclude native mobile directories will land closer to ~120K.

---

## 1. Feature inventory — routes, pages, and screens by app

Enumerated from `app/**/page.tsx` and `app/**/route.ts` (Next.js apps) or Expo Router's `app/**/*.tsx` (mobile apps). Real feature vs. unbuilt placeholder is called out explicitly wherever the page renders a generic "coming soon" component instead of working functionality — this distinction matters for anyone re-deriving engineering hours per app.

### 1.1 `apps/web` — marketing site + Payload CMS

18 pages, 2 API routes, 5 CMS collections.

| Route | Purpose |
|---|---|
| `/` | Homepage — landing page, JSON-LD schema |
| `/products-solutions` | Product/solutions marketing page |
| `/drivers` | Driver recruitment page + FAQ schema |
| `/partner-fleet` | Fleet-partner recruitment + lead form |
| `/product-demo` | Interactive in-browser phone-mockup demo |
| `/start-campaign` | Campaign lead-capture form → `/v1/public/leads` |
| `/media-kit` | Media kit request form → `/v1/public/media-kit` |
| `/pricing` | Pricing page with live campaign cost simulator |
| `/blog`, `/blog/[slug]` | Blog index + post (Payload-backed, ISR `revalidate=86400` + on-demand tags) |
| `/help`, `/help/[slug]` | Help center index + article (Payload-backed, same ISR) |
| `/help/contact` | Contact-support form (creates a support case) |
| `/design-system` | Internal token/component reference (noindex) |
| `/privacy`, `/terms` | Legal pages |
| `/admin/[[...segments]]` | Payload CMS admin UI mount |
| `/sentry-example-page` | Dev-only Sentry test page |
| `(payload)/api/[...slug]` | Payload REST API catch-all |
| `/api/sentry-example` | Dev-only Sentry exception test endpoint |

Collections (`apps/web/collections/`): **BlogPosts**, **HelpArticles**, **HelpCategories** (draft/publish; hooks call `revalidateTag` + `revalidatePath`), **Users** (Payload's own admin auth, unrelated to Clerk), **Media** (Vercel Blob-backed uploads with generated thumbnail/card/hero sizes).

### 1.2 `apps/api` — business API (route handlers only, no UI)

**65 route handlers** under `/v1/`, grouped by resource:

| Resource | Routes | Notes |
|---|---|---|
| Health / misc | `health`, `me`, `stats`, `audit`, `flags`, `users` | Liveness, current-user, dashboard stats, activity feed, feature flags, platform user search |
| Leads | `leads`, `leads/[id]`, `leads/bulk`, `public/leads` | Full CRUD + public unauthenticated intake |
| Fleet partners | `fleet`, `fleet/[id]`, `fleet/bulk` | Full CRUD |
| Drivers (ops record) | `drivers`, `drivers/[id]`, `drivers/bulk`, `public/drivers` | Full CRUD + public intake |
| Driver applications | `driver-applications`, `[id]`, `[id]/review`, `[id]/documents/[docId]/file` | Onboarding review pipeline, decision emails |
| Driver self-service | `driver/profile`, `driver/profile/submit`, `driver/documents`, `driver/documents/[id]`, `driver/documents/[id]/file`, `driver/notifications`, `driver/notifications/read` | Driver-facing profile + Cloudinary document upload |
| Waitlist | `waitlist`, `[id]`, `bulk`, `public/waitlist` | Full CRUD + public signup (upsert by email) |
| Media kit | `media-kit`, `[id]`, `bulk`, `public/media-kit` | Full CRUD + public intake |
| Support | `support`, `[id]`, `[id]/messages`, `public/support`, `public/support/[id]`, `public/support/[id]/messages` | Ops inbox + token-authenticated public case access |
| Announcements/push | `notifications`, `[id]`, `broadcast`, `broadcast-image`, `public/announcements`, `customer/announcements(+read)`, `customer/mobile-announcements(+read)`, `driver/announcements(+read)`, `driver/mobile-announcements(+read)` | Broadcast compose + 4 separate per-surface inboxes |
| Push tokens/receipts | `push-tokens`, `public/push-tokens`, `public/driver-push-tokens`, `push-receipts/check` | Expo token registration + cron-gated receipt reconciliation |
| Team / roles | `team`, `team/[userId]`, `team/invitations/[invitationId]`, `roles`, `roles/[roleId]` | Clerk-backed staff management, custom RBAC |
| Public config | `public/config` | Unauthenticated flag poll; 5 min in-memory + `s-maxage=300`; rate-limit only on cache miss |

### 1.3 `apps/ops` — internal operations console

**27 pages.** Sign-in/sign-up (Clerk), then a dashboard shell: Home, Overview (stats + quick links), Map, Leads, Fleet, Drivers, Waitlist, Media Kit, Driver Applications (+ detail/review), Announcements, Support (+ thread detail), Finances, Activity (audit feed), Content (links to Payload admin), Team, Team Roles, Users → Customers, Users → Admins, Settings → Flags (feature-flag toggle UI), Settings → Tour (product-tour replay).

Per the team's own docs (§2 of AUDIT-VALUATION.md), this app is **UI-only by design** — it holds no data of its own; every CRUD action calls `apps/api`.

### 1.4 `apps/customer-web` — advertiser web console

**18 pages** — same auth patterns as driver-web. Campaign UIs are fixture-backed; Reports is the remaining Coming-soon page:

| Route | Status |
|---|---|
| `/`, `/campaigns`, `/campaigns/[id]`, `/map` | **UI real, fixture-backed** — overview and campaign list/detail/create use local demo data (`getCampaigns()`), not Prisma; Map uses `@workspace/geo` |
| `/deliveries`, `/deliveries/[id]` | **Real, feature-flag gated** — redirects to `/` unless the `deliveries` platform flag is on |
| `/reports` | **Placeholder** — generic `ComingSoon` component, not implemented |
| `/settings/billing` | **Real** — wallet/billing view |
| `/settings/support`, `/settings/support/[id]` | **Real** — support case list + thread |
| `/settings/account`, `/settings/notifications`, `/settings/tour` | **Real** |
| `/auth/login`, `/auth/login/advertiser`, `/auth/signup`, `/auth/signup/advertiser`, `/auth/sso-callback/advertiser` | Clerk auth flow (own instance) |

### 1.5 `apps/driver-web` — driver web console

**15 pages**, same shell pattern as customer-web:

| Route | Status |
|---|---|
| `/` (dashboard) | **Real** |
| `/deliveries` | **Real, feature-flag gated** |
| `/earnings`, `/routes` | **Real** |
| `/payouts` | **Placeholder** — `ComingSoon`, "ops settles earnings manually" |
| `/settings/profile`, `/settings/account`, `/settings/preferences`, `/settings/tour` | **Real** |
| `/settings/support`, `/settings/support/[id]` | **Real** |
| `/auth/login`, `/auth/signup`, `/auth/sso-callback` | Clerk auth flow (own instance) |

### 1.6 Mobile apps (Expo Router, file-based)

**`apps/ops-mobile`** — 56 screens. Auth (sign-in/sign-up), a non-staff-session stub, onboarding replay, then the ops tab set: Map, Notifications (diagnostics), Finances, Dashboard, Content, Profile, Activity, and full CRUD (list/detail/new/edit) for **Leads, Fleet, Drivers, Waitlist, Media Kit** — all sharing one `EntityList`/`EntityDetail`/`EntityFormRoute` pattern — plus Support inbox, Team + Roles management, Driver Applications review (with a document-viewer modal), and Announcements compose (image upload via `expo-image-picker`).

**`apps/customer-mobile`** — 20 screens. Home, Map, Campaigns (list/detail/new), Settings hub (account, billing, notifications, "open web app" handoff, support list/new/detail), Notifications inbox, Clerk auth.

**`apps/driver-mobile`** — 19 screens. Home, Deliveries (flag-gated, sample data), Earnings (placeholder stats), **Payouts (placeholder screen)**, Routes + map, Settings, Support (list/detail), a 4-step Profile Setup wizard (profile + ID upload → tax/payout details + document upload → review/submit), Notifications inbox, Clerk auth.

### Surface totals

| App | Routes/pages/screens | Real / gated / placeholder |
|---|---:|---|
| `apps/web` | 18 pages + 2 API + 5 collections | All real |
| `apps/api` | 65 route handlers | All real |
| `apps/ops` | 27 pages | All real (UI-only by design) |
| `apps/customer-web` | 18 pages | 15 real, 2 flag-gated, 1 placeholder |
| `apps/driver-web` | 15 pages | 12 real, 1 flag-gated, 1 placeholder |
| `apps/ops-mobile` | 56 screens | All real |
| `apps/customer-mobile` | 20 screens | All real |
| `apps/driver-mobile` | 19 screens | 17 real (1 flag-gated), 1 placeholder |
| **Total** | **~249 distinct surfaces** | |

---

## 2. Integrations inventory

Every third-party service actually wired into the code — confirmed by reading the integration point, not just a package.json mention.

### Cloudinary — driver document storage

`apps/api/lib/cloudinary.ts` wraps the `cloudinary` v2 SDK. Real usage is in `apps/api/lib/driver-document-storage.ts`: driver documents (National ID, profile photo, KRA PIN certificate, payout proof) upload with `type: "authenticated"` — signed-URL-only, never public — under `driver-documents/{profileId}/{type}/{uploadId}`. `fetchDriverDocument()` mints a signed, size-capped URL server-side and streams it through the API; the signed URL itself never reaches a client directly. Callers: `apps/api/app/v1/driver/documents/*`, `apps/api/app/v1/driver-applications/*`.

*Announcement images shipped on Vercel Blob as [ANNOUNCEMENT-IMAGES-PLAN.md](../web/ANNOUNCEMENT-IMAGES-PLAN.md) proposed. Cloudinary was added afterward, scoped to driver documents.*

### Clerk — three independent instances + one verification-only wiring

No shared session between instances; no satellite domains.

| Instance | Web provider | Mobile provider | Restriction |
|---|---|---|---|
| Ops | `apps/ops/app/layout.tsx` (`ClerkProvider`, `@clerk/nextjs`) | `apps/ops-mobile/app/_layout.tsx` (`@clerk/clerk-expo`) | `@admobihq.com` email domain only |
| Customer | `apps/customer-web/app/layout.tsx` | `apps/customer-mobile/app/_layout.tsx` | None — email + Google |
| Driver | `apps/driver-web/app/layout.tsx` | `apps/driver-mobile/app/_layout.tsx` | None — email + Google |

`apps/api/middleware.ts` runs `clerkMiddleware()` for CORS/session cookies on ops-origin calls; it does **not** verify customer or driver tokens. Those use dedicated modules: `apps/api/lib/auth.ts` (ops), `customer-auth.ts`, `driver-auth.ts`. `apps/api/lib/support.ts` tries the customer Clerk secret, then the driver Clerk secret, to disambiguate a bearer token when the calling surface isn't otherwise known. **Ops** and **ops-mobile** mount Clerk unconditionally. Customer and driver web/mobile mounts are conditional on `NEXT_PUBLIC_AUTH_ENABLED` / `EXPO_PUBLIC_AUTH_ENABLED`, defaulting off.

### Resend — transactional email

`apps/api/lib/email/` — two send paths: `resend.ts` (SDK, React-rendered templates) and `send-email.ts` (raw `fetch` direct to the Resend API, bypassing the SDK), plus `send-email-job.ts` (queued via a BullMQ-style job). Eight React templates: admin alert, campaign confirmation, driver application submitted/decision, driver confirmation, fleet partner confirmation, support case confirmation/reply. Backend-only — no direct Resend calls from any web/mobile app.

### Upstash Redis — rate limiting

`apps/api/lib/rate-limit.ts` — sliding-window limiter via `@upstash/ratelimit` + `@upstash/redis`, keyed by client IP. **Fails open** (unthrottled, not a 500) when the Upstash env vars are unset — safe to deploy without them, not safe to stay that way in production per the team's own comment. Protects every `apps/api/app/v1/public/*` route: support, driver push tokens, push tokens, drivers, announcements, config, waitlist, leads, media-kit.

### Vercel Blob — two unrelated uses

1. **Payload CMS media** (`apps/web/collections/Media.ts`) — blog/help-article images via `@payloadcms/storage-vercel-blob`, conditional on `BLOB_READ_WRITE_TOKEN`.
2. **Announcement images** (`apps/api/app/v1/notifications/broadcast-image/route.ts`) — direct `@vercel/blob` `put()`, 5MB cap, jpeg/png/webp only, `access: "public"`. The resulting URL rides on `AnnouncementBroadcast.image_url` / `AnnouncementDelivery.image_url` and surfaces in Android push notifications (`richContent.image` in `apps/api/lib/push/expo-push.ts` — iOS falls back to text-only; no Notification Service Extension yet).

### Payload CMS

`payload: ^3.85.0` in `apps/web/package.json`. Headless CMS for the marketing site only — blog, help center, media, own `Users`/auth collection, entirely separate from Clerk. See [DATA-LAYER.md](./DATA-LAYER.md) for the full Prisma/Payload split.

### MapLibre — coverage and route maps

`packages/ui/src/components/map.tsx` wraps `maplibre-gl` (web), exporting `Map`, `MapMarker`, `MapControls`, `MapRoute`, `MapGeoJSON` (choropleth), and `MapArc`. Data comes from `packages/geo/src/nairobi.ts` — named commute corridors (Mombasa Road, Waiyaki Way, etc.) explicitly commented as "not survey-grade," i.e. illustrative rather than live-GPS geometry. Mobile apps render the same maps inside a WebView-hosted HTML/JS build, since `maplibre-gl` itself is web-only. Used across `ops`, `customer-web`, `driver-web` dashboards and all three mobile apps' route/map screens — a stylized coverage/route visualization layer, **not** a live GPS-tracking or dispatch engine.

### Push notifications — Expo push service (raw HTTP, not the Expo Server SDK)

`apps/api/lib/push/expo-push.ts` POSTs directly to `https://exp.host/--/api/v2/push/send` and `/getReceipts`, chunked at 100/1000 messages respectively; dead tokens (`DeviceNotRegistered`, `InvalidCredentials`) are marked for cleanup. Data model: `OpsPushToken`, `CustomerPushToken`, `DriverPushToken` (one table per Clerk instance), `PushTicket` (per-message send record — "a ticket only means Expo queued the message"), `AnnouncementBroadcast` (the send job), `AnnouncementDelivery` (per-recipient inbox row). A daily cron (`apps/api/vercel.json`, `0 3 * * *`) hits `/v1/push-receipts/check`, gated by either a `CRON_SECRET` bearer token or an authenticated ops session, to reconcile delivery receipts.

### Sentry — error tracking + performance monitoring

Shared via `packages/sentry-config` (`@sentry/nextjs ^10.64.0` for web, api, ops, customer-web, driver-web; `@sentry/react-native ~7.2.0` for all three Expo apps — the current native SDK, not the deprecated `sentry-expo`).

### Feature flags

`PlatformFlag` model — public/unauthenticated to *read* (flags are visibility toggles, never secrets), Clerk ops JWT required to *write*. Currently one flag in production use: `deliveries`. Ops toggles it from `apps/ops/app/(dashboard)/settings/(prefs)/flags/page.tsx`; every client fetches `/v1/public/config` with a 5-minute Next.js cache (`revalidate: 300`), fails closed to an empty flag set on any error ("flags are additive UI, never load-bearing" — `apps/driver-web/lib/flags.ts`). The API also keeps an in-memory 5-minute cache and sets `s-maxage=300` so CDN/edge can serve repeats without waking Neon. This is the mechanism behind the ~5-minute, no-redeploy propagation documented in DEPLOYMENT.md.

### Support case identity system

Anonymous, email-based access without requiring sign-in: a random 24-byte token is generated per case, only its SHA-256 hash is ever persisted (`apps/api/lib/support-token.ts`), and the raw token is returned once to the submitter. A separate `SupportIdentity` table mints one token per email address (not per case) the first time that email opens any case, so a user can look up all their cases without re-authenticating per case. Authenticated callers (customer/driver web and mobile) instead resolve identity via Clerk bearer tokens, trying the customer secret then the driver secret to disambiguate origin app.

### Audit trail — never blocks the write it's auditing

`apps/api/lib/audit.ts` — `recordAuditEvent()` is the single write path, wrapped in try/catch with only a `console.error` on failure and no rethrow (the function's own doc comment: "Never throws — failures are logged only"). Three typed wrappers (`auditFromOpsUser`, `auditFromDriverUser`, `auditPublic`) get this guarantee for free without needing their own try/catch at each call site.

### Stack versions confirmed

TanStack Query v5 (`@tanstack/react-query ^5.101.4`), react-hook-form v7 + `@hookform/resolvers` (Zod bridge), Zod `3.25.76` (pinned via root `package.json` overrides so every transitive dependency matches), Prisma Client 7 (`@prisma/adapter-pg` driver-adapter mode — no bundled query-engine binary).

---

## 3. Data model

| | Prisma (business data) | Payload (editorial CMS) |
|---|---|---|
| Schema location | `apps/web/prisma/schema.prisma` | `apps/web/collections/` |
| Model/collection count | **22 models** | **5 collections** |
| Models / collections | `Lead`, `FleetPartner`, `Driver`, `WaitlistEntry`, `MediaKitRequest`, `OpsPushToken`, `CustomerPushToken`, `DriverPushToken`, `AnnouncementBroadcast`, `AnnouncementDelivery`, `PushTicket`, `Customer`, `SupportCase`, `SupportIdentity`, `SupportMessage`, `PlatformFlag`, `OpsRole`, `OpsRoleAssignment`, `DriverProfile`, `DriverDocument`, `DriverNotification`, `AuditEvent` | `BlogPosts`, `HelpArticles`, `HelpCategories`, `Media`, `Users` |
| Consumed by | `apps/api` (all business routes), `apps/ops` (server-rendered stats) | `apps/web` server components only |
| Migration discipline | Additive-only on a shared Postgres instance — see [DATA-LAYER.md](./DATA-LAYER.md) for the full "one database, two ORMs" rule and why a careless `db push` on either side can drop the other's tables |

`@workspace/ops-contracts` mirrors this domain in ~30–40 Zod schemas/DTOs (leads, fleet, driver, driver applications, support case/message, platform flags, roles, teams, audit events), consumed both client-side (`react-hook-form` + `@hookform/resolvers/zod`) and server-side in `apps/api` route handlers — one schema, validated identically on both ends.

---

## 4. Architectural decisions worth flagging to a reviewer

- **Five independent Vercel projects, not one multi-tenant router.** `admobihq.com`, `api.admobihq.com`, `ops.admobihq.com`, `app.admobihq.com`, `driver.admobihq.com` are five separate Vercel projects sharing one GitHub repo, each with its own root directory, domain, and env vars. Four `middleware.ts` files exist repo-wide: `apps/web` (Edge 404 for scanner/probe paths), plus `api`, `customer-web`, and `driver-web` for CORS/session. None does cross-app hostname routing. Each app has a `vercel.json`; API also defines the daily cron, and all five set `ignoreCommand` so docs-only commits skip Fluid rebuilds. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).
- **Deploy ordering is a real operational constraint.** `NEXT_PUBLIC_API_URL` is inlined at build time, so the API must deploy before any frontend redeploys after an API URL change — undocumented deploy-order mistakes are the most likely source of a "why is prod broken" incident.
- **Dual ORM on one Postgres instance, additive-only.** Prisma owns business data, Payload owns editorial content, tables are name-disjoint, and the team's own docs carry an explicit warning against `db push` on the shared database.
- **Rate limiting fails open.** Missing Upstash credentials silently disable throttling rather than erroring — correct for local dev, a real production risk if forgotten during a Vercel env migration.
- **`packages/mobile-ui` is an empty scaffold** — no source code exists despite the name. The three Expo apps currently style themselves independently.
- **Test coverage is still thin** — Vitest for `packages/geo` and `packages/ops-contracts`, Playwright marketing smoke, plus script tests for `vercel-ignore-build` and bot-probe paths. Product surfaces (`ops`, `api` handlers, customer/driver apps) remain largely untested. See [AUDIT-VALUATION.md §4](./AUDIT-VALUATION.md#4-devops-deployment--production-hygiene).
- **CI builds and gates; it does not deploy.** The Vercel deploy step in `master.yml` is written but commented out — production deploys ride on Vercel's Git integration, not the GitHub Actions pipeline.

---

## 5. How this maps to the valuation

[AUDIT-VALUATION.md](./AUDIT-VALUATION.md) derives its hours estimate from the 94,424-line total in §0 above, at a stated blended throughput of 15 lines/hour. To re-derive independently: take the per-app LOC breakdown in [AUDIT-VALUATION.md §1](./AUDIT-VALUATION.md#1-architectural-overview--lines-of-code) (or re-run the `git ls-files` methodology yourself), apply your own hourly rate and throughput assumption, and layer in the two percentage premiums and two flat capitalizations from the ledger. The route/screen counts and real-vs-placeholder status in §1 above are what should inform any per-app weighting — an app with 3 of its 15 pages still placeholder should not be priced as if it were fully built out.

---

## 6. Competitive comparison — vs. a third-party vendor quote

A third-party agency quoted a phased build of a comparable taxi-top/OOH advertising platform (verbatim quote received 2026-08-25). Checked line-by-line against this repository's actual code — not against the marketing pitch — to see where Admobi stands relative to what that phased scope implies.

### Phase 1 — Professional Online Presence (quoted KES 80,000–180,000)

| Ask | Admobi status |
|---|---|
| Home, services, contact, enquiry form | ✅ Built — `apps/web` homepage, `/products-solutions`, `/help/contact`, plus 4 separate lead-capture forms (campaign, drivers, fleet, media-kit) |
| Booking request form (manual) | ✅ Exceeded — forms persist to Postgres via Prisma and trigger Resend confirmation emails; not a mailbox-and-spreadsheet flow |
| WhatsApp chat | ✅ Built — sitewide floating button (`apps/web/components/landing/whatsapp-fab.tsx`) |
| Basic client login | ✅✅ Far exceeded — full Clerk auth across 3 independent tenant instances, not a single "basic" login |
| About page, portfolio/gallery | ❌ **Missing** — no dedicated `/about` or gallery/portfolio route exists in `apps/web/app/` |
| Google Maps office location | ❌ **Missing** — MapLibre-powered coverage/corridor maps exist (technically ahead of a Google Maps embed) but no simple "here's our office" pin |
| M-Pesa payment integration | ❌ **Missing** — confirmed by repo-wide search: no Safaricom Daraja/M-Pesa/Stripe/Paystack/Flutterwave integration anywhere. "M-Pesa" appears only as a text label on the driver payout-method form (`apps/driver-mobile/app/profile-setup/tax-payout.tsx`), not a live payment API |

### Phase 2 — Online Booking System (quoted KES 150,000–300,000)

| Ask | Admobi status |
|---|---|
| Client registration, dashboard | ✅✅ Far exceeded — `customer-web`/`customer-mobile` full dashboards (campaigns, map, billing, support), not a single portal page |
| Campaign status tracking (Pending/Approved/Live/Completed) | ✅ Built — status badges/filters confirmed in `customer-mobile` campaign screens |
| Online booking | ⚠️ Partial — `campaigns/new` on `customer-mobile`; `customer-web` has list/detail plus `new-campaign-form.tsx`, all local demo data (no API persist) |
| Campaign calendar | ❌ **Missing** — no dedicated calendar view found |
| Invoice generation | ❌ **Missing** — no invoicing logic found; a billing/wallet *view* exists but doesn't generate invoices |
| Payment confirmation | ❌ **Missing** — follows from no payment gateway existing yet |

### Phase 3 — Live Tracking (quoted KES 300,000–700,000)

| Ask | Admobi status |
|---|---|
| Client notifications | ✅✅ Far exceeded — full Expo push infrastructure, per-app inboxes, broadcast compose with images, delivery-receipt reconciliation cron (see §2 above) — more engineering on its own than this entire quoted phase |
| Route history | ✅ Built — `driver-web`/`driver-mobile` have real route-history map screens |
| Analytics dashboard | ⚠️ Partial — `ops` has real stats/overview with charts; `customer-web`/`mobile` has campaign spend simulation |
| Live campaign map | ⚠️ Partial — real interactive coverage maps exist (MapLibre + `packages/geo`), but geometry is static/illustrative — the source data is commented "not survey-grade" |
| GPS tracking (live) | ❌ **Missing** — confirmed by repo-wide search: no live-location APIs, no `expo-location` device tracking, nothing feeding a moving-vehicle position anywhere |
| Proof of campaign delivery | ❌ **Missing** — no proof-of-play/photo-verification feature found |

### Verdict

The quote describes a single brochure website with a manual booking process that eventually bolts on GPS, priced in total around **KES 530,000–1,180,000** across all three phases. Admobi is an 8-application platform — 3 independently-authenticated tenant surfaces, a dual-ORM data layer with 22 real business models, EAS-built native mobile apps for three actor types, a real push-notification and audit-logging infrastructure, and a shared design system and API contract layer. It is not the same tier of product, and the [reconstructive-cost valuation](./AUDIT-VALUATION.md) reflects that gap.

That said, three gaps are real and worth prioritizing precisely because they're what the quote promises and this repo doesn't yet have:

1. **No payment collection** — no M-Pesa/Daraja, no invoicing, no payment confirmation anywhere in the codebase. The single biggest functional gap, and revenue-blocking.
2. **No live GPS vehicle tracking or proof-of-delivery** — the notification/route-history/analytics build is more sophisticated engineering than the quote's phase 3, but "is the ad actually on a moving car right now" isn't answerable yet.
3. **A few Phase-1 marketing-site basics are missing outright** — About page, gallery/portfolio, office-location map. Cheapest items on either list to close, and probably shouldn't stay open given everything else already shipped.

---

## 7. Software engineering fundamentals implemented

Distinct from §2 (which catalogs *third-party services*), this section catalogs the standard computer-science and platform-engineering *patterns* — the kind every production SaaS needs regardless of vendor — and confirms which of them Admobi has actually implemented, with citations. This is the list a CS-literate reviewer would check off.

### 7.1 Identity & access control

| Pattern | Implementation | Where |
|---|---|---|
| **Authentication** | Clerk, 3 fully independent tenant instances (ops, customer, driver) — no shared session, no satellite domains; JWT bearer tokens verified server-side | `apps/api/middleware.ts`, `apps/{ops,customer-web,driver-web}/app/layout.tsx` |
| **Role-based access control (RBAC)** | Custom, resource-scoped permission model — `requireOpsPermissionAccess("<resource>")` gates every ops route individually (`flags`, `activity`, `drivers`, `waitlist`, `fleet`, `leads`, `announcements`, `driver_applications`, and more), backed by `OpsRole` + `OpsRoleAssignment` tables so permissions are assignable per staff member, not hardcoded to a single "admin" bit | `apps/api/lib/api-utils.ts:55`, `apps/api/lib/auth.ts:4` (`OPS_PERMISSIONS`, `OpsPermission` type), enforced per-route across ~20 files under `apps/api/app/v1/**/route.ts` |
| **Capability-based access (no login required)** | Anonymous support-case access via a possession token, not a password: a random 24-byte token is generated per case, only its SHA-256 hash is persisted, and a separate per-email `SupportIdentity` token lets one identity access all their cases without re-authenticating | `apps/api/lib/support-token.ts`, `apps/api/lib/support.ts` |
| **Timing-safe secret comparison** | Cron-secret and support-token verification use constant-time comparison rather than `===`, closing the standard timing side-channel on secret-matching logic | `apps/api/app/v1/push-receipts/check/route.ts` (`hasCronSecret`), `apps/api/lib/support.ts` (`loadCaseByToken`) |
| **CORS control** | Centralized origin allow-listing rather than a blanket `*`, driven by an env var so it can differ per environment | `apps/api/lib/cors.ts`, `API_CORS_ORIGINS` |

### 7.2 Data & API reliability patterns

| Pattern | Implementation | Where |
|---|---|---|
| **Boundary schema validation** | Zod schemas validate the same shape on the client (`react-hook-form` + `@hookform/resolvers/zod`) and the server (route handlers) — one schema, not two hand-kept-in-sync copies | `@workspace/ops-contracts/src/schemas.ts`, consumed in both `apps/api/app/v1/**` and every form in `apps/web`/`apps/ops`/mobile |
| **Soft deletion** | `deleted_at DateTime?` (nullable, indexed) on at least 6 models rather than hard `DELETE` — preserves audit history and supports recovery | `apps/web/prisma/schema.prisma:28,52,76,94,108,170` |
| **Pagination** | Offset-style `page`/`pageSize` query params on every list endpoint, default page size 20 | `apps/api/app/v1/leads/route.ts:18` and equivalent across `fleet`, `drivers`, `waitlist`, `media-kit`, `support`, `team` list routes |
| **Idempotent writes** | Waitlist signup upserts by email rather than inserting duplicates on repeat submission | `apps/api/app/v1/public/waitlist/route.ts` |
| **Audit logging** | Single write path (`recordAuditEvent`) for every mutating action, explicitly designed to never block or fail the operation it's auditing | `apps/api/lib/audit.ts` |
| **Rate limiting** | Sliding-window limiter keyed by client IP on every public, unauthenticated route; deliberately fails open (unthrottled) rather than failing the request when the backing store is unconfigured | `apps/api/lib/rate-limit.ts` |
| **Feature flagging** | Runtime, ops-controlled visibility toggles (`PlatformFlag`) — public to read, Clerk-gated to write, 5-minute fetch + CDN cache, fails closed to "off" on any error so a flag can never crash a client | `apps/web/prisma/schema.prisma`, `apps/driver-web/lib/flags.ts`, `apps/api/app/v1/public/config/route.ts` |

### 7.3 Messaging & delivery

| Pattern | Implementation | Where |
|---|---|---|
| **Transactional email** | Template-based (8 React email templates) with two send paths (SDK + raw HTTP) and a queued path for non-blocking sends | `apps/api/lib/email/` |
| **Push notification fan-out + delivery tracking** | Broadcast-to-many via Expo's push API, chunked sends, per-recipient delivery rows (`AnnouncementDelivery`), per-message tickets (`PushTicket`), and a scheduled job that reconciles delivery receipts and prunes dead device tokens | `apps/api/lib/push/`, `apps/api/vercel.json` (daily cron) |
| **Object storage with signed/authenticated URLs** | Sensitive files (driver ID documents) never get a public URL — Cloudinary `type: "authenticated"` plus a server-minted, short-lived signed URL on every read; less-sensitive assets (CMS media, announcement images) use plain public Vercel Blob URLs, a deliberate two-tier trust split | `apps/api/lib/driver-document-storage.ts` vs. `apps/api/app/v1/notifications/broadcast-image/route.ts` |

### 7.4 Platform & operational hygiene

| Pattern | Implementation | Where |
|---|---|---|
| **Multi-layer caching** | Marketing ISR (`revalidate: 86400` plus on-demand `revalidateTag` on CMS publish), request-time fetch caching (`revalidate: 300` on the feature-flag poll, matching API `s-maxage=300`), and client-side query caching (TanStack Query, 30s stale time) | `apps/web/lib/seo/isr.ts`, `apps/driver-web/lib/flags.ts`, `packages/query-client/src/client.ts` |
| **Health checks** | Liveness endpoint per backend surface, used in the team's own deployment smoke tests | `apps/api/app/v1/health/route.ts`, equivalent `/api/health` on customer-web/driver-web |
| **Scheduled jobs** | One production cron (Vercel Cron, daily) reconciling push-notification delivery receipts | `apps/api/vercel.json` |
| **Observability** | Error tracking + performance monitoring on every app (5 Next.js apps via `@sentry/nextjs`, 3 Expo apps via `@sentry/react-native`), sharing one config package | `packages/sentry-config/` |
| **Centralized secrets management** | Infisical, 3 environments (dev/staging/prod) × 8 apps, pulled to `.env.local` per app rather than hand-copied | `docs/shared/DEPLOYMENT.md` §Infisical environments |
| **CI gating** | Every PR runs install → `prisma generate` → typecheck → lint → build → unit tests → Playwright e2e before merge is allowed | `.github/workflows/pr.yml`, `.github/workflows/master.yml` |
| **Schema migration discipline** | Additive-only convention enforced by team documentation (not by tooling) on a shared Postgres instance carrying two ORMs | `docs/shared/DATA-LAYER.md` §Migration rules |
| **Automated testing** | Present, but still thin — 2 Vitest package files, 1 Playwright smoke spec, plus `npm run test:scripts` (ignore-build + bot probes). Product-route coverage is the real gap | See §4 above and `AUDIT-VALUATION.md` §4 |

None of this list is unusual for a mature product — that's the point of including it. What's notable for a system at this stage is less any single pattern and more the *count* of them implemented consistently across 8 apps by one small team: RBAC, soft-delete, idempotency, audit logging, rate limiting, feature flags, signed-URL storage, and multi-layer caching are the kind of infrastructure many funded startups still lack a year into building, not scaffolding a vendor quote like §6's would typically include at any phase.
