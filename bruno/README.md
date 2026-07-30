# Admobi Bruno collection

Open this folder in Bruno: **Open Collection** → select `bruno/` (the folder that contains `bruno.json`).

## 1. Select an environment

In the collection toolbar (top right), open the **Environments** dropdown and pick:

| Environment | When to use | `API_URL` |
|-------------|-------------|-----------|
| **local** | Local `npm run dev -w api` | `http://localhost:3003` |
| **staging** | Staging server | `https://api.staging.admobihq.com` |
| **production** | Live API (careful) | `https://api.admobihq.com` |

URLs are already set in `environments/*.bru`. You normally **do not** edit `API_URL` for local.

If the dropdown is empty: close the collection and reopen `bruno/`, or click **⋯ → Environments** and confirm `local` / `staging` / `production` appear.

## 2. Set secrets (once per machine)

Environments declare two **secret** vars (values are stored by Bruno locally, not in git):

| Secret | Required for | How to get it |
|--------|--------------|---------------|
| `clerk_jwt` | All **Admin** requests | Sign in to ops (`localhost:3001` or staging), open DevTools → Application/Network, copy the Clerk session JWT from an API call’s `Authorization: Bearer …` header. Must be an `@admobihq.com` user. |
| `cron_secret` | Push-receipts check only | Same value as `CRON_SECRET` in Infisical / `apps/api/.env.local` (`npm run env:pull -w api`) |

### In Bruno UI

1. Environments dropdown → **Configure** / pencil on **local**
2. Open the **Secrets** tab (Bruno v4+) or find vars marked secret
3. Paste values for `clerk_jwt` and `cron_secret`
4. Save

Public requests (health, marketing forms) need **no secrets**.

## 3. Run something

1. Start API: `npm run env:pull -w api` then `npm run dev -w api`
2. Env = **local**
3. **Business API → Public → Health** → Send  
   Expect `200` from `http://localhost:3003/v1/health`

Then try **Admin → leads → List leads** after `clerk_jwt` is set.

## Variable reference

| Var | Purpose |
|-----|---------|
| `API_URL` | Business API (`apps/api`) |
| `WEB_URL` | Marketing + Payload (`apps/web`) |
| `OPS_URL` | Ops console (UI only; rarely needed in Bruno) |
| `APP_URL` | Customer web health |
| `resource_id` | Default id for Get/Update/Delete requests |
| `clerk_jwt` | Bearer token for admin routes |
| `cron_secret` | Bearer token for cron route |

## Layout

- `business-api/public` — no auth
- `business-api/admin` — needs `clerk_jwt`
- `payload-cms` — Payload on `WEB_URL`
- `health` — customer-web smoke check

Canonical route map: `docs/API.md`.
