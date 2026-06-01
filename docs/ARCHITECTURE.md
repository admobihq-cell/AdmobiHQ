# Admobi — Architecture

How the codebase is laid out, what each part does, and how to extend it without drifting.

## 1. What this is

Admobi sells **LED taxi-top advertising in Kenya** — geotargeted, schedule-flexible. The product story and brand voice live in [PRODUCT.md](../PRODUCT.md). The visual system lives in [DESIGN.md](../DESIGN.md). This repo is the **public marketing site** plus the workspaces that support it. The site itself is the primary product surface today; there is no separate consumer app yet.

## 2. Stack at a glance

- **Next.js 16.1.6** (App Router, Turbopack dev mode) — [apps/web/package.json](../apps/web/package.json)
- **React 19.2** — server components by default, `"use client"` opt-in
- **TypeScript 5.9** — strict, NodeNext at the base, Bundler resolution for Next
- **Tailwind v4** (`@tailwindcss/postcss`) — config-less, all tokens in CSS
- **Turborepo 2.8** — task orchestration across the workspace
- **npm workspaces** (npm 11) — package linking; no pnpm
- **Geist + Geist Mono** via `next/font/google` — wired in [apps/web/app/layout.tsx](../apps/web/app/layout.tsx)
- **react-hook-form + zod** — every form on the site
- **Radix Slot + class-variance-authority** — primitive composition pattern in `@workspace/ui`
- **next-themes** — light/dark mode toggle
- **Node ≥ 20** (engines pin)

## 3. Repo layout

```
.
├── apps/
│   └── web/                         Next.js marketing site
├── packages/
│   ├── ui/                          Shared UI primitives + design tokens
│   ├── eslint-config/               Flat-config ESLint presets
│   └── typescript-config/           Base and Next-flavoured tsconfigs
├── .agents/
│   └── skills/                      Agent skill bundles (impeccable, others)
├── docs/                            This file lives here
├── .github/
│   └── workflows/                   CI: PR checks + merge-to-main
├── PRODUCT.md                       Brand, audience, anti-references
├── DESIGN.md                        Visual system, tokens, anti-patterns
├── turbo.json                       Task graph
├── package.json                     Workspace root, npm scripts
├── tsconfig.json                    Extends @workspace/typescript-config/base
├── .eslintrc.js                     Root ignore patterns only
└── .prettierrc                      Prettier + tailwind plugin
```

Workspaces are declared in [package.json](../package.json):

```json
"workspaces": ["apps/*", "packages/*"]
```

## 4. The web app — `apps/web/`

### 4.1 Routing

App Router. Two top-level groupings:

- [`app/page.tsx`](../apps/web/app/page.tsx) — `/` — the landing page. Renders [`<LandingPage />`](../apps/web/components/landing/landing-page.tsx). **Not** inside the `(marketing)` route group, so it does **not** get the marketing-layout shell; the landing page composes its own `SiteHeader` + sections + `SiteFooter` + `MobileStickyCta`.
- [`app/(marketing)/`](../apps/web/app/(marketing)/) — route group. Its [`layout.tsx`](../apps/web/app/(marketing)/layout.tsx) wraps children with `<SiteHeader />` only. Pages under it:
  - `/drivers` — driver onboarding form
  - `/media-kit` — media kit request form
  - `/partner-fleet` — fleet partner inquiry form
  - `/products-solutions` — static product showcase
  - `/start-campaign` — campaign brief form
  - `/help` — help center index (Payload CMS)
  - `/help/[slug]` — help article (Payload CMS, ISR)

- [`app/(payload)/`](../apps/web/app/(payload)/) — Payload admin and REST API (not wrapped by marketing header):
  - `/admin` — content admin UI
  - `/api/*` — Payload REST handlers (distinct from [`app/api/`](../apps/web/app/api/) form routes)

Help and blog content are defined in [`apps/web/collections/`](../apps/web/collections/) and fetched via [`lib/payload/`](../apps/web/lib/payload/). **Prisma remains the main backend** for leads, drivers, and fleet data; Payload is CMS-only. See [DATA-LAYER.md](./DATA-LAYER.md), [HELP-CMS.md](./HELP-CMS.md), and [BLOG-CMS.md](./BLOG-CMS.md).

Every page is either fully static (SSR/SSG) or a client component for forms. Help and blog routes use ISR (`revalidate = 3600`). Form API routes are server-rendered on demand.

### 4.2 Root layout

[`app/layout.tsx`](../apps/web/app/layout.tsx) wraps every route. It:

1. Loads the Geist + Geist Mono fonts and assigns them to `--font-sans` / `--font-mono` CSS variables.
2. Imports the global stylesheet from `@workspace/ui/globals.css` (which re-exports [packages/ui/src/styles/globals.css](../packages/ui/src/styles/globals.css)).
3. Wraps children in `<ThemeProvider>` (light / dark toggle) and mounts `<WhatsappFab />` so the floating WhatsApp button shows on every route.
4. Sets `<html lang="en" className="scroll-smooth antialiased font-sans">` and global metadata (title template, OG defaults, `locale: "en_KE"`).

### 4.3 API routes

Marketing form handlers live under [`app/api/`](../apps/web/app/api/). They are POST-only, validate with Zod, and persist through **Prisma** where implemented. Payload’s REST API is separate under [`app/(payload)/api/`](../apps/web/app/(payload)/api/) — see [DATA-LAYER.md](./DATA-LAYER.md).

| Route | Purpose | Persistence |
|---|---|---|
| [`/api/drivers`](../apps/web/app/api/drivers/route.ts) | Driver program enrollment | Prisma `drivers` + Resend |
| [`/api/leads`](../apps/web/app/api/leads/route.ts) | Campaign leads or fleet partners | Prisma `leads` / `fleet_partners` + Resend |
| [`/api/media-kit`](../apps/web/app/api/media-kit/route.ts) | Media kit request | Validates only (not persisted yet) |
| [`/api/waitlist`](../apps/web/app/api/waitlist/route.ts) | Waitlist signup | Validates only (not persisted yet) |

When adding persistence to media-kit or waitlist, use **Prisma** (new models in [`prisma/schema.prisma`](../apps/web/prisma/schema.prisma)), not Payload collections.

### 4.4 Components

[`apps/web/components/`](../apps/web/components/) contains the app-specific UI. The two important subdirectories:

#### `components/landing/` — landing page sections, in render order

These are imported by [`landing-page.tsx`](../apps/web/components/landing/landing-page.tsx):

| Component | Renders |
|---|---|
| [`site-header.tsx`](../apps/web/components/landing/site-header.tsx) | Sticky top nav, theme toggle, mobile menu, CTAs |
| [`hero.tsx`](../apps/web/components/landing/hero.tsx) | Centered headline / dual CTA / trust strip / `<RouteSignal />` illustration |
| [`why-taxis.tsx`](../apps/web/components/landing/why-taxis.tsx) | Argument for moving screens + `<StaticVsMoving />` figure |
| [`mission-section.tsx`](../apps/web/components/landing/mission-section.tsx) | Mission copy |
| [`product-section.tsx`](../apps/web/components/landing/product-section.tsx) | `<SystemAnatomy />` (lg) + four-up `<dl>` |
| [`trusted-logos.tsx`](../apps/web/components/landing/trusted-logos.tsx) | Marquee carousel of partner logos |
| [`audiences.tsx`](../apps/web/components/landing/audiences.tsx) | Definition list of buyer segments |
| [`markets.tsx`](../apps/web/components/landing/markets.tsx) | Kenya rollout map / timeline |
| [`process.tsx`](../apps/web/components/landing/process.tsx) | Four-step brief-to-launch flow |
| [`faq.tsx`](../apps/web/components/landing/faq.tsx) | Native `<details>` accordion |
| [`get-started-section.tsx`](../apps/web/components/landing/get-started-section.tsx) | Three CTA cards + waitlist form |
| [`site-footer.tsx`](../apps/web/components/landing/site-footer.tsx) | Footer nav + theme hint |
| [`mobile-sticky-cta.tsx`](../apps/web/components/landing/mobile-sticky-cta.tsx) | Bottom-fixed mobile CTA bar (`lg:hidden`) |
| [`whatsapp-fab.tsx`](../apps/web/components/landing/whatsapp-fab.tsx) | Sitewide floating WhatsApp chat button (mounted in root layout, not just landing) |

Plus three building blocks:

- [`container.tsx`](../apps/web/components/landing/container.tsx) — `max-w-72rem` centered wrapper used by every section.
- [`logo.tsx`](../apps/web/components/landing/logo.tsx) — the Admobi mark: terra signal-wave glyph + `Admobi` wordmark in foreground. Used by site header and footer.
- [`in-view.tsx`](../apps/web/components/landing/in-view.tsx) — `"use client"` IntersectionObserver wrapper that flips `data-visible="true"` on its host when scrolled into view. Drives the animation gates in `globals.css`.
- [`system-illustration.tsx`](../apps/web/components/landing/system-illustration.tsx) — semantic SVG primitives used in three places: `<RouteSignal />` (Hero — taxi-top LED + brand-kit UI chips), `<SystemAnatomy />` (Product section — four-node horizontal flow), `<StaticVsMoving />` (Why Taxis — comparison diagram).

#### `components/`

- [`theme-provider.tsx`](../apps/web/components/theme-provider.tsx) — `next-themes` provider.
- [`theme-toggle.tsx`](../apps/web/components/theme-toggle.tsx) — light/dark switch button.

## 5. Shared workspaces — `packages/`

### 5.1 `@workspace/ui` — [packages/ui/](../packages/ui/)

Re-exported via [packages/ui/package.json](../packages/ui/package.json) under three entry points that consumers import directly:

- `@workspace/ui/components/...` → [packages/ui/src/components/](../packages/ui/src/components/)
- `@workspace/ui/lib/utils` → [packages/ui/src/lib/utils.ts](../packages/ui/src/lib/utils.ts) (the `cn()` helper)
- `@workspace/ui/globals.css` → [packages/ui/src/styles/globals.css](../packages/ui/src/styles/globals.css)

**Primitives currently exported:**

- [`button.tsx`](../packages/ui/src/components/button.tsx) — CVA variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`); sizes (`xs`, `sm`, `default`, `lg`, `icon`, `icon-sm`, `icon-lg`); supports `asChild` via Radix `Slot`.
- [`input.tsx`](../packages/ui/src/components/input.tsx) — text input with focus-visible and `aria-invalid` styling.
- [`label.tsx`](../packages/ui/src/components/label.tsx) — form label with peer-disabled treatment.

To add a new primitive, drop the file under `packages/ui/src/components/` and consume it from `@workspace/ui/components/<name>`. Next.js transpiles the package via `transpilePackages: ["@workspace/ui"]` in [next.config.mjs](../apps/web/next.config.mjs).

### 5.2 `@workspace/eslint-config` — [packages/eslint-config/](../packages/eslint-config/)

Flat-config presets:

- [`base.js`](../packages/eslint-config/base.js) — `@eslint/js` recommended + Prettier + `typescript-eslint` recommended + `eslint-plugin-turbo` + `only-warn`.
- [`next.js`](../packages/eslint-config/next.js) — base + `@next/eslint-plugin-next` (recommended + core-web-vitals) + `eslint-plugin-react` + `eslint-plugin-react-hooks`.
- `react-internal.js` — base + React + Hooks + browser globals (not used by `apps/web`).

The web app consumes it via [apps/web/eslint.config.js](../apps/web/eslint.config.js):

```js
import { nextJsConfig } from "@workspace/eslint-config/next-js"
export default nextJsConfig
```

### 5.3 `@workspace/typescript-config` — [packages/typescript-config/](../packages/typescript-config/)

- `base.json` — ES2022 target, NodeNext module, strict, declaration maps, `noUncheckedIndexedAccess`.
- `nextjs.json` — extends base, switches to ESNext + Bundler resolution, preserves JSX, `noEmit`, Next.js plugin.

[apps/web/tsconfig.json](../apps/web/tsconfig.json) extends `nextjs.json` and adds two path aliases — `@/*` for local files and `@workspace/ui/*` for the package source.

## 6. Design system

The whole visual system is tokens in CSS. There is no design-system JS module to import; you reach for Tailwind utilities that resolve to tokens.

### 6.1 Tokens — [packages/ui/src/styles/globals.css](../packages/ui/src/styles/globals.css)

Two themes (`:root` light, `.dark`) defined in **OKLCH** with the same role names: `--background`, `--foreground`, `--primary` (terra), `--muted`, `--accent`, `--border`, `--ring`, `--destructive`, `--card`, `--popover`, plus a five-step chart palette and a sidebar set. Radius cascades from `--radius: 0.625rem` through `sm` to `4xl`. Easing has one shared variable, `--ease-out-strong`.

Three motion keyframes ship with the file: `route-draw`, `fade-rise`, `signal-pulse`. They activate via `[data-visible="true"]` selectors and are wrapped in `@media (prefers-reduced-motion: no-preference)`. The marquee on the trusted-logos section has its own `trusted-logo-marquee` keyframe.

### 6.2 Color strategy

Per [DESIGN.md](../DESIGN.md): **Committed** — one saturated terracotta primary carries actions and key headings; neutrals are tinted (no pure black or white). Dark mode is a mirror, not a competing aesthetic.

### 6.3 Typography

Geist sans for headings + body. Geist Mono for short labels and codes. Modular scale, fluid `clamp()` is fair game in section headlines.

### 6.4 Brand kit

[apps/web/public/brand/admobi-brand-kit.png](../apps/web/public/brand/admobi-brand-kit.png) — 3×3 identity overview: logo, construction, browser mock, tagline, palette, type, taxi-top LED unit, Nairobi at dusk, UI elements. Treat it as canonical for visual decisions.

## 7. Forms and data flow

Every form follows the same pattern:

1. **Client component** declares a Zod schema.
2. Uses `useForm({ resolver: zodResolver(schema) })` from `react-hook-form`.
3. On submit, `fetch` the matching `/api/<route>` with `JSON.stringify(values)`.
4. API handler validates the body with the **same shape** of schema (defined again in the route file), returns `{ ok: true }` or a 400 with the Zod error.
5. The client flips into a success state in local React state. No global form store, no toast library.

Forms live in the page files themselves: [`drivers/page.tsx`](../apps/web/app/(marketing)/drivers/page.tsx), [`partner-fleet/page.tsx`](../apps/web/app/(marketing)/partner-fleet/page.tsx), [`start-campaign/page.tsx`](../apps/web/app/(marketing)/start-campaign/page.tsx), [`media-kit/page.tsx`](../apps/web/app/(marketing)/media-kit/page.tsx), plus the waitlist form inline in [`get-started-section.tsx`](../apps/web/components/landing/get-started-section.tsx).

The `zod` version is pinned to `3.25.76` via a workspace-root [package.json](../package.json) `overrides` block, so every transitive dependency uses the same Zod.

## 8. Build, dev, lint, typecheck

All orchestrated by Turbo. Run from the repo root:

```bash
npm run dev        # turbo dev — web uses webpack + Payload import map fix
npm run build      # turbo build — production build, depends on ^build for packages
npm run lint       # turbo lint
npm run typecheck  # turbo typecheck
npm run format     # prettier + tailwind plugin
```

Full local setup (Infisical, database, Payload, seeds): [DEV-SETUP.md](./DEV-SETUP.md).

Task graph in [turbo.json](../turbo.json) gives `build` a `^build` dependency (build packages first), caches Turbo outputs to `.next/**` (excluding the cache subdir), and marks `dev` non-cached + persistent.

Per-app commands also work directly:

```bash
cd apps/web
npx next dev
npx next build
npx tsc --noEmit
npx eslint .
```

## 9. CI / CD

Two workflows under [.github/workflows/](../.github/workflows/):

- [`pr.yml`](../.github/workflows/pr.yml) — runs on PR open / synchronize / reopen against `master`. Node 20 + npm cache + Turbo cache → `npm ci` → `typecheck` → `lint` → `build`.
- [`main.yml`](../.github/workflows/main.yml) — same job, triggered on push to `master`. Has a placeholder deploy step (commented out) ready for a Vercel token.

Both set `TURBO_UI=false` for non-interactive output.

## 10. Configuration files

- [tsconfig.json](../tsconfig.json) — root tsconfig, only extends `@workspace/typescript-config/base.json`. Per-app configs override `module` / `moduleResolution`.
- [.eslintrc.js](../.eslintrc.js) — root ignore patterns only (`node_modules`, `.next`, `dist`, `.turbo`, `coverage`); the actual lint rules live in each workspace's `eslint.config.js`.
- [.prettierrc](../.prettierrc) — LF line endings, no semicolons, double quotes, 2-space indent, `printWidth: 80`, `prettier-plugin-tailwindcss` with `tailwindStylesheet` pointed at [globals.css](../packages/ui/src/styles/globals.css), and `tailwindFunctions` set to `["cn", "cva"]` so class merging utilities get auto-sorted.

## 11. Skills system — `.agents/skills/`

Multiple skill bundles are checked into the repo. The actively used one is **`impeccable`** ([.agents/skills/impeccable/](../.agents/skills/impeccable/)) — the design skill invoked via `/impeccable`. It reads [PRODUCT.md](../PRODUCT.md) and [DESIGN.md](../DESIGN.md) for project context, then loads register-specific references (brand vs product) plus a command reference per sub-command (`craft`, `shape`, `audit`, `polish`, et al.).

Other skill folders present: `brandkit`, `design-taste-frontend`, `find-skills`, `frontend-design`, `full-output-enforcement`, `gpt-taste`, `high-end-visual-design`, `industrial-brutalist-ui`, `minimalist-ui`, `redesign-existing-projects`, `shadcn`, `stitch-design-taste`, `web-design-guidelines`. They are not loaded by default; they exist as a library agents can read from.

[`skills-lock.json`](../skills-lock.json) at the repo root pins the synced skill versions.

## 12. Environment

[apps/web/.env.local](../apps/web/.env.local) — local-only, gitignored. Keys currently defined (values not in this doc):

- `INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET` / `INFISICAL_PROJECT_ID` — Infisical secret manager credentials.
- `RESEND_FROM_EMAIL` — the From address for transactional email (Resend integration is wired or in progress).
- `NODE_ENV` — standard.

There are no public `NEXT_PUBLIC_*` env vars yet; nothing leaks to the client at runtime.

## 13. Design constraints (don't drift)

These are the bans contributors most commonly trip over. Full list lives in PRODUCT.md, DESIGN.md, and the impeccable skill references.

From [PRODUCT.md](../PRODUCT.md):

- No generic "OOH dashboard" dark-blue hero templates.
- No stock "big number + tiny label" SaaS hero metrics.
- No neon crypto aesthetic, gradient text, decorative glass cards, left-edge accent stripes.

From [DESIGN.md](../DESIGN.md):

- No gradient text, glassmorphism, identical four-up icon cards, modal-first forms, side-stripe border accents.
- No fake dashboard screenshots in hero or section visuals — use semantic SVG or photography slots.
- Motion: transform/opacity only, ease-out only, never animate width/height/margin/top.

From the impeccable shared design laws:

- No em-dashes in copy (use commas, colons, periods, parentheses).
- No `#000` or `#fff`; tint every neutral toward the brand hue.
- Body line length capped at 65–75ch.

## 14. Adding things

### 14.1 New landing section

1. Create `apps/web/components/landing/<name>.tsx`. Server component by default; import `Container` and use the existing token classes (`text-foreground`, `text-muted-foreground`, `text-primary`, `bg-background`, `border-border`).
2. Add the import + `<NewSection />` in [`landing-page.tsx`](../apps/web/components/landing/landing-page.tsx) at the desired position.
3. If it needs scroll-anchoring, give the outer `<section>` an `id` and `scroll-mt-20`.

### 14.2 New marketing page

1. Create `apps/web/app/(marketing)/<route>/page.tsx`. It picks up the marketing layout (which renders `SiteHeader`) automatically.
2. If it's a form page, follow the existing pattern: Zod schema + `react-hook-form` + POST to `/api/<endpoint>`.
3. If it needs new server logic, add `apps/web/app/api/<endpoint>/route.ts` exporting a `POST` function. Re-declare the Zod schema there; validate inside the handler.

### 14.3 New shared primitive

1. Add it under `packages/ui/src/components/`.
2. Import it in app code as `@workspace/ui/components/<name>` — `transpilePackages` in [next.config.mjs](../apps/web/next.config.mjs) handles the rest.
3. If it carries variants, use `class-variance-authority`. If it needs the `asChild` pattern, use `@radix-ui/react-slot`. Existing examples are in [button.tsx](../packages/ui/src/components/button.tsx).

### 14.4 New motion

1. Add the `@keyframes` block to [globals.css](../packages/ui/src/styles/globals.css) inside the existing `@media (prefers-reduced-motion: no-preference)` clause.
2. Trigger it via a `data-visible="true"` selector if it should run only on scroll-into-view; use the [`<InView>`](../apps/web/components/landing/in-view.tsx) wrapper component to set that attribute.
3. Use `var(--ease-out-strong)` for timing. No bounce, no elastic.

### 14.5 New design token

Don't, unless absolutely necessary. The existing palette is intentionally tight. If you do, add it inside both `:root` and `.dark` in [globals.css](../packages/ui/src/styles/globals.css) and re-expose it under `@theme inline { --color-<name>: var(--<name>); }` so Tailwind utilities can resolve it.
