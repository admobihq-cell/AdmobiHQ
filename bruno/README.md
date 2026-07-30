# Admobi Bruno collection

Open this folder in Bruno: **Open Collection** → select `bruno/`.

## Environments

| Env | API |
|-----|-----|
| `local` | http://localhost:3003 |
| `staging` | https://api.staging.admobihq.com |
| `production` | https://api.admobihq.com |

## Secrets (do not commit)

In Bruno → Environment → Secrets, set:

- `clerk_jwt` — Clerk session JWT for an `@admobihq.com` user (ops admin routes)
- `cron_secret` — value of `CRON_SECRET` (push-receipts check)

Optional: copy values into a gitignored `*.local.bru` if your Bruno version supports it.

## Quick start

1. `npm run env:pull -w api` then `npm run dev -w api`
2. Open Bruno → select **local** environment
3. Run **Business API → Public → Health**
4. Paste a Clerk JWT into `clerk_jwt`, then run admin requests

## Layout

- `business-api/public` — marketing / unauthenticated
- `business-api/admin` — Clerk-protected CRUD + stats/audit/notifications
- `payload-cms` — Payload collections on `apps/web`
- `health` — deploy smoke checks

Canonical route map: `docs/API.md`.
