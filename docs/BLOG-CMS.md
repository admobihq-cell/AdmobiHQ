# Blog CMS (Payload)

Editorial articles with cover images and inline photos, powered by the same Payload instance as the [help center](./HELP-CMS.md). Local dev commands: [DEV-SETUP.md](./DEV-SETUP.md).

## URLs

| URL | Purpose |
|-----|---------|
| `/blog` | Blog index |
| `/blog/[slug]` | Published article |
| `/admin` | Payload admin — **Media** and **Blog posts** collections |

Canonical metadata and JSON-LD use `https://admobihq.com/blog` (same origin as the marketing site).

## Collections

| Collection | Purpose |
|------------|---------|
| **Media** | Image uploads (cover + inline in rich text). Alt text required. |
| **Blog posts** | Title, slug, excerpt, cover image, author, publish date, topic, body (Lexical), SEO fields. Draft/publish workflow. |

## Editorial workflow

1. **Media** — Upload images with descriptive alt text (required for accessibility and SEO).
2. **Blog posts** — Create a post, set cover image, author name, publish date, and write the body in Lexical.
3. **Inline images** — Use the upload control in the editor (or drag/drop) to insert images from **Media**.
4. **Publish** — Drafts stay hidden on `/blog` until published.
5. ISR (`revalidate = 3600`) and publish hooks refresh `/blog` and the article URL.

### Fields worth filling

- **Author name** — Shown on the site and in `BlogPosting` JSON-LD.
- **Published at** — Sort order and `datePublished` for search/AI SEO.
- **Topic** — Groups related articles on the index and “Related articles”.
- **SEO title / description** — Optional overrides for metadata and social cards.

## Environment

See [HELP-CMS.md](./HELP-CMS.md) for Infisical / `.env.local` workflow. Blog-specific keys:

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — persistent media uploads in production |
| `NEXT_PUBLIC_SERVER_URL` | Site origin (`https://admobihq.com`; used for admin links and metadata) |
| `API_KEY_PEXELS` | Pexels API key for stock image search in `/admin` |

Pull locally:

```bash
npm run env:pull -w web
npm run env:check -w web
```

## Stock images (Pexels)

Editors can search and import royalty-free photos from [Pexels](https://www.pexels.com/api/) inside Payload admin via `@payload-bites/image-search`.

1. Set `API_KEY_PEXELS` in Infisical (dev + prod) and sync to Vercel Production.
2. Pull locally with `npm run env:pull -w web`.
3. In `/admin` → **Media** (or a blog **Cover image** upload drawer), use **Image Search** → query → preview → import.
4. Fill **alt text** if not auto-populated (required on the Media collection).
5. Credit the photographer when publishing (Pexels [license](https://www.pexels.com/license/)).

Imported files are stored like any other upload (local disk without Blob token, Vercel Blob in production). Only Pexels is enabled — do not set `API_KEY_UNSPLASH` or `API_KEY_PIXABAY` unless you want those providers later.

**Monorepo note:** `@payload-bites/image-search` ships SCSS paths that assume a nested `node_modules` layout. This repo applies [`patches/@payload-bites+image-search+3.4.2.patch`](../patches/@payload-bites+image-search+3.4.2.patch) via `patch-package` on `npm install` (root `postinstall`).

## Media storage

**Local dev (no Blob token):** files under `apps/web/media/` (gitignored).

**Production (Vercel):** `@payloadcms/storage-vercel-blob` in [`payload.config.ts`](../apps/web/payload.config.ts) when `BLOB_READ_WRITE_TOKEN` is set. Uploads go through the Payload API (server-side) to Blob. `clientUploads: true` is **not** enabled — that mode pulls server-only Payload code into the admin client bundle and breaks Next.js 16 webpack builds.

Sync `BLOB_READ_WRITE_TOKEN` from Infisical to Vercel Production (or link Blob store in Vercel — one token is enough).

Legacy rows that still reference `/api/media/file/...` need re-upload after switching to Blob.

## Migrations (after pulling blog schema)

Same rules as help: **do not run `prisma db push`** on a DB that already has Payload tables.

```bash
npm run env:pull -w web
npm run payload:migrate:create -w web -- --name blog_and_media
npm run payload:migrate -w web
npm run generate:types -w web
npm run dev -w web
```

## Production deploy checklist

1. **Vercel env (Production):** `DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `BLOB_READ_WRITE_TOKEN`, `API_KEY_PEXELS`
2. **Payload migrations** on prod DB: `npm run payload:migrate -w web` (with prod `DATABASE_URL`)
3. **Deploy** and smoke test: upload in `/admin`, publish post, verify `/blog` and `/blog/[slug]` on `admobihq.com`

## Seed sample posts

```bash
npm run seed:blog -w web
```

Creates or updates four sample posts (generated cover art each):

| Slug | Topic |
|------|--------|
| `traditional-ooh-vs-moving-led-taxi-tops-kenya` | OOH — traditional vs moving LED |
| `planning-nairobi-taxi-top-campaign-corridors` | Campaigns — corridor planning |
| `gps-proof-of-play-outdoor-advertising-kenya` | Product — GPS proof-of-play |
| `delivery-bike-ooh-lunch-hour-estates-nairobi` | OOH — delivery bike estates |

## Regenerate types

After changing collections:

```bash
npm run generate:types -w web
```

## Sitemap

`postbuild` includes `/blog` and published post slugs on `admobihq.com` via [`fetch-blog-sitemap-paths.js`](../apps/web/lib/payload/fetch-blog-sitemap-paths.js).

## Related

- **Prisma vs Payload (read first):** [DATA-LAYER.md](./DATA-LAYER.md)
- Help CMS: [HELP-CMS.md](./HELP-CMS.md)
- AI SEO content roadmap: [AI-SEO-PHASE2.md](./AI-SEO-PHASE2.md)
