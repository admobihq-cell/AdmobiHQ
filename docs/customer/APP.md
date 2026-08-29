# Customer web app (`apps/customer-web`)

Advertiser product at **`app.admobihq.com`**. Mobile twin: [APP-MOBILE.md](./APP-MOBILE.md). Auth: [AUTH.md](../shared/AUTH.md).

**Deployment:** [DEPLOYMENT.md](../shared/DEPLOYMENT.md) · **Local dev:** [DEV-SETUP.md](../shared/DEV-SETUP.md)

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://app.admobihq.com` |
| Staging | `https://app.staging.admobihq.com` |
| Local dev | `http://localhost:3002` |
| Business API | `https://api.admobihq.com` (prod), `http://localhost:3003` (local) |

## Current scope

Sidebar app shell. What is real vs placeholder:

| Route | Status |
|-------|--------|
| `/` Overview | Working UI (local/demo numbers, not API stats) |
| `/campaigns`, `/campaigns/[id]` | Working UI + create form; **local demo store** (`getCampaigns()`), not Prisma |
| `/map` | mapcn/MapLibre with `@workspace/geo` Nairobi fixtures |
| `/deliveries`, `/deliveries/[id]` | Placeholder booking UI, **only when** the `deliveries` platform flag is on |
| `/reports` | **Coming soon** |
| `/settings/billing` | Wallet/billing view (no payment gateway) |
| `/settings/support`, `/settings/support/[id]` | Support cases via the business API |
| `/settings/account`, `/settings/notifications`, `/settings/tour` | Working UI |
| `/auth/login`, `/auth/signup`, … | Clerk (email code + Google), gated by `NEXT_PUBLIC_AUTH_ENABLED` |

Announcements inbox and support hit `/v1/customer/*` and `/v1/public/support*` when auth is on. Campaign booking APIs are still [ROADMAP.md](../shared/ROADMAP.md) milestone 2/4.

- `GET /api/health` on this app for deploy smoke tests (separate from `api.admobihq.com/v1/health`)
- Builds & APKs: [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md)

## Secrets (Infisical)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Recommended | `http://localhost:3002` (dev), `https://app.admobihq.com` (prod) |
| `NEXT_PUBLIC_WEB_URL` | Optional | Link back to marketing site |
| `NEXT_PUBLIC_OPS_URL` | Optional | Cross-link to ops console |
| `NEXT_PUBLIC_API_URL` | Yes (for support, announcements, flags) | Business API origin |
| `NEXT_PUBLIC_AUTH_ENABLED` | Local-only, not in Infisical | Gates whether Clerk mounts at all — see [AUTH.md](../shared/AUTH.md) §4 |
| `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` | Required when auth is enabled | Customer Clerk instance — see [AUTH.md](../shared/AUTH.md) §4 |

No database vars on this app — Prisma lives in `apps/api` / `apps/web`. Auth is the one exception, see [AUTH.md](../shared/AUTH.md).

### Pull locally

```bash
npm run env:pull -w customer-web
npm run env:check -w customer-web
npm run dev:customer-web
```

Or start with all core apps: `npm run dev`.

## Vercel

Separate Vercel project (third customer-facing app; fourth in the monorepo):

| Setting | Value |
|---------|--------|
| Root Directory | `apps/customer-web` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build | `cd ../.. && npm run build -w customer-web` if default fails |

Sync **only app env vars** from Infisical — not the full web secret set. Include customer Clerk keys when `NEXT_PUBLIC_AUTH_ENABLED=true`.

Domains: `app.admobihq.com` (prod), `app.staging.admobihq.com` (`staging` branch).
