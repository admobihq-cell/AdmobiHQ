# Admobi

Monorepo for **Admobi**: the public marketing site, business API, internal ops console, and related apps for digital taxi-top OOH in Kenya.

## Requirements

- **Node.js** 20 or newer (`engines` in root `package.json`)
- **npm** 11.x (the repo declares `"packageManager": "npm@11.12.1"`)
- **Infisical CLI** (optional) — for `npm run dev` auto-pull; see [docs/DEV-SETUP.md](docs/DEV-SETUP.md)

## Repository layout

| Path | Role | Local port |
|------|------|------------|
| `apps/web` | Next.js marketing site + Payload CMS | `:3000` |
| `apps/api` | Business REST API (`/v1`, `/v1/public`) | `:3003` |
| `apps/ops` | Internal ops console (Clerk, UI only) | `:3001` |
| `apps/app` | Customer product scaffold | `:3002` |
| `apps/mobile` | Expo ops mobile app | Expo |
| `packages/ui` | Shared design system (Tailwind v4, shadcn/Radix) |
| `packages/ops-api-client` | Typed HTTP client for admin + public API URLs |
| `packages/ops-contracts` | Shared Zod schemas and DTOs |
| `packages/eslint-config` | Workspace ESLint presets |
| `packages/typescript-config` | Shared `tsconfig` bases |

**Turbo** orchestrates scripts across workspaces (`turbo.json`).

Product and design intent: **`PRODUCT.md`** and **`DESIGN.md`** at the repo root.

## Setup

**Full guide:** [`docs/DEV-SETUP.md`](docs/DEV-SETUP.md) (Infisical, Postgres, Prisma, Payload, API, seeds).

From the repository root:

```bash
npm ci
infisical login && cd apps/web && infisical init   # one-time
npm run dev                                        # pull secrets + start web, api, ops, app
```

| URL | What |
|-----|------|
| http://localhost:3000 | Marketing site |
| http://localhost:3000/admin | Payload CMS |
| http://localhost:3003 | Business API |
| http://localhost:3001 | Ops console |
| http://localhost:3002 | Customer app scaffold |

Skip Infisical pull if `.env.local` files already exist: `npm run dev:skip-pull`.

## Run

| Command | Purpose |
|---------|---------|
| `npm run dev` | Pull Infisical dev secrets + start web, api, ops, app |
| `npm run dev:all` | Same + mobile (Expo) |
| `npm run dev:skip-pull` | Start apps without re-pulling secrets |
| `npm run dev -w web` | Single app (replace `web` with `api`, `ops`, `app`) |
| `npm run build` | Production build (Turbo, all workspaces) |
| `npm run env:pull` | Pull secrets to all apps' `.env.local` |

## Quality scripts

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint via Turbo |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run format` | Prettier write |

## Environment variables

Secrets live in **Infisical** and are exported to each app's `.env.local`. Templates: [`.env.example`](.env.example), [`apps/api/.env.example`](apps/api/.env.example).

Key vars:

- **`NEXT_PUBLIC_API_URL`** — business API origin (web, ops, app, mobile)
- **`DATABASE_URL`** — shared Neon Postgres (web + api; ops for server-rendered stats)
- **`PAYLOAD_SECRET`** — Payload CMS (web only)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full per-Vercel-project matrix.

## CI

Pull requests to **`master`** run install, typecheck, lint, and build (`.github/workflows/pr.yml`).

## Further reading

| Doc | Contents |
|-----|----------|
| [docs/DEV-SETUP.md](docs/DEV-SETUP.md) | Local dev, Infisical, database, seeds |
| [docs/API.md](docs/API.md) | Business API routes and deployment |
| [docs/OPS-ADMIN.md](docs/OPS-ADMIN.md) | Ops console |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel, Infisical, domains |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Repo layout and conventions |
| [docs/DATA-LAYER.md](docs/DATA-LAYER.md) | Prisma vs Payload |
| [PRODUCT.md](PRODUCT.md) | Audience, positioning, tone |
| [DESIGN.md](DESIGN.md) | Visual system for marketing |
