# Driver apps (`apps/driver-web` + `apps/driver-mobile`)

Driver product at **`driver.admobihq.com`** and the Expo twin. Auth: [AUTH.md](../shared/AUTH.md). Roadmap (earnings vs telemetry): [ROADMAP.md](../shared/ROADMAP.md) §3.

**Deployment:** [DEPLOYMENT.md](../shared/DEPLOYMENT.md) · **Local dev:** [DEV-SETUP.md](../shared/DEV-SETUP.md) · **APK / OTA:** [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md)

Honest placeholders stay labeled illustrative until telemetry can back earnings (PRODUCT.md *placeholder honesty*).

## URLs

| Surface | Production | Staging | Local |
|---------|------------|---------|-------|
| Driver web | `https://driver.admobihq.com` | `https://driver.staging.admobihq.com` | `:3004` |
| Driver mobile | EAS preview/production | — | Expo Metro `:8083` |
| Business API | `https://api.admobihq.com` | `https://api.staging.admobihq.com` | `:3003` |

## Driver web (`apps/driver-web`)

Vercel project root `apps/driver-web`, include-files-outside-root on. Smoke: `GET /api/health`.

| Tab | Route | Status |
|-----|-------|--------|
| **Dashboard** (home) | `/` | Full-width dashboard built from the shared `@workspace/ui` dashboard kit (same as customer-web and ops). Greeting with **Get help** / **Earnings** buttons, then `DashboardToolbar` (7D/30D/90D/All/custom) with a "Sample screen data" pill. An `AlertStrip` appears for a failed/reversed payout ("Check payout details") or a missing payout destination. Then a hero for **screen-on time** (delta vs previous period, sparkline) beside a 4-cell KPI strip (ads shown, distance, days worked, hours a day); **Screen time by day** chart beside the real **Latest payout** card (`components/overview/latest-payout-card.tsx`: amount, status pill, Saved/Sending/Paid stage bar, masked destination via `payoutDestinationLabel`, paid-this-year / on-its-way); **Top areas**, **Best times to drive** (the top three weekday + time slots in words, e.g. "Friday, 6–9 pm") and real **Updates** (newest 5 notifications, same cache as the bell). Screen, distance, play and area figures come from `lib/sample-data.ts` (seeded by day, so stable) and every one carries a "Sample" tag until telemetry exists |
| **Earnings** | `/earnings` | **All real.** KPI strip (paid this calendar year, on its way, last payout, paid-to destination with a change link), **Payouts by month** (stacked paid / on its way, last 12 months with a payout) beside the Latest payout card, then a **Payout history** `LedgerCard` with All / Paid / On its way / Problems filters and CSV download; failed/reversed amounts are struck through. Load failures show an `AlertStrip` with Try again |
| **Reports** | `/reports` | Printable summary for This week / Last week / This month / Last month (Monday-first weeks, Nairobi days): KPI strip of logged-in, driving and screen-on hours, distance, days worked and ads shown; a **Your hours** card comparing the three (logged ≥ driving ≥ screen on); a real **Pay** card (settled payouts paid inside the period, and the month's payout with its status); a **Day by day** table. **Download CSV** and **Print or save PDF** (`window.print()`; the sidebar, header, bottom tabs and SOS button are `print:hidden`). Hours, distance and ads are Sample (`lib/sample-data.ts`) until screen telemetry and shift tracking exist |
| **Routes** | `/routes` | Full-bleed `MapCanvas` (shared with customer and ops maps); the rail ranks areas by screen-on hours for the last 7 days from the same `lib/sample-data.ts` the dashboard opens on, each row Sample-tagged |
| **Payouts** | `/payouts` | Redirects to Earnings, where payouts now live. Hidden from the nav |
| **Deliveries** | `/deliveries` | Preview in the dashboard kit: KPI strip (sample jobs near you and average fee; real zero completed / earned), a Sample-tagged jobs table with disabled Accept, and an empty job history. **Only when** the `deliveries` platform flag is on |
| **SOS** | `/sos`, `/sos/[id]` | Safety incident report + tracking. Reachable from a red FAB on every page — **not** flag-gated |
| **Settings** | `/settings/*` | Profile, account, preferences, tour, support |
| **Auth** | `/auth/login`, `/auth/signup` | Clerk (email code + Google), always on |

Below `md` the sidebar collapses to its sheet and a **bottom tab bar** (Home, Earnings, Routes, Support) takes over, matching the native app; the SOS FAB sits above it.

Profile-setup (web + mobile) writes `DriverProfile` + `DriverDocument` via `/v1/driver/*`. Ops reviews at `/driver-applications`. The CRM `Driver` marketing table is a different model and is **not** joined yet.

### Search (⌘K)

The header **Search** button (or ⌘K / Ctrl+K) opens the command palette: recent picks, pages, quick actions (SOS, contact support, payouts, switch theme), and the driver's own payouts, support cases, SOS reports, documents and notifications from `GET /v1/driver/search`. `#42` jumps to that payout, case or SOS report; `adm-payout-…` finds a payout by its transfer reference.

### Env (Infisical)

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_DRIVER_URL` | `http://localhost:3004` / staging / prod |
| `NEXT_PUBLIC_API_URL` | Business API |
| `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_APP_URL` | Optional cross-links |
| `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY`, `DRIVER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` | Required |

## Driver mobile (`apps/driver-mobile`)

| Setting | Value |
|---------|-------|
| Expo dev port | **`:8083`** |
| App name / slug / scheme | `Admobi Driver` / `admobihq-driver` / `admobihq-driver` |
| EAS | `@admobimedia/admobihq-driver` (`projectId` in `app.json`) |

Home and Earnings still use the payout hero and route-style history (`components/payout-hero.tsx`), real announcements under **Updates**, pull-to-refresh on both. driver-web moved to the shared dashboard kit on 2026-11-10; mobile has not followed yet. Tabs: Dashboard, Deliveries (flag-gated), Earnings, Settings. Off the tab bar: Routes, Payouts, Support, SOS. A red **SOS FAB** is mounted once in `app/_layout.tsx` and overlays every screen (hidden on auth, onboarding, profile-setup and the SOS screens); it only navigates, so a pocket-tap never files a report. See `docs/shared/SAFETY-SOS.md`. Profile-setup is a 4-step wizard. Clerk always mounts (publishable key required). Push registration: `DriverPushToken` + `POST /v1/public/driver-push-tokens`.

Support has three routes under `app/(tabs)/support/`: `index` (case list), `new` (raise a case), `[id]` (thread). Raising a case is its own screen — it used to sit inline above the list, which pushed "My requests" below the fold.

```bash
npm run env:pull -w driver-mobile
npm run dev:mobile:driver          # Metro :8083, cleared cache
```

### Persisted query cache

`app/_layout.tsx` wraps the app in `PersistQueryClientProvider`, writing the
TanStack Query cache to MMKV (24h `maxAge`, busted by `QUERY_CACHE_BUSTER` in
`lib/query-client.ts`). The persister serialises with JSON, so **anything a
`queryFn` returns must be JSON-safe**. A `Date` comes back as a string and a
method comes back as `undefined`, and the screen throws
`TypeError: undefined is not a function` on the render that reads it — after a
relaunch only, which makes it look unrelated to the query.

A query that must hold non-serialisable values opts out:

```ts
useQuery({
  queryKey: ["driver-sessions", user?.id],
  queryFn: /* rows holding a Date + a live Clerk revoke() */,
  meta: { persist: false },
})
```

`shouldDehydrateQuery` in the provider's `dehydrateOptions` honours that flag.
Bump `QUERY_CACHE_BUSTER` whenever a cached shape changes, so devices already
holding a bad entry drop it on next launch.

## Deliveries placeholders + the platform flag

Deliveries ships as **placeholder screens behind one ops-controlled platform flag** — visible for demos, hidden otherwise, no redeploy. Distinct from a future per-driver `delivers` opt-in.

| Surface | Route | When flag is off |
|---------|-------|------------------|
| `apps/customer-web` | `(shell)/deliveries` | Redirects to `/` |
| `apps/driver-web` | `(shell)/deliveries` | Redirects to `/` |
| `apps/driver-mobile` | Deliveries tab | Tab hidden |

### Flag storage and API

- **Prisma:** `PlatformFlag` (`key` PK, `enabled`, …) in [schema.prisma](../../apps/web/prisma/schema.prisma), seeded `deliveries: false`. Additive SQL: `npm run db:platform-flags -w web`. **Not** `prisma db push` (would drop Payload tables).
- **Read:** [`GET /v1/public/config`](../../apps/api/app/v1/public/config/route.ts) — `{ flags: { deliveries: boolean } }`. Next.js: `revalidate: 300` (API also caches 5 minutes in-memory and via `s-maxage=300`). Expo: fetch on launch and AppState foreground.
- **Write:** [`GET/PATCH /v1/flags`](../../apps/api/app/v1/flags/route.ts) — ops JWT, audit entity `platform_flag`.
- Ops web: Settings → Flags. Ops mobile: Settings. Contracts in `@workspace/ops-contracts`; client in `@workspace/ops-api-client`.

## What is still out of scope

- **Computed earnings** — per-hour / per-km / revenue-share pay needs telemetry (`Device`, `EarningsLedger`); today ops types each driver's monthly amount ([ROADMAP.md](../shared/ROADMAP.md) milestones 5–6).
- **Payouts** are sent by ops through Paystack Transfers to the M-Pesa number or bank account on the profile. The driver gets a push and inbox notice when a payout is sent or fails, and a notice (plus email) whenever their payout details change. The bank field is a picker fed by `GET /v1/driver/payout-banks` (Paystack's Kenyan bank list), which stores the bank code with the name.
- **CRM join** — `DriverProfile.clerk_user_id` is not linked to the marketing `Driver` row.
- **Real deliveries** — dispatch, job assignment, proof-of-delivery, and per-driver `delivers`.
