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
| **Dashboard** (home) | `/` | Working shell; earnings numbers illustrative |
| **Earnings** | `/earnings` | Working UI on demo data — real ledger waits on telemetry |
| **Routes** | `/routes` | mapcn/MapLibre + `@workspace/geo` demo corridors |
| **Payouts** | `/payouts` | Coming-soon (ops still settles manually) |
| **Deliveries** | `/deliveries` | Placeholder jobs list; **only when** the `deliveries` platform flag is on |
| **Settings** | `/settings/*` | Profile, account, preferences, tour, support |
| **Auth** | `/auth/login`, `/auth/signup` | Clerk (email code + Google), gated by `NEXT_PUBLIC_AUTH_ENABLED` |

Profile-setup (web + mobile) writes `DriverProfile` + `DriverDocument` via `/v1/driver/*`. Ops reviews at `/driver-applications`. The CRM `Driver` marketing table is a different model and is **not** joined yet.

### Env (Infisical)

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_DRIVER_URL` | `http://localhost:3004` / staging / prod |
| `NEXT_PUBLIC_API_URL` | Business API |
| `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_APP_URL` | Optional cross-links |
| `NEXT_PUBLIC_AUTH_ENABLED` | Local-only; not in Infisical |
| `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY`, `DRIVER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` | Required when auth is on |

## Driver mobile (`apps/driver-mobile`)

| Setting | Value |
|---------|-------|
| Expo dev port | **`:8083`** |
| App name / slug / scheme | `Admobi Driver` / `admobihq-driver` / `admobihq-driver` |
| EAS | `@admobimedia/admobihq-driver` (`projectId` in `app.json`) |

Tabs: Dashboard, Deliveries (flag-gated), Earnings, Settings. Off the tab bar: Routes, Payouts, Support. Profile-setup is a 4-step wizard. Clerk mounts when `EXPO_PUBLIC_AUTH_ENABLED=true`. Push registration: `DriverPushToken` + `POST /v1/public/driver-push-tokens`.

```bash
npm run env:pull -w driver-mobile
npm run dev:mobile:driver          # Metro :8083, cleared cache
```

## Deliveries placeholders + the platform flag

Deliveries ships as **placeholder screens behind one ops-controlled platform flag** — visible for demos, hidden otherwise, no redeploy. Distinct from a future per-driver `delivers` opt-in.

| Surface | Route | When flag is off |
|---------|-------|------------------|
| `apps/customer-web` | `(shell)/deliveries` | Redirects to `/` |
| `apps/driver-web` | `(shell)/deliveries` | Redirects to `/` |
| `apps/driver-mobile` | Deliveries tab | Tab hidden |

### Flag storage and API

- **Prisma:** `PlatformFlag` (`key` PK, `enabled`, …) in [schema.prisma](../../apps/web/prisma/schema.prisma), seeded `deliveries: false`. Additive SQL: `npm run db:platform-flags -w web`. **Not** `prisma db push` (would drop Payload tables).
- **Read:** [`GET /v1/public/config`](../../apps/api/app/v1/public/config/route.ts) — `{ flags: { deliveries: boolean } }`. Next.js: `revalidate: 60`. Expo: fetch on launch and AppState foreground.
- **Write:** [`GET/PATCH /v1/flags`](../../apps/api/app/v1/flags/route.ts) — ops JWT, audit entity `platform_flag`.
- Ops web: Settings → Flags. Ops mobile: Settings. Contracts in `@workspace/ops-contracts`; client in `@workspace/ops-api-client`.

## What is still out of scope

- **Real earnings data** — `Device`, `EarningsLedger`, `Payout` models and the aggregation cron ([ROADMAP.md](../shared/ROADMAP.md) milestones 5–6).
- **Payouts** — manual M-Pesa by ops remains the operating mode.
- **CRM join** — `DriverProfile.clerk_user_id` is not linked to the marketing `Driver` row.
- **Real deliveries** — dispatch, job assignment, proof-of-delivery, and per-driver `delivers`.
