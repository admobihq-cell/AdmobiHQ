# Customer app (`apps/app`)

Scaffold for the Admobi **customer product** at **`app.admobihq.com`**.

**Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md) · **Local dev:** [DEV-SETUP.md](./DEV-SETUP.md)

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://app.admobihq.com` |
| Staging | `https://app.staging.admobihq.com` |
| Local dev | `http://localhost:3002` |
| Business API (future) | `https://api.admobihq.com` |

## Current scope (scaffold only)

- Sidebar app shell (Overview, Campaigns, Reports, Settings)
- Each route shows a **Coming soon** empty state
- **No authentication** — login ships in a later phase
- `GET /api/health` on this app for deploy smoke tests (separate from `api.admobihq.com/v1/health`)

## Secrets (Infisical)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Recommended | `http://localhost:3002` (dev), `https://app.admobihq.com` (prod) |
| `NEXT_PUBLIC_WEB_URL` | Optional | Link back to marketing site |
| `NEXT_PUBLIC_OPS_URL` | Optional | Cross-link to ops console |
| `NEXT_PUBLIC_API_URL` | Optional | For future product features calling the business API |

No Clerk or database vars until the product phase.

### Pull locally

```bash
npm run env:pull -w app
npm run env:check -w app
npm run dev -w app
```

Or start with all core apps: `npm run dev`.

## Vercel

Separate Vercel project (third customer-facing app; fourth in the monorepo):

| Setting | Value |
|---------|--------|
| Root Directory | `apps/app` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build | `cd ../.. && npm run build -w app` if default fails |

Sync **only app env vars** from Infisical — not the full web secret set.

Domains: `app.admobihq.com` (prod), `app.staging.admobihq.com` (`staging` branch).
