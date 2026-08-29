# Admobi

Monorepo for **Admobi**: the public marketing site, business API, internal ops console, driver app, and related apps for GPS-verified taxi-top OOH advertising in Kenya.

## Requirements

- **Node.js** 22 or newer (`engines` in root `package.json`)
- **npm** 11.x (the repo declares `"packageManager": "npm@11.12.1"`)
- **Infisical CLI** (optional) — for `npm run dev` auto-pull; see [docs/shared/DEV-SETUP.md](docs/shared/DEV-SETUP.md)

## Repository layout

| Path | Role | Local port |
|------|------|------------|
| `apps/web` | Next.js marketing site + Payload CMS | `:3000` |
| `apps/api` | Business REST API (`/v1`, `/v1/public`) | `:3003` |
| `apps/ops` | Internal ops console (Clerk, UI only) | `:3001` |
| `apps/customer-web` | Advertiser web app | `:3002` |
| `apps/driver-web` | Driver web app (earnings, routes, payouts) | `:3004` |
| `apps/ops-mobile` | Expo ops mobile app (Clerk) | Expo `:8081` |
| `apps/customer-mobile` | Expo customer app (Clerk, flag-gated) | Expo `:8082` |
| `apps/driver-mobile` | Expo driver app (Clerk, flag-gated) | Expo `:8083` |
| `packages/ui` | Shared design system (Tailwind v4, shadcn/Radix, mapcn) |
| `packages/geo` | Nairobi corridor / coverage map fixtures |
| `packages/ops-api-client` | Typed HTTP client for admin + public API URLs |
| `packages/ops-contracts` | Shared Zod schemas and DTOs |
| `packages/query-client` | Shared TanStack Query client + provider |
| `packages/sentry-config` | Shared Sentry init helpers |
| `packages/vitest-config` | Shared Vitest config |
| `packages/eslint-config` | Workspace ESLint presets |
| `packages/typescript-config` | Shared `tsconfig` bases |

**Turbo** orchestrates scripts across workspaces (`turbo.json`).

Product and design intent: **`PRODUCT.md`** and **`DESIGN.md`** at the repo root.

## Setup

**Full guide:** [`docs/shared/DEV-SETUP.md`](docs/shared/DEV-SETUP.md) (Infisical, Postgres, Prisma, Payload, API, seeds).

From the repository root:

```bash
npm ci
infisical login && cd apps/web && infisical init   # one-time
npm run dev                                        # pull secrets + start web, api, ops, customer-web, driver-web
```
 
| URL | What |
|-----|------|
| http://localhost:3000 | Marketing site |
| http://localhost:3000/admin | Payload CMS |
| http://localhost:3003 | Business API |
| http://localhost:3001 | Ops console |
| http://localhost:3002 | Customer app |
| http://localhost:3004 | Driver app |

Skip Infisical pull if `.env.local` files already exist: `npm run dev:skip-pull`.

## Run

| Command | Purpose |
|---------|---------|
| `npm run dev` | Pull Infisical dev secrets + start web, api, ops, customer-web, driver-web |
| `npm run dev:all` | Same + ops-mobile, customer-mobile, driver-mobile (Expo) |
| `npm run dev:web` / `dev:ops` / `dev:customer-web` / `dev:driver-web` | Single app — `api` is co-started automatically via Turborepo's `with` graph, since it's shared by every frontend |
| `npm run dev:stack:mobile` | API + all three Expo apps only (pulls api/mobile secrets) |
| `npm run dev:stack:mobile:ops` | API + ops Expo only |
| `npm run dev:stack:mobile:customer` | API + customer Expo only |
| `npm run dev:stack:mobile:driver` | API + driver Expo only |
| `npm run dev:mobile` | Ops Expo with cleared Metro cache (:8081) |
| `npm run dev:mobile:customer` | Customer Expo with cleared Metro cache (:8082) |
| `npm run dev:mobile:driver` | Driver Expo with cleared Metro cache (:8083) |
| `npm run mobile:apk:eas` | Build all three preview APKs on EAS (shareable, no Metro) |
| `npm run dev:skip-pull` | Start apps without re-pulling secrets |
| `npm run build` | Production build (Turbo, all workspaces) |
| `npm run env:pull` | Pull secrets to all apps' `.env.local` |

Only run one `npm run dev*` stack at a time — a second instance collides with the first on the same ports (`web` :3000, `ops` :3001, `customer-web` :3002, `api` :3003, `driver-web` :3004) and can take down both.

## Quality scripts

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint via Turbo |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run format` | Prettier write |

## Environment variables

Secrets live in **Infisical** and are exported to each app's `.env.local`. Templates: [`.env.example`](.env.example), [`apps/api/.env.example`](apps/api/.env.example).

Key vars:

- **`NEXT_PUBLIC_API_URL`** / **`EXPO_PUBLIC_API_URL`** — business API origin (every web + mobile app)
- **`NEXT_PUBLIC_DRIVER_URL`** / **`EXPO_PUBLIC_DRIVER_URL`** — driver-web origin (driver-mobile, ops apps that link out to it)
- **`DATABASE_URL`** — shared Neon Postgres (web + api; ops for server-rendered stats)
- **`PAYLOAD_SECRET`** — Payload CMS (web only)

See [docs/shared/DEPLOYMENT.md](docs/shared/DEPLOYMENT.md) for the full per-Vercel-project matrix.

## CI

Pull requests to **`master`** run install, typecheck, lint, and build (`.github/workflows/pr.yml`).

## Further reading

Docs are organized under `docs/` by app — `docs/shared/` (repo-wide), `docs/web/`, `docs/api/`, `docs/ops/`, `docs/customer/`, `docs/driver/`.

| Doc | Contents |
|-----|----------|
| [docs/shared/DEV-SETUP.md](docs/shared/DEV-SETUP.md) | Local dev, Infisical, database, seeds |
| [docs/api/API.md](docs/api/API.md) | Business API routes and deployment |
| [docs/ops/OPS-ADMIN.md](docs/ops/OPS-ADMIN.md) | Ops console |
| [docs/customer/APP.md](docs/customer/APP.md) | Customer web app |
| [docs/customer/APP-MOBILE.md](docs/customer/APP-MOBILE.md) | Customer Expo app (Clerk, flag-gated) |
| [docs/ops/MOBILE-OPS.md](docs/ops/MOBILE-OPS.md) | Ops Expo app (Clerk, always on) |
| [docs/driver/DRIVER-APP.md](docs/driver/DRIVER-APP.md) | Driver web + Expo app, platform flags |
| [docs/shared/MOBILE-BUILDS.md](docs/shared/MOBILE-BUILDS.md) | APK builds, EAS, OTA updates |
| [docs/shared/DEPLOYMENT.md](docs/shared/DEPLOYMENT.md) | Vercel, Infisical, domains, EAS mobile |
| [docs/shared/ARCHITECTURE.md](docs/shared/ARCHITECTURE.md) | Repo layout and conventions |
| [docs/shared/DATA-LAYER.md](docs/shared/DATA-LAYER.md) | Prisma vs Payload |
| [docs/shared/ROADMAP.md](docs/shared/ROADMAP.md) | Actor-by-actor product roadmap |
| [docs/shared/AUDIT-VALUATION.md](docs/shared/AUDIT-VALUATION.md) | Technical audit + KES reconstructive-cost valuation |
| [docs/shared/FEATURE-INVENTORY.md](docs/shared/FEATURE-INVENTORY.md) | Every route/screen, integration, and architectural decision, with citations |
| [PRODUCT.md](PRODUCT.md) | Audience, positioning, tone |
| [DESIGN.md](DESIGN.md) | Visual system for marketing |
