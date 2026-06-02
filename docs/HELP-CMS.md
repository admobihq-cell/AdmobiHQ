# Help center CMS (Payload)

The marketing site serves operational help content and the **blog** from **Payload 3**, embedded in [`apps/web`](../apps/web). See [BLOG-CMS.md](./BLOG-CMS.md) for articles with images.

## URLs

| URL | Purpose |
|-----|---------|
| `/help` | Help index with search |
| `/help/[slug]` | Published help article |
| `/admin` | Payload admin (editors only) |

Homepage FAQ remains in [`apps/web/lib/seo/faq-data.ts`](../apps/web/lib/seo/faq-data.ts) for AI citation schema. Help articles are support guides, not duplicate FAQ JSON-LD.

## Environment

For a full command list (Infisical, Prisma, Payload, seeds, troubleshooting), see **[DEV-SETUP.md](./DEV-SETUP.md)**.

Secrets must be visible to the shell that runs `npm` commands. Infisical does **not** inject them automatically unless you use the CLI or a local file.

**Option A — Pull Infisical → local file (recommended on Windows)**

```bash
# From repo root (after infisical login + infisical init)
npm run env:pull -w web
```

Writes `apps/web/.env.local` from Infisical **dev**. Then use normal npm (no `infisical run`):

```bash
npm run db:push -w web
npm run payload:migrate -w web
npm run payload -w web -- create-first-user
npm run seed:help -w web
npm run dev -w web
```

**Option A2 — Infisical run (PowerShell: use `--command`, not `-- npm ...`)**

```powershell
infisical secrets --env=dev
infisical run --env=dev --command "npm run db:push -w web"
infisical run --env=dev --command "npm run payload:migrate -w web"
infisical run --env=dev --command "npm run dev -w web"
```

If `infisical run` returns instantly with no output, the command never started — use **Option A** (`env:pull`) instead.

**Option B — Local file (simplest for daily dev)**

Copy [`.env.example`](../.env.example) to **`apps/web/.env.local`** and paste values from Infisical:

- `DATABASE_URL` — hosted Postgres URL (Neon, Supabase, etc.), **not** `localhost:5432` unless you run Postgres locally
- `PAYLOAD_SECRET` — required; generate with `openssl rand -hex 32`
- `NEXT_PUBLIC_SERVER_URL` — `http://localhost:3000` locally, `https://admobihq.com` in production

CLI scripts load `apps/web/.env.local` automatically via [`lib/load-env.ts`](../apps/web/lib/load-env.ts).

Turbo passes `PAYLOAD_SECRET` and `NEXT_PUBLIC_SERVER_URL` for production builds ([`turbo.json`](../turbo.json)).

## Local setup

**Important — one database, two ORMs:** Prisma owns `leads`, `drivers`, `fleet_partners`. Payload owns `help_*`, `users`, `payload_*`. Neither may run “push” against the whole DB:

| Command | Danger on shared DB |
|---------|---------------------|
| Payload schema push (old default) | Drops Prisma tables |
| `prisma db push` | Drops Payload tables (`help_categories`, etc.) |

Payload uses `push: false` + SQL migrations. **Never run `prisma db push` after Payload migrations exist.**

### Fresh setup (correct order)

```bash
npm install
npm run env:pull -w web
npm run env:check -w web

# 1) Prisma FIRST — only when Payload tables do NOT exist yet
npm run db:push -w web

# 2) Payload migrations (safe for Prisma data)
npm run payload:migrate:create -w web -- --name initial_help_cms
npm run payload:migrate -w web

# 3) Seed (safe to re-run)
npm run seed:help -w web

# 4) Admin user at http://localhost:3000/admin (no create-first-user CLI)
npm run dev -w web
```

### You already ran Payload migrate (your case)

**Skip `npm run db:push`.** It will try to delete `help_categories` and `payload_migrations`. Your form tables (`leads`, etc.) already exist.

```bash
npm run seed:help -w web   # re-run after hook fix
npm run dev -w web
```

Prisma config must live at **`apps/web/prisma.config.ts`** (not `prisma/prisma.config.ts`) — Prisma 7 requirement.

Open `/admin` to sign in, `/help` to preview public pages.

If you need Turbopack for unrelated work, `npm run dev:turbo -w web` may work after `serverExternalPackages` in `next.config.mjs`, but Webpack dev is the supported path with Payload.

## Editorial workflow

1. Create or edit **Help categories** (audience, sort order).
2. Create **Help articles** with title, slug, excerpt, body (Lexical), and category.
3. **Publish** drafts from the admin UI (drafts are hidden on `/help`).
4. ISR (`revalidate = 3600`) refreshes pages; collection hooks also call `revalidatePath` on publish.

Optional SEO fields: `seoTitle`, `seoDescription` per article.

## Migrations vs Prisma

See [DATA-LAYER.md](./DATA-LAYER.md) for the full split (Prisma = main backend, Payload = CMS only).

| Tool | Owns |
|------|------|
| Prisma | `leads`, `drivers`, `fleet_partners` |
| Payload | `help_*`, `blog_*`, `media`, `payload_*` system tables |

Run both migration flows after schema changes. Do not merge schemas into one ORM.

## Payload admin build (`worker_threads` / `child_process`)

Payload always registers `VercelBlobClientUploadHandler` in the admin import map when Vercel Blob storage is enabled. The real handler imports `@payloadcms/plugin-cloud-storage/utilities`, whose barrel re-exports server-only `resolveSignedURLKey` → full `payload` → `pino-pretty` → Node `worker_threads`, which webpack cannot bundle for the browser.

### Defenses (use all of them)

| Layer | What it does |
|-------|----------------|
| `patchVercelBlobClientImport()` in [`payload.config.ts`](../apps/web/payload.config.ts) | Rewrites admin dependency paths so **`payload generate:importmap`** emits the stub import by default. |
| [`lib/payload/vercel-blob-client-stub.tsx`](../apps/web/lib/payload/vercel-blob-client-stub.tsx) | No-op React handler (safe in the browser). |
| [`scripts/fix-importmap.ts`](../apps/web/scripts/fix-importmap.ts) | Post-processes import map if Payload regenerates the bad import (runs on `dev`, `prebuild`, after `generate:importmap`). |
| [`scripts/verify-importmap.ts`](../apps/web/scripts/verify-importmap.ts) | **Fails CI/typecheck** if the bad import returns. |
| [`next.config.mjs`](../apps/web/next.config.mjs) | Webpack aliases, module replacement, client fallbacks; **Turbopack** `resolveAlias` for `dev:turbo`. |
| `clientUploads: false` | Server-side Blob uploads only — do not enable browser direct upload without a full client-safe handler audit. |

**Commands:** always use `npm run generate:importmap -w web` (not raw `payload generate:importmap`). Prefer `npm run dev` (webpack), not `dev:turbo`, unless you have verified admin compiles.

**Check:** `app/(payload)/admin/importMap.js` line for `VercelBlobClientUploadHandler` should import from `../../../lib/payload/vercel-blob-client-stub`.

### What can still break (honest list)

- Running `payload generate:importmap` **without** the npm script wrapper, then committing the file.
- Setting **`clientUploads: true`** on Vercel Blob — needs a different architecture; the stub is not a real upload handler.
- **Payload major upgrades** — re-run `npm run build -w web` and admin smoke-test after bumping `@payloadcms/*`.
- **`dev:turbo`** — aliases are mirrored but Turbopack + Payload is less battle-tested than webpack.
- Unrelated server-only imports in **custom admin components** (same class of error: Node built-ins in client bundle).
- Build **warning** `cli-color` / `json-schema-to-typescript` via Payload on server routes — noisy but not a deploy blocker today.

## Regenerate types

After changing collections in `apps/web/collections/`:

```bash
npm run generate:types -w web
```

## Sitemap

`postbuild` runs `next-sitemap`, which merges Phase 1 AI paths (`/pricing`, `/llms.txt`, `/pricing.md`) with `/help` and published article slugs via [`lib/payload/fetch-help-sitemap-paths.js`](../apps/web/lib/payload/fetch-help-sitemap-paths.js).

## Related

- **Prisma vs Payload (read first):** [DATA-LAYER.md](./DATA-LAYER.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md) § Help CMS
- AI SEO monitoring: [AI-SEO-MONITORING.md](./AI-SEO-MONITORING.md)
- Blog CMS: [BLOG-CMS.md](./BLOG-CMS.md)
- AI SEO content roadmap: [AI-SEO-PHASE2.md](./AI-SEO-PHASE2.md)
