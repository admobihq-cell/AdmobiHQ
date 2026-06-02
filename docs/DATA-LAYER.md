# Data layer — Prisma (backend) and Payload (CMS)

**For all engineers:** Admobi’s application backend is **Prisma on PostgreSQL**. **Payload is only the content management system** for marketing/editorial content (help center, blog, media). Do not treat Payload as the primary data layer for product or lead data.

## Summary

| | **Prisma** | **Payload** |
|---|------------|-------------|
| **Role** | Main backend stack — forms, leads, operational data | CMS — help articles, blog posts, media, admin users |
| **ORM** | Prisma Client 7 (`@prisma/adapter-pg`) | Drizzle (via `@payloadcms/db-postgres`) |
| **Schema** | [`apps/web/prisma/schema.prisma`](../apps/web/prisma/schema.prisma) | [`apps/web/collections/`](../apps/web/collections/) + [`apps/web/migrations/`](../apps/web/migrations/) |
| **Client** | [`apps/web/lib/prisma.ts`](../apps/web/lib/prisma.ts) | [`apps/web/lib/payload/get-payload.ts`](../apps/web/lib/payload/get-payload.ts) |
| **HTTP APIs** | [`apps/web/app/api/`](../apps/web/app/api/) | [`apps/web/app/(payload)/api/`](../apps/web/app/(payload)/api/) |
| **Admin UI** | None (use SQL/Prisma Studio if needed) | [`/admin`](../apps/web/app/(payload)/admin/) |

New **business logic**, **integrations**, and **persistent app data** should go through **Prisma** unless the work is explicitly editorial content managed by marketers in Payload.

## What Prisma owns

Tables (see Prisma schema):

| Table | Model | Used by |
|-------|--------|---------|
| `leads` | `Lead` | Campaign briefs (`POST /api/leads`, audience `campaign`) |
| `fleet_partners` | `FleetPartner` | Fleet partner inquiries (`POST /api/leads`, audience `fleet`) |
| `drivers` | `Driver` | Driver onboarding (`POST /api/drivers`) |

Implementation pattern:

1. Zod validation in [`apps/web/lib/validation/`](../apps/web/lib/validation/).
2. `prisma.*.create()` in the route handler.
3. Optional side effects (e.g. Resend via [`apps/web/lib/email/`](../apps/web/lib/email/)).

**Not yet on Prisma:** media-kit and waitlist routes still validate and log only. When those are persisted, use Prisma (new models + migration or `db push` per team process), not Payload collections.

## What Payload owns

Editorial and CMS concerns only:

| Tables (examples) | Purpose |
|-------------------|---------|
| `help_categories`, `help_articles` | Help center (`/help`) |
| `blog_posts`, `media` | Blog (`/blog`) and uploads |
| `users`, `payload_*` | Payload admin auth and system |

Public pages read Payload via server components and [`apps/web/lib/payload/*-queries.ts`](../apps/web/lib/payload/). Marketers edit content at `/admin`.

Payload does **not** store campaign leads, drivers, or fleet partners.

## One database, two ORMs (default)

Both stacks usually share the same Postgres URL (`DATABASE_URL`). Table names are disjoint, so there is no row-level conflict—only **migration discipline** matters.

| Environment variable | Used by |
|---------------------|---------|
| `DATABASE_URL` | Prisma (required for form APIs) |
| `PAYLOAD_DATABASE_URL` | Optional; Payload only. If unset, Payload falls back to `DATABASE_URL`. |
| `PAYLOAD_SECRET` | Payload admin and API |
| `BLOB_READ_WRITE_TOKEN` | Payload media (Vercel Blob), optional locally |

[`apps/web/lib/load-env.ts`](../apps/web/lib/load-env.ts) normalizes common Infisical key names into `DATABASE_URL` for local scripts.

### Migration rules (read before touching the DB)

| Action | Tool | Safe on shared DB? |
|--------|------|-------------------|
| Change lead/driver/fleet schema | Prisma (`db push` or future `migrate`) | **Only** if you understand impact on Payload tables — see below |
| Change help/blog/media schema | `npm run payload:migrate -w web` | Yes for Prisma tables |
| Payload auto-push | Disabled (`push: false` in `payload.config.ts`) | N/A — do not enable |

**Never run `npm run db:push -w web` on a database that already has Payload tables** unless you have verified the diff. It can try to drop CMS tables. Conversely, never enable Payload schema push against production; it can drop Prisma tables.

Details: [HELP-CMS.md](./HELP-CMS.md) — “One database, two ORMs”.

For maximum isolation in production, point `PAYLOAD_DATABASE_URL` at a separate Neon database; Prisma keeps using `DATABASE_URL` only.

## Request routing (do not mix these)

```
Marketing forms     →  POST /api/drivers | /api/leads | …     →  Prisma
Help / blog pages   →  Server components                    →  getPayloadClient()
Content editors     →  /admin                               →  Payload UI
Headless CMS API    →  /api/... (under app/(payload)/api)   →  Payload REST
```

Do not call `getPayloadClient()` from form API routes for lead capture. Do not add Prisma models for help/blog articles unless we deliberately migrate off Payload for that content.

## Code conventions

- **Imports:** `@/lib/prisma` for app data; `@/lib/payload/get-payload` or `*-queries.ts` for CMS reads; `@/payload-types` for Payload document types only.
- **Types:** Prisma types from `@prisma/client`; Payload types from `payload-types.ts` (regenerate with `npm run generate:types -w web`).
- **New features:** Ask “Is this marketer-edited content?” → Payload. “Is this product/ops data?” → Prisma.

## Related docs

- [DEV-SETUP.md](./DEV-SETUP.md) — **local dev commands**, Infisical, when to run migrations/seeds
- [ARCHITECTURE.md](./ARCHITECTURE.md) — repo layout and routing
- [HELP-CMS.md](./HELP-CMS.md) — help center setup, env, Payload migrations, admin webpack notes
- [BLOG-CMS.md](./BLOG-CMS.md) — blog and media
