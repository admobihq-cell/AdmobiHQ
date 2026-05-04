# Admobi

Monorepo for **Admobi**: the public marketing site and related UI for digital taxi-top OOH in Kenya (campaign leads, fleet partners, drivers, media kit). The main application is a **Next.js** app that consumes a shared **shadcn/ui**–style package.

## Requirements

- **Node.js** 20 or newer (`engines` in root `package.json`)
- **npm** 11.x (the repo declares `"packageManager": "npm@11.12.1"`)

## Repository layout

| Path | Role |
|------|------|
| `apps/web` | Next.js 16 app (App Router): landing page, marketing routes, API routes for lead forms |
| `packages/ui` | Shared design system: Tailwind v4, Radix/shadcn components, `globals.css`, tokens |
| `packages/eslint-config` | Workspace ESLint presets |
| `packages/typescript-config` | Shared `tsconfig` bases for Next.js and libraries |

**Turbo** orchestrates scripts across workspaces (`turbo.json`). The web app imports UI via `@workspace/ui/*` (see `apps/web/tsconfig.json`).

### Marketing routes (`apps/web/app`)

- `/` — Landing (`LandingPage` + sections under `components/landing`)
- `/products-solutions`, `/media-kit`, `/drivers`, `/start-campaign`, `/partner-fleet` — Routed through the `(marketing)` segment so they share `SiteHeader` in `(marketing)/layout.tsx`
- `/api/*` — Form/API handlers (e.g. waitlist, leads, media-kit, drivers)

Product and design intent for copy and UX lives in **`PRODUCT.md`** and **`DESIGN.md`** at the repo root.

## Setup

From the repository root:

```bash
npm ci
```

Use `npm install` locally if you are not reproducing CI exactly.

## Run

### All dev tasks (Turbo)

Starts every workspace `dev` script (today that is mainly the web app):

```bash
npm run dev
```

### Web app only

```bash
npm run dev -w web
```

The site defaults to **http://localhost:3000** (Next.js).

### Production build

From root (builds dependencies in order):

```bash
npm run build
```

Web app only:

```bash
npm run build -w web
npm run start -w web
```

## Quality scripts

Run from the repo root:

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint via Turbo |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run format` | Prettier write |

## Environment variables

There is **no committed `.env` template**. If you use integrations that read secrets (email, CRM, analytics), add **`apps/web/.env.local`** as needed; Next.js loads it automatically for the web app.

API routes in this repo do not currently depend on `process.env` for basic local development of the forms.

## CI

Pull requests targeting **`master`** run install, typecheck, lint, and build (see `.github/workflows/pr.yml`). **`TURBO_UI`** is disabled in CI so Turbo does not require an interactive terminal.

## Adding shadcn/ui components

Components live in **`packages/ui`** and are consumed by the web app. From the repo root you can target the UI package with your usual shadcn CLI workflow; typical pattern:

```bash
cd packages/ui
npx shadcn@latest add <component>
```

There is also **`apps/web/components.json`** if you add components scoped to the app—prefer extending **`packages/ui`** for shared primitives so both stay aligned.

Example import in the web app:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Further reading

- **`PRODUCT.md`** — Audience, positioning, tone
- **`DESIGN.md`** — Structure, anchors, layout notes for the marketing site
