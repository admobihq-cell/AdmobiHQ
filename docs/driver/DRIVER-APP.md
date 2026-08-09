# Driver App — Scaffold Plan

Plan for scaffolding the two driver-facing surfaces from [ROADMAP.md](../shared/ROADMAP.md) §3: **`apps/driver-web`** at `driver.admobihq.com` and **`apps/driver-mobile`** as a new Expo app. When the apps land, this doc splits into `DRIVER.md` / `DRIVER-MOBILE.md` mirroring [APP.md](../customer/APP.md) / [APP-MOBILE.md](../customer/APP-MOBILE.md).

## What "scaffold" means here

Exactly what it meant for the customer apps: **shell, tabs, demo data, no auth** — with honest placeholders (per PRODUCT.md's *placeholder honesty* principle, demo numbers are clearly labeled illustrative). The roadmap is explicit that real driver earnings can't ship before telemetry (milestone 5); the scaffold ships the frame those numbers will land in, the same way customer-web shipped a Map tab on `@workspace/geo` fixtures before campaigns existed.

**Auth is a dormant seam, not a feature.** Copy the pattern from [apps/customer-mobile/lib/auth/use-customer-session.ts](../../apps/customer-mobile/lib/auth/use-customer-session.ts): `@clerk/*` packages installed as dependencies, no `<ClerkProvider>` mounted, a `useDriverSession()` hook that resolves `anonymous` with a stable device id until `*_AUTH_ENABLED` flips on. Every screen calls the hook from day one, so wiring real Clerk SMS OTP later (roadmap milestone 6) changes the provider, not the screens.

## Surface 1: `apps/driver-web`

Clone the `apps/customer-web` structure wholesale — it is the proven template.

| Setting | Value |
|---------|-------|
| Local port | **`:3004`** (next free after web 3000, ops 3001, customer-web 3002, api 3003) |
| Production | `https://driver.admobihq.com` |
| Staging | `https://driver.staging.admobihq.com` |
| Vercel | **Fifth Vercel project**, root `apps/driver-web`, "Include files outside root" enabled |

### Route shell

App Router with a `(shell)` route group and sidebar, mirroring customer-web's `(shell)/{campaigns,map,reports,settings}`:

| Tab | Route | Scaffold state |
|-----|-------|----------------|
| **Earnings** (home) | `/` | Demo earnings summary — day/week totals, screen-on hours, clearly labeled illustrative |
| **Routes** | `/routes` | mapcn/MapLibre map of demo route history from `@workspace/geo` corridors — same map stack as customer-web's live tab |
| **Payouts** | `/payouts` | Coming-soon empty state (pending vs settled table when real) |
| **Deliveries** | `/deliveries` | Placeholder jobs list (available/assigned, pickup → dropoff, accept/complete described) — **only rendered when the platform `deliveries` flag is on** (see below) |
| **Settings** | `/settings` | Coming-soon; later holds profile + the driver's personal delivery opt-in |

### Plumbing (all copied from customer-web)

- `GET /api/health` for deploy smoke tests
- Sentry via `@workspace/sentry-config` (`instrumentation.ts`, `instrumentation-client.ts`, `global-error.tsx`)
- `scripts/check-env.ts` + `env:pull` / `env:pull:staging` Infisical scripts
- Same dependency set: `@workspace/ui`, `@workspace/geo`, `@workspace/ops-api-client`, `@clerk/nextjs` (dormant), `@sentry/nextjs`, `lucide-react`
- Dev script pattern: `dotenv -e .env.local -e ../web/.env.local -- next dev --port 3004 --webpack`

### Env vars (Infisical, own Vercel sync — syncs are per-project)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_DRIVER_URL` | `http://localhost:3004` dev · `https://driver.staging.admobihq.com` staging · `https://driver.admobihq.com` prod |
| `NEXT_PUBLIC_API_URL` | Existing API URLs per env |
| `NEXT_PUBLIC_WEB_URL` | Marketing site link-back (optional) |

## Surface 2: `apps/driver-mobile`

Clone `apps/customer-mobile` — expo-router tabs, MapLibre, Sentry RN, EAS + OTA pipeline per [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md).

| Setting | Value |
|---------|-------|
| Expo dev port | **`:8083`** (ops-mobile 8081, customer-mobile 8082) |
| App name / slug / scheme | `Admobi Driver` / `admobihq-driver` / `admobihq-driver` |
| EAS | **New EAS project** under the `admobimedia` owner (own `projectId`, own `google-services.json` for a new Firebase Android app) |
| Channels | `preview` + `production`, same `eas.json` shape and `update:*` scripts (including the post-OTA `notify-app-update.mjs` hook) |

Tabs mirror driver-web: Earnings, Routes (MapLibre + `@workspace/geo` demo), Payouts, Settings, plus the flag-gated Deliveries placeholder. Auth is the dormant `useDriverSession()` seam. Push-token registration is **deferred** — `CustomerPushToken` is customer-scoped, and a `DriverPushToken` model only earns its place once drivers can log in; don't scaffold dead schema.

## Deliveries placeholders + the platform flag

Deliveries ships as **placeholder screens behind one ops-controlled platform flag** — visible when Admobi wants to show the story (a demo, a partner walkthrough), hidden otherwise, no deploy either way. This is a platform-level switch and is distinct from the future per-driver `delivers` opt-in (which controls *participation* once deliveries are real; the flag controls *visibility* of the placeholders).

### Where the placeholders live

| Surface | Route | Placeholder content |
|---------|-------|---------------------|
| `apps/customer-web` | `(shell)/deliveries` | "Book a delivery" — pickup/dropoff form mock (disabled submit, labeled illustrative), plus empty states for active-delivery tracking and history |
| `apps/driver-web` | `(shell)/deliveries` | Jobs list — available/assigned tabs, pickup → dropoff details, accept/complete actions described |
| `apps/driver-mobile` | Deliveries tab | Same jobs-list placeholder, native |

When the flag is **off**: the tab disappears from every sidebar/tab bar, and a direct visit to the route redirects to the app's home tab (no 404 — the URL may have been shared while the flag was on).

### Flag storage and API — shipped

- **Prisma:** a generic `PlatformFlag` model (`key` PK, `enabled`, `updated_by_email`, `updated_at`) in [apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma), mapped to a `platform_flags` table — seeded with one row, `deliveries: false`. Generic so the next flag reuses the table instead of adding a column somewhere. Applied via the additive-SQL pattern this repo uses for schema changes on the shared Payload/ops database — [apps/web/prisma/scripts/platform-flags-additive.sql](../../apps/web/prisma/scripts/platform-flags-additive.sql), run with `npm run db:platform-flags -w web`. **Not** `prisma db push` — that diffs the whole database and would drop every Payload CMS table, since Payload owns tables this schema doesn't declare.
- **Read:** [`GET /v1/public/config`](../../apps/api/app/v1/public/config/route.ts) — no auth, rate-limited like the other public routes, returns `{ flags: { deliveries: boolean } }`. Safe to be public: flags are visibility toggles, never secrets. Next.js apps read it server-side with `next: { revalidate: 60 }`; Expo apps fetch on launch and on `AppState` foreground, so a toggle propagates in about a minute without any OTA update.
- **Write:** [`GET/PATCH /v1/flags`](../../apps/api/app/v1/flags/route.ts) — Clerk ops JWT, following the existing CRUD pattern, writing an audit event on every toggle (entity type `platform_flag`) so the Activity trail shows who flipped it and when.
- **Contracts:** `PLATFORM_FLAG_KEYS`, `PlatformFlagDto`, `platformFlagUpdateSchema` in `@workspace/ops-contracts`; `client.flags.list()` / `client.flags.update()` in `@workspace/ops-api-client`.

### Where ops toggles it

- **Ops web** — a Platform flags card on a settings/config page: flag name, description, switch, last-changed-by.
- **Ops mobile** — the same toggle in the app's Settings screen, calling the same `PATCH /v1/flags` via `@workspace/ops-api-client`, so the flag can be flipped from a phone mid-meeting.

## Monorepo wiring

1. **Workspaces** — automatic: root `package.json` globs `apps/*`; Turbo tasks (`build`, `lint`, `typecheck`) pick the new apps up with no `turbo.json` change.
2. **[scripts/dev-with-env.mjs](../../scripts/dev-with-env.mjs)** — needs edits: add `driver-web` to `coreApps`, add `driver-mobile` to the mobile stack lists, and a `--driver-only` flag alongside `--ops-only`/`--customer-only`.
3. **CI** — verify `.github/workflows` PR checks run turbo across all workspaces (they should, via the task graph); no per-app matrix entry expected.
4. **Docs** — after scaffolding, update the apps table in [ARCHITECTURE.md](../shared/ARCHITECTURE.md) §3, the deploy matrix in [DEPLOYMENT.md](../shared/DEPLOYMENT.md), and [DEV-SETUP.md](../shared/DEV-SETUP.md) ports.

## Deployment checklist (driver-web)

1. Create the fifth Vercel project → root `apps/driver-web`, include-files-outside-root **on**, framework Next.js.
2. DNS: `driver` and `driver.staging` CNAMEs on `admobihq.com`.
3. Domains: `driver.admobihq.com` → production (`master`); `driver.staging.admobihq.com` → `staging` branch.
4. Infisical: add the driver-web vars to `dev`/`staging`/`prod` and create this project's own Vercel sync.
5. Smoke test: `GET https://driver.admobihq.com/api/health`.

## Explicitly out of scope for the scaffold

- **Real auth** — Clerk SMS OTP on the customer instance, `/v1/driver/*` API routes, and linking a Clerk user to the existing `Driver` CRM record by verified phone. That's roadmap milestone 6, gated on telemetry.
- **Real earnings data** — `Device`, `EarningsLedger`, `Payout` models and the aggregation cron (milestones 5–6).
- **Payouts** — manual M-Pesa by ops remains the operating mode.
- **Real deliveries** — dispatch, job assignment, proof-of-delivery, and the per-driver `delivers` opt-in all wait for milestone 7. The scaffold ships only the flag-gated placeholder screens above.

## Build sequence

| # | Step | Output |
|---|------|--------|
| 1 | Scaffold `apps/driver-web` from customer-web | Shell + 4 tabs + health route, running on `:3004` |
| 2 | Scaffold `apps/driver-mobile` from customer-mobile | Expo app on `:8083`, new EAS project, preview build installable |
| 3 | Platform flag: `PlatformFlag` model + `/v1/public/config` + `/v1/flags` + ops toggles (web Settings + ops-mobile) | Deliveries flag flippable from ops, audited |
| 4 | Deliveries placeholders in customer-web, driver-web, driver-mobile, gated on the flag | Tabs appear/disappear within ~1 min of a toggle |
| 5 | Wire `dev-with-env.mjs`, env checks, Infisical | `npm run dev` includes driver-web; `env:pull` works in both apps |
| 6 | Vercel project + DNS + staging domain | `driver.staging.admobihq.com` live from `staging` branch |
| 7 | Docs pass | ARCHITECTURE / DEPLOYMENT / DEV-SETUP updated, this doc split into DRIVER.md + DRIVER-MOBILE.md |
