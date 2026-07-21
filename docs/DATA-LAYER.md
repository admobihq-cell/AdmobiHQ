# Data layer — Prisma (backend) and Payload (CMS)

**For all engineers:** Admobi’s application backend is **Prisma on PostgreSQL**. **Payload is only the content management system** for marketing/editorial content (help center, blog, media). Do not treat Payload as the primary data layer for product or lead data.

## Summary

| | **Prisma** | **Payload** |
|---|------------|-------------|
| **Role** | Main backend stack — forms, leads, operational data | CMS — help articles, blog posts, media, admin users |
| **ORM** | Prisma Client 7 (`@prisma/adapter-pg`) | Drizzle (via `@payloadcms/db-postgres`) |
| **Schema** | [`apps/web/prisma/schema.prisma`](../apps/web/prisma/schema.prisma) | [`apps/web/collections/`](../apps/web/collections/) + [`apps/web/migrations/`](../apps/web/migrations/) |
| **Prisma client** | [`apps/web/lib/prisma.ts`](../apps/web/lib/prisma.ts), [`apps/api/lib/prisma.ts`](../apps/api/lib/prisma.ts), [`apps/ops/lib/prisma.ts`](../apps/ops/lib/prisma.ts) | — |
| **Payload client** | — | [`apps/web/lib/payload/get-payload.ts`](../apps/web/lib/payload/get-payload.ts) |
| **HTTP APIs** | [`apps/api/app/v1/`](../apps/api/app/v1/) (public + admin) | [`apps/web/app/(payload)/api/`](../apps/web/app/(payload)/api/) |
| **Admin UI** | Ops console at `ops.admobihq.com` (via API) | [`/admin`](../apps/web/app/(payload)/admin/) |

New **business logic**, **integrations**, and **persistent app data** should go through **Prisma** unless the work is explicitly editorial content managed by marketers in Payload.

## What Prisma owns

Tables (see Prisma schema):

| Table | Model | Used by |
|-------|--------|---------|
| `leads` | `Lead` | Campaign briefs (`POST /v1/public/leads`, audience `campaign`) |
| `fleet_partners` | `FleetPartner` | Fleet inquiries (`POST /v1/public/leads`, audience `fleet`) |
| `drivers` | `Driver` | Driver onboarding (`POST /v1/public/drivers`) |
| `waitlist`, `media_kit_requests`, etc. | — | Public + ops admin routes under `/v1/*` |

Implementation pattern (in `apps/api`):

1. Zod validation in [`apps/api/lib/validation/`](../apps/api/lib/validation/) or [`@workspace/ops-contracts`](../packages/ops-contracts/).
2. `prisma.*.create()` / CRUD in route handlers.
3. Optional side effects (Resend via [`apps/api/lib/email/`](../apps/api/lib/email/)).

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
| `DATABASE_URL` | Prisma in web, api, ops (required for form APIs and ops server stats) |
| `PAYLOAD_DATABASE_URL` | Optional; Payload only. If unset, Payload falls back to `DATABASE_URL`. |
| `PAYLOAD_SECRET` | Payload admin and API (web only) |
| `BLOB_READ_WRITE_TOKEN` | Payload media (Vercel Blob), optional locally |

[`apps/web/lib/load-env.ts`](../apps/web/lib/load-env.ts) and [`apps/api/lib/load-env.ts`](../apps/api/lib/load-env.ts) normalize common Infisical key names into `DATABASE_URL` for local scripts.

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
Marketing forms     →  POST api…/v1/public/leads | /drivers | …  →  Prisma (apps/api)
Ops admin CRUD      →  api…/v1/leads | /fleet | … + Clerk JWT    →  Prisma (apps/api)
Help / blog pages   →  Server components (apps/web)              →  getPayloadClient()
Content editors     →  /admin (apps/web)                         →  Payload UI
Headless CMS API    →  admobihq.com/api/… (payload route group)  →  Payload REST
```

Do not call `getPayloadClient()` from business API routes for lead capture. Do not add Prisma models for help/blog articles unless we deliberately migrate off Payload for that content.

## Code conventions

- **Imports:** `@/lib/prisma` in api/ops/web; `@/lib/payload/get-payload` or `*-queries.ts` for CMS reads in web only.
- **Types:** Prisma types from `@prisma/client`; Payload types from `payload-types.ts` (regenerate with `npm run generate:types -w web`).
- **HTTP client:** `@workspace/ops-api-client` for ops/mobile; `publicApiUrl()` for web forms.
- **New features:** Ask “Is this marketer-edited content?” → Payload. “Is this product/ops data?” → Prisma in `apps/api`.

## Related docs

- [API.md](./API.md) — business API routes and deployment
- [DEV-SETUP.md](./DEV-SETUP.md) — **local dev commands**, Infisical, when to run migrations/seeds
- [ARCHITECTURE.md](./ARCHITECTURE.md) — repo layout and routing
- [HELP-CMS.md](./HELP-CMS.md) — help center setup, env, Payload migrations
- [BLOG-CMS.md](./BLOG-CMS.md) — blog and media
