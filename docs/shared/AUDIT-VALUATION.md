# Admobi — Technical Audit & Reconstructive Cost Valuation

Ground-truth architectural audit of the Admobi monorepo, compiled by direct repository inspection (`git ls-files`, package manifests, GitHub Actions, EAS/Vercel config) on 2026-08-27, followed by a reconstructive-cost valuation in Kenya Shillings (KES) for balance-sheet purposes.

Deployment and caching facts in §4 (and the middleware count in §2) were updated 2026-08-29 to match current `vercel.json`, Fluid CPU mitigations, and marketing Edge probe middleware.

**Line counts, the workspace table, and the KES ledger were re-derived 2026-08-30** after `graphify-out/` was moved out of version control (it had been ~83% of the tracked repo) and after a week of feature work — the campaign calendar, the cross-app notifications system and dedicated `/notifications` pages, per-item read APIs, and the ops home header. Methodology is unchanged from the 2026-08-27 snapshot; `apps/web` is now measured with the generated `public/app-demo/` Expo web export fully excluded.

Also published as an interactive report: [Admobi Reconstruction Ledger](https://claude.ai/code/artifact/70be5f48-5458-46db-8e93-f181391cdc33) (reflects the 2026-08-27 figures; this document supersedes it).

**Headline numbers:** 96,053 real lines of code · 8 apps / 9 shared packages · 6 test files repo-wide · 22 Prisma models + 5 CMS collections · KES 50.7M point-estimate valuation (range KES 45.3M–66.9M).

---

## 1. Architectural Overview & Lines of Code

The repository carries **422,259** tracked lines across **1,964** files (`git ls-files`, 2026-08-30). That number dropped from the 3,022,965 / 2,187 recorded on 2026-08-27 because `graphify-out/` — the cached output of a knowledge-graph tool, previously ~2.5M lines and 83% of the tracked repo, including a duplicate copy inside `apps/web/graphify-out/` — is now gitignored and untracked. Even at 422K, the headline is not a measure of engineering effort.

> **What the 422K still includes that isn't product code.** 37,214 lines are the `package-lock.json` dependency manifest; ~16,400 lines are `.agents/` and `.claude/` Claude Code agent-skill markdown, not product code; ~29,400 lines are documentation; and `apps/web/public/app-demo/` is a generated Expo web export (~7,900 lines). None belongs in a reconstruction-cost estimate.

Stripping generated artifacts, lockfiles, tooling scaffolding, binary assets, and config down to genuine hand-written TypeScript/TSX/JavaScript across the eight applications and nine shared packages leaves a real, defensible codebase of:

| Metric | Value |
|---|---|
| Real application + package code | **96,053 lines** |
| Config & build wiring | ~6,600 lines |
| Documentation | 29,394 lines |
| Test code | 337 lines / 6 files |

### Real code by workspace (TypeScript / TSX / JS only)

| Workspace | Role | Lines |
|---|---|---:|
| `apps/ops-mobile` | Expo ops app | 17,065 |
| `apps/web` | Marketing site + Payload CMS | 15,317 |
| `apps/ops` | Ops console | 11,073 |
| `apps/customer-mobile` | Expo customer app | 10,088 |
| `apps/driver-mobile` | Expo driver app | 9,218 |
| `apps/api` | Business REST API | 8,101 |
| `packages/ui` | Design system | 7,998 |
| `apps/customer-web` | Advertiser web console | 6,976 |
| `apps/driver-web` | Driver web console | 5,885 |
| `packages/ops-contracts` | Zod DTOs | 1,400 |
| `scripts/` & root tooling | Dev/build scripts | 1,438 |
| `packages/ops-api-client` | Typed HTTP client | 727 |
| `packages/geo` | Nairobi map fixtures | 418 |
| `packages/sentry-config, eslint-config, query-client, vitest-config` | Shared tooling | 349 |
| **Total real application code** | | **96,053** |

The 2026-08-30 recount is +1,629 lines net over the 2026-08-27 figure. Growth is concentrated in `packages/ui` (+896: shared `NotificationFeed` / bell / peek / skeleton components), `apps/customer-web` (+1,103: `/notifications` + `/calendar` views and the FullCalendar planner), `apps/driver-web` (+349), `apps/ops` (+344), and `apps/api` (+176: per-item read routes and cursor pagination). `apps/web` reads ~1,500 lower because this count is now strictly everything outside `apps/web/public/` (i.e. the generated `app-demo/` Expo export is fully excluded); its hand-written `app/`, `components/`, `lib/`, and `collections/` code is stable.

### Workspace map

A single GitHub repository, orchestrated by **Turborepo 2.9** over **npm workspaces** (no pnpm), deployed as **five independent Vercel projects** plus **three independent Expo/EAS mobile projects**. Every frontend depends on `apps/api`, which Turborepo co-starts automatically in dev via its task graph.

```
apps/
├── web             Next.js 16.2 + Payload CMS — marketing, blog, help center
├── api             Next.js route handlers only — 68 /v1 endpoints, no UI
├── ops             Ops console — Clerk-gated, calls api for all data
├── customer-web    Advertiser web — demo campaign data, calls API for support/announcements
├── driver-web      Driver web — profile-setup + demo earnings; Deliveries flag-gated
├── ops-mobile      Expo — staff app, Clerk, EAS-built
├── customer-mobile Expo — advertiser app, Clerk (flag-gated), EAS-built
└── driver-mobile   Expo — driver app, Clerk (flag-gated), EAS-built
packages/
├── ui              41 components + OKLCH token system
├── mobile-ui       empty — no source, unused scaffold
├── ops-contracts   Zod schemas / DTOs, ~30-40 definitions
├── ops-api-client  Hand-rolled typed fetch client
├── query-client    Shared TanStack Query defaults
├── geo             Nairobi corridor / coverage fixtures
├── sentry-config, eslint-config, typescript-config, vitest-config
```

---

## 2. Running Apps Audit

Every app builds and runs real routes — nothing in this repository is a bare Next.js placeholder. Readiness diverges sharply once you look past "does it render" to "does it own data yet."

| App | Status | Stack | Auth | Notes |
|---|---|---|---|---|
| `web` | ✅ Production | Next.js 16.2, Payload CMS | Payload admin only | 5 CMS collections, real forms → Prisma, ISR help/blog. Owns the canonical Prisma schema file. |
| `api` | ✅ Production | Next.js (route handlers only) | Clerk, per-route | 68 `/v1` route handlers, 22 Prisma models, one Vercel cron. |
| `ops` | ⚠️ Populated console | Next.js 16.2 | Clerk (`@admobihq.com` only) | ~21 dashboard routes/features (incl. a permission-filtered `/notifications` attention queue) with real loading states; UI-only — every write goes through the API, ops holds no data itself. |
| `customer-web` | ⚠️ UI live, demo data | Next.js 16.2 | Clerk (own instance, flag-gated) | Campaigns/calendar/map/billing/support/notifications render; campaigns are local fixtures, not Prisma. Reports still Coming soon. |
| `driver-web` | ⚠️ UI live, demo earnings | Next.js 16.2 | Clerk (own instance, flag-gated) | Earnings/routes UI real (illustrative numbers); profile-setup hits the API; Deliveries behind the `deliveries` flag. |
| `ops-mobile` | ✅ Production | Expo SDK 54, RN 0.81 | Clerk JWT → api | Real EAS build profiles (dev/preview/production), MapLibre, Sentry RN. |
| `customer-mobile` | ⚠️ Flag-gated | Expo SDK 54, RN 0.81 | Clerk (flag-gated) | Sign-in live behind a flag; EAS configured; also ships a web-export demo build. |
| `driver-mobile` | 🚩 Earliest-stage | Expo SDK 54, RN 0.81 | Clerk (flag-gated) | Same EAS profile shape as the other two, but missing the shared `ops-api-client` dependency they both carry. |

### How the subdomain network actually works

The original brief assumed a shared Next.js middleware layer doing host-based multi-tenant routing. That is not what is built, and the actual answer is more mundane and just as production-viable: **five independent Vercel projects** — `admobihq.com`, `api.admobihq.com`, `ops.admobihq.com`, `app.admobihq.com`, `driver.admobihq.com` — each with its own root directory in the same repo, its own domain assignment in Vercel, and (for three of them) its own independent Clerk application instance.

Four `middleware.ts` files exist in the whole repo: `apps/web` (Edge 404 for scanner/probe paths, no Node/Payload), plus `apps/api`, `apps/customer-web`, and `apps/driver-web` for CORS/session within that one deployment. None does cross-app hostname rewriting. No file anywhere reads `req.headers.get('host')` or routes by subdomain. The "network" is a deployment topology, not a routing algorithm.

---

## 3. Shared Core & Data Infrastructure

### Design system — `@workspace/ui`

**41 components** in a shadcn/Radix-composition style (button, dialog, sheet, table, sidebar, tour-provider, map, chart, and product-specific composites like `auth-split-shell` and the shared `notification-feed` / `notification-bell-button` / `notification-peek` set), plus a full **OKLCH token system** — light and dark themes sharing role names (`--background`, `--primary`, `--muted`, a five-step chart palette, a sidebar palette), a radius scale, and three motion keyframes gated behind `prefers-reduced-motion`. Consumed via three explicit entry points and transpiled directly into Next.js — there is no separate build step.

> **Flagged.** `packages/mobile-ui` — the presumed mobile counterpart — contains **no source code**. It is an empty scaffold (a stray Turbo cache log is the only file present). The three Expo apps currently style themselves independently; there is no shared native design system yet.

### Data layer — two ORMs, one convention

Admobi runs a deliberate split, documented and enforced by convention rather than by database isolation:

| | Prisma (business data) | Payload CMS (editorial) |
|---|---|---|
| Schema | `apps/web/prisma/schema.prisma` | `apps/web/collections/` |
| Models / collections | 22 models | 5 collections |
| Owns | Leads, fleet partners, drivers, waitlist, support cases, audit trail, push tokens, driver profiles | Blog posts, help articles, help categories, media, admin users |
| Consumed by | apps/api (all business routes), apps/ops (server-rendered stats) | apps/web server components only |
| Migration rule | Additive-only on the shared Postgres instance — the team's own docs warn that a careless `db push` on either side can drop the other's tables. | (same) |

### API contract discipline

`@workspace/ops-contracts` defines roughly **30–40 Zod schemas and DTOs** covering the back-office domain: leads, fleet partners, drivers, driver applications, support cases, platform flags, roles, and audit events. `@workspace/ops-api-client` is a hand-rolled typed fetch wrapper — not OpenAPI-generated, not tRPC — built around a generic CRUD-resource factory and Clerk bearer-token injection, consumed by every ops surface (web and mobile) and by the marketing site's public forms. `@workspace/query-client` supplies a shared TanStack Query configuration (30s stale time, single retry) across the React apps.

---

## 4. DevOps, Deployment & Production Hygiene

### Deployment topology

Five Vercel projects deploy from the same repository via Vercel's native Git integration — not via a scripted CI deploy step. Each of the five Next.js apps has a `vercel.json` with `ignoreCommand` (`scripts/vercel-ignore-build.mjs`) so commits that do not touch that app skip a Fluid rebuild. `apps/api/vercel.json` also defines the single daily push-receipts cron. Three Expo/EAS projects carry identical, genuine `development` / `preview` / `production` build profiles. Android release automation exists for all three mobile apps — two sign locally via Gradle keystore, one builds through EAS — publishing APKs to GitHub Releases on tag push. **No iOS release workflow exists yet**, and there is no Dockerfile anywhere in the repository: the deployment path is entirely Vercel- and EAS-native, with no containerized fallback.

### CI/CD

Five GitHub Actions workflows. `pr.yml` and `master.yml` gate every change to `master` with install → `prisma generate` → CMS bootstrap → typecheck → lint → build → unit tests → Playwright e2e. The Vercel deploy step in `master.yml` is written but **commented out** — production deploys currently ride on Vercel's own Git integration rather than this pipeline.

### Testing coverage — the most material gap

> **Finding.** Product-route coverage is still the gap. Six test files repo-wide (337 lines): two Vitest unit tests (`packages/geo`, `packages/ops-contracts`), one Playwright spec asserting unauthenticated marketing pages return 200, and three script tests (`npm run test:scripts`) covering ignore-build, bot-probe paths, and database-URL resolution. There is **zero** handler/UI test coverage for `ops`, `api`, `customer-web`, `driver-web`, or any of the three mobile apps. The `test` task in `turbo.json` is correctly wired into the build graph — it simply has almost nothing to run for the product surfaces.

| | |
|---|---|
| Node | `>=22` (floor-pinned) |
| Package manager | `npm 11.12.1` (exact-pinned) |
| Task orchestration | Turborepo 2.9, `^build` graph |
| Secrets | Infisical, 3 envs × 8 apps |

---

## 5. Reconstructive Cost Valuation — Method A

A replacement-cost appraisal: what it would take a Nairobi-tier senior engineering team to rebuild this system from nothing, priced at local contractor rates. This is a cost floor, not a market or revenue valuation — see the limitations note below.

### Stated assumptions

| | |
|---|---|
| **Basis** | 96,053 lines of real, custom TypeScript/TSX/JS across 8 apps and 9 shared packages — the recounted figure from Section 1 (2026-08-30), not the raw repository line count. |
| **Throughput** | 15 lines/hour per senior engineer, blended for design, type-safe implementation, integration, and deployment configuration in a Next.js + Expo + dual-ORM stack of genuine (not toy) architectural complexity. |
| **Core hours** | 96,053 ÷ 15 ≈ **6,400 hours** of core coding labor. |
| **Team mix** | 1 Senior Lead at KES 7,500/hr + 3 Mid-to-Senior engineers at KES 5,000/hr → blended rate **KES 5,625/hr**. |

### Itemized asset valuation ledger — point estimate (blended team rate)

| Line item | Basis | KES |
|---|---|---:|
| Core engineering coding labor | 6,400 hrs × KES 5,625 | 36,000,000 |
| Multi-tenant & subdomain routing premium | +20% of base labor | 7,200,000 |
| Shared contracts & design primitives premium | +15% of base labor | 5,400,000 |
| **Subtotal — engineering labor** | | **48,600,000** |
| DevOps infrastructure & deployment pipeline capitalization | Flat | 1,200,000 |
| Live production storefront & CMS layer | Flat | 900,000 |
| **Total capitalized value — point estimate** | | **50,700,000** |

The two premiums are levied against real coordination cost even though the "multi-tenant" system turned out to be five discrete deployments rather than a shared router: three independent Clerk instances, cross-app URL/env wiring, and strict deploy-ordering (API first, then every frontend) all cost real engineering hours regardless of the architecture chosen. The DevOps and CMS lines are held deliberately modest, reflecting what Section 4 actually found — deploys still ride on Vercel's Git integration rather than a scripted pipeline, and test-gate depth is minimal.

### Sensitivity range

Holding hours and the two percentage premiums fixed and swapping the labor rate between the two stated bands (rather than blending them) brackets the point estimate:

| Scenario | Rate | Total |
|---|---|---:|
| Low | All Mid-to-Senior, KES 5,000/hr | **KES 45,300,000** |
| Point estimate | Blended team (1 lead + 3 mid-senior) | **KES 50,700,000** |
| High | All Senior Lead, KES 7,500/hr | **KES 66,900,000** |

**Recommended balance-sheet range: KES 45,000,000 – 67,000,000**, intangible assets, with KES 50.7M as the defensible point estimate under the stated blended team assumption.

### Limitations of Method A

This is a replacement-cost floor, not a market, income, or going-concern valuation — it prices the labor to retype this system, not the business built on top of it. It does not capture brand, domain, or customer-relationship value, and it should be read alongside Sections 2–4: customer and driver UIs are still fixture-backed (no campaign/earnings APIs yet), mobile parity is uneven, and test coverage across the platform is close to zero. A buyer or auditor weighing this figure against risk should treat those findings as a discount factor applied on top of, not instead of, the reconstruction cost above.
