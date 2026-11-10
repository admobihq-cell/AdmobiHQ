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

Environments declare five **secret** vars (values are stored by Bruno locally, not in git). Each app signs in against its own Clerk instance, so a token from one app is rejected by the others' routes:

| Secret | Required for | How to get it |
|--------|--------------|---------------|
| `clerk_jwt` | All **Admin** (ops) requests | Sign in to ops (`localhost:3001` or staging), open DevTools → Network, copy the Clerk session JWT from an API call’s `Authorization: Bearer …` header. Must be an `@admobihq.com` user. |
| `customer_jwt` | **Customer** requests, and Public → support list/get/reply | Same, from customer-web (`localhost:3002` / `app.staging.admobihq.com`). The org permissions of that user apply (`billing:read`, `reports:read`, `media:write`, …) |
| `driver_jwt` | **Driver** requests | Same, from driver-web (`driver.staging.admobihq.com`) |
| `cron_secret` | **Admin → Cron** and push-receipts check | Same value as `CRON_SECRET` in Infisical / `apps/api/.env.local` (`npm run env:pull -w api`) |
| `paystack_secret` | **Paystack webhooks** (signs the body) | `PAYSTACK_SECRET_KEY` for that environment (test key locally and on staging) |

Clerk session JWTs expire after about a minute; copy a fresh one when you get `401`.

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
| `resource_id` | Default id for Get/Update/Delete requests (the parent, e.g. the campaign) |
| `child_id` | Second id in nested paths (creative, photo, document) |
| `payment_reference` | Paystack reference from a top-up or checkout response |
| `invitation_token` | Token from a customer org invitation link |
| `period_month` | `YYYY-MM` for payouts and monthly statements |
| `clerk_jwt` / `customer_jwt` / `driver_jwt` | Bearer tokens per Clerk instance (ops / customer / driver) |
| `cron_secret` | Bearer token for cron routes |
| `paystack_secret` | Signs Paystack webhook bodies |

## Layout

- `business-api/public` — no auth (support case reads take a customer/driver JWT or the case token)
- `business-api/admin` — ops routes, needs `clerk_jwt` (Cron uses `cron_secret`)
- `business-api/customer` — advertiser routes, needs `customer_jwt`
- `business-api/driver` — driver routes, needs `driver_jwt`
- `business-api/webhooks` — Paystack callbacks, signed with `paystack_secret`
- `payload-cms` — Payload on `WEB_URL`
- `health` — customer-web smoke check
- `fixtures/sample.png` — 1×1 image used by the upload requests (media, SOS photo, driver document). Creative uploads must fit the panel, so expect `400` with it there

Money paths (`admin/finance` refunds and disbursements, Paystack webhooks) move real money on production. Run them against local or staging.

## Keeping it current

Every route in `apps/api/app/v1` should have a request here. When you add or change a route, add or update its `.bru` file in the same change. As of 2026-11-10 it covers every route (`GET /v1/cron/finance-daily` is the same handler as the POST request).

Canonical route map: `docs/api/API.md`.
