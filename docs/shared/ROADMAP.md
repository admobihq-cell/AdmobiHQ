# Admobi — Product Roadmap: Actors, Implementation, Technology

The actor-by-actor build plan for turning the current scaffolds into the working product. Product story and brand: [PRODUCT.md](../../PRODUCT.md) · How the repo is laid out: [ARCHITECTURE.md](./ARCHITECTURE.md) · API reference: [API.md](../api/API.md).

This document answers three questions per actor: **what they need**, **how it's implemented in this codebase**, and **which technologies are required** — split into what the stack already has and what must be added.

---

## 1. The actors

| Actor | Surface | Auth | Status today |
|-------|---------|------|--------------|
| **Advertiser** | `apps/customer-web` + `apps/customer-mobile` | Customer Clerk instance (new) | Shell exists; Map tab live on demo data; no login |
| **Driver** | `apps/driver-mobile` (new Expo app) | Customer Clerk instance, SMS OTP | CRM record only (`Driver` model), no app |
| **Ops staff** | `apps/ops` + `apps/ops-mobile` | Ops Clerk instance (`@admobihq.com`) | Fully working; extended, not rebuilt |
| **Fleet partner** | None (deliberate) | — | CRM record only (`FleetPartner`); dashboard deferred |

Delivery riders are **not a fifth actor** — a delivery rider is a `Driver` with an opt-in capability flag. Delivery customers are **not a fifth actor** either — delivery booking lives inside the advertiser app as a tab, keeping one login and one billing entity per business.

---

## 2. Actor: Advertiser

### What they need

- **Overview** — wallet/balance, active campaigns, total spend, impressions, delivery rate
- **Campaigns** — list + detail: status (`draft → pending → approved → active → completed`), zones booked, creative, spend to date
- **Book a campaign** — pick zones/corridors and dates, see computed price, upload creative, submit for approval
- **Map** — live rollout of where booked screens are right now (telemetry-driven; today it renders `@workspace/geo` demo fixtures)
- **Reports** — spend over time, impressions per zone
- **Deliveries** (future phase) — book pickup/dropoff, track, history — a tab, not a separate product
- **Settings** — billing, team members (owner/member roles)

### Implementation in this codebase

**Data model** (extend [apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma), which `apps/api` builds against):

- Extend the existing `Customer` model (currently support-only) into the billing entity.
- `CustomerUser` — links a customer Clerk `user_id` to a `Customer` with `role: owner | member`. This is what makes "team members" work.
- `Campaign` — `customer_id`, name, status enum, budget, start/end dates, creative references (Cloudinary public IDs — Cloudinary is already the designated store for fleet campaign creatives), rejection reason.
- `Zone` — promote the Nairobi corridors/coverage fixtures in [packages/geo](../../packages/geo) from static TS data into a DB table: geometry (GeoJSON column), name, pricing fields. The geo package stays as the map-rendering/type layer.
- `CampaignZone` — the booking join: campaign × zone × date range. Inventory conflicts are checked here.

**API surface** (`apps/api`, following existing route/validation/audit patterns):

- `GET/POST /v1/customer/campaigns`, `GET /v1/customer/campaigns/[id]` — authenticated with the **customer** Clerk JWT (see §6 Auth).
- `POST /v1/customer/campaigns/[id]/creative` — signed Cloudinary upload, pattern already in [apps/api/lib/cloudinary.ts](../../apps/api/lib/cloudinary.ts).
- `GET /v1/customer/zones` — bookable inventory with pricing and availability.
- `GET /v1/customer/stats`, `GET /v1/customer/plays` — overview numbers and map data (fixtures first, telemetry later — same response shape so the UI doesn't change when real data lands).
- Zod DTOs go in `@workspace/ops-contracts`; typed client methods in `@workspace/ops-api-client` (both already exist and are shared with mobile).

**Frontend:** replace the "Coming soon" states in `apps/customer-web`; the sidebar shell, Map tab (mapcn/MapLibre), and design tokens already exist. `apps/customer-mobile` mirrors with the same API client.

### Technology

| Need | Already in stack | To add |
|------|------------------|--------|
| App shell, map, forms | Next.js 16, mapcn/MapLibre, react-hook-form + zod, `@workspace/ui` | — |
| Auth | — | **Second Clerk instance** for customers (ops instance is domain-locked) |
| Creative upload | Cloudinary | Direct signed-upload flow from browser |
| Payments/invoicing | Resend (email) | **Pesapal** (API 3.0) for self-serve top-ups — M-Pesa, Airtel Money, and cards through one hosted checkout; manual invoice + bank transfer for corporates first |
| Live map data | `@workspace/geo` fixtures | Telemetry pipeline (§5) — until then, poll the same endpoints backed by fixtures |

---

## 3. Actor: Driver

### What they need

- **Earnings** — pay from screen-on hours by day/week, route-weighted bonuses for high-value corridors
- **Route history** — where they drove, screen-on duration, which routes earned most
- **Payout status** — pending vs settled, payment history
- **Delivery toggle** (future) — opt in/out of parcels; if in, a jobs tab with accept/complete

### Implementation in this codebase

**Hard rule: this app ships after telemetry (§5), not before.** An earnings screen without proof-of-play data would display numbers the system can't honestly produce. Until then, manual payouts against the existing CRM `Driver` records are the operating mode.

**Data model:**

- `Device` — one row per physical screen unit: hardware key hash, `driver_id`, `fleet_partner_id` (nullable — preserves the fleet-partner/driver separation), status.
- `EarningsLedger` — append-only: `driver_id`, period, amount, source (`screen_hours | route_bonus | delivery`), derived from telemetry aggregates by a scheduled job.
- `Payout` — `driver_id`, amount, status, M-Pesa transaction ref.
- `Driver.delivers` boolean — the delivery opt-in flag (ops-editable now, driver-editable later).

**App:** new `apps/driver-mobile` Expo app, cloned from the `apps/ops-mobile` / `apps/customer-mobile` patterns (Expo, EAS builds, OTA updates, push tokens — all documented in [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)). Drivers are phone-first users: Clerk SMS OTP on the customer instance, with the Clerk user linked to the existing `Driver` record by verified phone number.

**API:** `GET /v1/driver/earnings`, `GET /v1/driver/routes`, `GET /v1/driver/payouts`, `PATCH /v1/driver/profile` — driver-scoped JWT auth.

### Technology

| Need | Already in stack | To add |
|------|------------------|--------|
| Mobile app | Expo + EAS + OTA pipeline, `@workspace/mobile-ui`, Sentry | New app folder only |
| Auth | — | Clerk SMS OTP (same customer instance, driver role) |
| Earnings data | — | Telemetry pipeline (§5) + aggregation cron |
| Payouts | — | Disbursements: manual M-Pesa first; automate via Pesapal's payout product if it fits, else **Daraja B2C** |

---

## 4. Actor: Ops staff

### What they need (extensions to the working console)

- **Lead → Customer conversion** — one action on a Lead that creates/links a `Customer` and invites the first `CustomerUser`.
- **Campaign approval queue** — review submitted campaigns, approve/reject creative, confirm zone availability against `CampaignZone` bookings.
- **Inventory/zone management** — CRUD on `Zone` rows, calendar view of bookings per corridor, double-booking prevention.
- **Device management** — register screen units, issue device keys, assign to drivers, see last-ping health.
- **Driver & fleet CRM** — existing screens, plus the delivery opt-in flag and earnings/payout visibility.
- **Delivery dispatch** (future) — assign jobs to opted-in drivers.
- **Support** — existing intake, enriched with campaign context.

### Implementation

All of this extends `apps/ops` + `apps/ops-mobile` using patterns that already exist end-to-end: list/detail/edit pages calling `@workspace/ops-api-client`, `/v1/*` CRUD with Clerk ops JWT, audit events written after every mutation, soft delete, bulk routes. New routes: `/v1/campaigns` (with `approve`/`reject` actions), `/v1/zones`, `/v1/devices`, `/v1/payouts`. No new technology required — this actor is pure pattern repetition.

---

## 5. The fulcrum: proof-of-play telemetry

The single biggest unbuilt system, and the honest source behind **two** screens at once: the advertiser's live map/spend and the driver's earnings. Everything about it should be boring and append-only.

**Ingestion:** screens (Android-based LED controllers) POST batched pings to `POST /v1/telemetry/pings` over HTTPS — no MQTT broker or streaming infra in v1. Auth is a per-device key (hash stored on `Device`), rate-limited like the existing public routes (Upstash Redis limiter already in [apps/api/lib/rate-limit.ts](../../apps/api/lib/rate-limit.ts)). A ping carries: device id, timestamp, GPS fix, screen-on state, creative/campaign playing. Batching (e.g. one POST per minute with 12×5s samples) keeps request volume trivial for Vercel serverless.

**Storage:** `DevicePing` append-only table on Neon Postgres. At Admobi's fleet scale (hundreds of devices, not millions), plain Postgres with a BRIN index on timestamp is enough — no TimescaleDB/ClickHouse until data proves otherwise.

**Aggregation:** a Vercel Cron job (pattern already exists — the nightly push-receipts check in `apps/api/vercel.json`) rolls pings into `PlaySession` rows (device × campaign × hour × zone) and writes `EarningsLedger` entries. Zone attribution is point-in-polygon against `Zone` geometries — the `@workspace/geo` helpers already model corridors; `@turf/boolean-point-in-polygon` covers the math without needing PostGIS on day one.

**Live map:** polling every 30–60s from the customer app against `GET /v1/customer/plays`. No WebSockets — serverless makes them awkward and a taxi-top network doesn't need sub-second updates. Upgrade path is SSE if polling ever feels stale.

**Fallback before hardware reports natively:** if the LED controllers can't run custom firmware yet, a cheap Android phone in the vehicle running a background Expo location task can produce the same ping shape — same API, same tables, swap the source later.

---

## 6. Cross-cutting technology decisions

**Auth — two Clerk instances, one verifier.** The ops instance stays locked to `@admobihq.com`. A new customer instance serves advertisers (email/Google) and drivers (SMS OTP). [apps/api/lib/auth.ts](../../apps/api/lib/auth.ts) grows multi-issuer JWT verification: ops tokens gate `/v1/*` admin routes as today; customer tokens gate `/v1/customer/*`; driver-role tokens gate `/v1/driver/*`; device keys gate `/v1/telemetry/*`.

**Payments — Pesapal for collections.** One aggregator covers advertiser payments end to end: Pesapal API 3.0's hosted checkout (redirect or iframe) takes M-Pesa, Airtel Money, and Visa/Mastercard in a single integration, with IPN callbacks confirming payment server-side — so no separate card-processor decision is needed. Implementation shape: `POST /v1/customer/payments` submits a Pesapal order and returns the redirect URL; an IPN handler route verifies the transaction status and credits the customer's wallet/invoice, writing an audit event like every other mutation. Corporate advertisers still get manual invoices (Resend email + bank transfer + ops marks paid) before any of that is automated. **Driver payouts are the one gap Pesapal may not cover** — it is collections-focused, so payouts start manual (ops sends M-Pesa, records the ref on the `Payout` row) and automate later via Pesapal's disbursement product if it fits, otherwise Safaricom Daraja B2C.

**Pricing model** — decide before the booking flow: flat rate per zone per day is the recommendation (matches "one-day minimums" positioning, trivially explainable, computable without impressions data). CPM pricing needs telemetry-verified impressions and comes later. This is also the moment to simplify the public pricing page.

**No new infrastructure categories.** Everything above lands on the existing stack: Neon Postgres + Prisma, Vercel serverless + Cron, Upstash Redis, Cloudinary, Resend, Clerk, Sentry, Infisical, Expo/EAS. The only genuinely new external integrations are the second Clerk instance and Pesapal (plus Daraja B2C only if needed for automated payouts).

---

## 7. Build order (a dependency chain, not a priority list)

| # | Milestone | Blocks | New tech |
|---|-----------|--------|----------|
| 1 | **Campaign model + Lead → Customer conversion** — schema + ops CRUD | Everything below | None |
| 2 | **Customer auth** — second Clerk instance, multi-issuer verify in API, login on customer-web | Any self-serve behaviour | Clerk instance |
| 3 | **Zone inventory + pricing** — `Zone` table from geo fixtures, flat-rate pricing, ops management UI | Booking | None |
| 4 | **Booking flow** — request-and-approve (not instant checkout — matches how OOH is bought), creative upload, approval queue | Revenue | Cloudinary signed upload |
| 5 | **Telemetry ingestion** — device pings, aggregation cron, live map + real spend numbers | Honest advertiser map, driver app | Device keys; possibly Android fallback app |
| 6 | **Driver app** — earnings, routes, payouts on top of telemetry | Delivery dispatch | Expo app, SMS OTP; payout automation (Pesapal disbursements or Daraja B2C) |
| 7 | **Deliveries** — B2B-first (SMEs, pharmacies, e-commerce last-mile), dispatch in ops, jobs tab in driver app, booking tab in customer app | — | Dispatch logic; proof-of-delivery |

The throughline: **advertiser revenue first** because it's what Admobi is and what funds everything downstream; **telemetry is the fulcrum** that turns two placeholder screens (advertiser map, driver earnings) real at once; **deliveries waits** until there's a rider fleet already earning from screens to extend — monetizing an existing network rather than building one from a standing start against better-funded competitors.

Fleet partners deliberately get nothing in this plan: they stay ops-managed records, with drivers linked by a nullable `fleetPartnerId`. If a partner reaches the scale where it matters, their dashboard is a thin read-only aggregation over the same telemetry the driver app already consumes — no new pipeline.
