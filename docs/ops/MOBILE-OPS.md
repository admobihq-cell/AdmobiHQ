# Ops mobile (`apps/ops-mobile`)

Expo app for **Admobi ops staff** — Clerk auth, calls the business API with session JWT.

**Customer mobile** (own Clerk instance, see [AUTH.md](../shared/AUTH.md)): [APP-MOBILE.md](../customer/APP-MOBILE.md)

**Builds, APKs, OTA:** [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md)

---

## Local development

```bash
npm run env:pull -w ops-mobile   # maps EXPO_PUBLIC_* + Clerk from Infisical
npm run dev -w ops-mobile        # Metro on port 8081
npm run dev:clear -w ops-mobile  # same, clears Metro cache
```

Staff must sign in with an **`@admobihq.com`** Clerk account (same restriction as the ops web console).

---

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | From Infisical / Clerk dashboard |
| `EXPO_PUBLIC_API_URL` | Yes | Business API (`http://localhost:3003` locally) |
| `EXPO_PUBLIC_OPS_URL` | Optional | Ops web console URL |

---

## Identity

| Platform | ID |
|----------|-----|
| iOS | `com.admobihq.ops` |
| Android | `com.admobihq.ops` |
| Scheme | `admobihq` |
| EAS slug | `admobihq-ops` |

---

## Building an APK for the team

From **`apps/ops-mobile`** (not repo root):

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Download the APK from the EAS dashboard when the build completes. See [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md) for OTA updates, keystores, and customer app builds.

---

## Campaigns review

`/(ops)/campaigns` — list + detail, gated on the `campaigns` permission (label already in `permission-labels.ts`). Uses `client.campaigns.*` from `@workspace/ops-api-client`. Same decisions as ops web (Approve / Request changes / Reject / Unapprove); reason required for non-approve and is **advertiser-visible**. Image creatives load via the authenticated proxy; video uses a play affordance. Ops push for a new submission uses alert type `campaign_submission` and deep-links to `/(ops)/campaigns/:id`.

## Advertiser orgs

`/(ops)/advertiser-orgs` — list + detail from the drawer's **Advertiser orgs** entry, gated on the `campaigns` permission like ops web. Detail shows active members and roles, pending invitations, the org's campaigns (each opens `/(ops)/campaigns/:id`), and the same allowlisted activity feed advertisers see. Read-only: org membership is managed by the advertiser's own admins. See [OPS-ADMIN.md § Advertiser orgs](./OPS-ADMIN.md#advertiser-orgs).

## SOS review

`/(ops)/sos` — list + detail, gated on the `safety` permission. Uses
`client.safety.*` from `@workspace/ops-api-client`. Unacknowledged incidents
float to the top of the list regardless of the active filter, with a red
banner counting them; the list polls every 15s while anything is live and
every 60s when quiet.

Actions: Acknowledge / In progress / Resolve (resolution note **required** —
the API returns 400 without one). Only the driver can cancel. Photos the
driver attached show as a strip of thumbnails on the detail screen (tap for full
size). The file route is private, so each image loads with the same bearer token
as the API calls (`client.safety.photoFileUrl`). **Open map** opens Google Maps at
the last known location, falling back to where it was reported.

Ops push for a new SOS uses alert type `safety`, the **MAX-importance
`"safety"` Android channel** registered in `lib/push-notifications.ts`, and
deep-links to `/(ops)/sos/:id`. Without that registered channel Android
silently downgrades the alert to the default channel and no heads-up banner
appears. Full design: `docs/shared/SAFETY-SOS.md`.

## Dashboards

The drawer's **Dashboards** group opens `/(ops)/dashboards/{campaigns,fleet,advertisers,support}`, the four ops-console dashboards on `GET /v1/ops/dashboards/*` (same SQL as the web, from `@workspace/ops-queries`). Each entry shows only with the web's permission: Campaigns and Advertisers need `campaigns`, Fleet `drivers`, Support `support`. Money (booked budget, budget by format, payout figures, spend and balances) is **absent from the API response** unless the user also holds `finances`, and the Support safety cards need `safety`; the screens draw only what arrived. Campaigns has the Pipeline / Delivery / Inventory mix tabs and opens on the one named by `?tab=`. Every dashboard has the 7d / 30d / 90d / All range toolbar and pull to refresh. Labels, health tones and wait wording are shared with web through `@workspace/ops-contracts` (`dashboard-format.ts`). Funnels draw as ranked bars on mobile, and the delivery gauge is a percentage.

## Attention queue (header bell)

The bell in the app bar opens `/(ops)/notifications`: the same "needs attention" rows as the ops Overview (reviews waiting, campaigns at risk, driver applications, urgent cases, critical incidents, payouts pending or failed) from `GET /v1/ops/action-queue`. Any ops user can open it; the API drops each row the user has no permission for, and every row with a count of zero. The badge on the bell is the sum of the counts. Rows are grouped by urgency and open the matching dashboard or Finances tab. The screen refetches when you come back to it and on pull to refresh. Activity, which the bell used to open, is now a drawer entry (`activity` permission). The push-style QA preview moved to `/(ops)/notification-preview` (Profile → Developer tools).

## Users

`/(ops)/users`, from the drawer's **Users** entry, ops admins only (as on web, where `/users` needs `requireOpsAdmin`; `GET /v1/users` is `requireOpsAdminAccess`). Anyone else gets a no-access screen and no request is made. **Customers** and **Drivers** come from `GET /v1/users?type=` with a debounced search (name, email, phone) and 25-row pages loaded as you scroll; each row shows name, company (customers), email, phone, joined date and status (Active / Banned / Locked). **Admins** is the ops team list (`GET /v1/team`), searched on the phone by email or role. There is no per-user detail screen: the web has no detail page and there is no detail endpoint.

## Bulk approve and reject

On **Campaigns** and **Driver applications**, long-press a row to start selecting; tap more rows to add or remove them (up to 100, the API's batch limit). A bar shows the count with **Approve** and **Reject**. Both ask first and state the count; Reject needs one reason, which is shown to every row it applies to. Only rows still in review change; the rest are skipped, and the result line reads like the web's: "2 approved, 1 skipped (not in review)". Changing the status filter clears the selection. A second tap on Approve/Reject while a batch is in flight is ignored. Calls `POST /v1/campaigns/bulk-review` and `POST /v1/driver-applications/bulk-review`.

## Exporting lists

Every entity list (Leads, Fleet, Drivers, Waitlist, Media kit), **Campaigns**, **Driver applications**, **Team** and **Roles** has an **Export** button: pick **CSV** or **PDF** and the file opens in the system share sheet. It exports exactly what is on screen: the rows loaded so far, or just the selected rows when a selection is active (the button then reads "Export N selected" and the file name ends in `-selected`). At most 500 rows, the PDF route's limit. Columns match the ops web tables' CSV columns. CSV is built on the phone with `toCsv` and written with `expo-file-system`; PDF comes from `POST /v1/ops/documents/export` and is refused unless it starts with `%PDF` (a proxy error page is never shared as a PDF). File names come from `exportFileName()`, e.g. `drivers-2026-11-12.csv`. The code is `lib/export-list.ts` and `components/app/export-button.tsx`. Team and Roles export under the `admin` permission, like the web.

## Campaign funding

The campaign detail screen's **Funding** row reads **Funded · KES 12,500 held** when the advertiser's budget was paid for and held (`funded_at` is set; the budget is locked and a rejection releases it), or **Not funded**. Same wording as the ops web review panel.

## Integrations ledger

Profile → **Integrations** (ops admins only) opens `/(ops)/settings/integrations`: every tool and subscription the company pays for, from `GET /v1/ops/integrations`. The header shows the monthly cost in KES and USD, annual cost, active and free counts, and a donut by category; the totals are computed on the server with the ops console's own `totals()`, so the two always agree. Tap a row to edit it, or **Add integration**; **Delete** is inside the edit sheet and asks first. The form validates with `integrationInputSchema` (`@workspace/ops-contracts/integration-costs`), the same schema the console's server actions and the API use. Seeding the starter list stays web-only. Every create, update and delete writes an audit event (entity `integration`).

## Push notifications (ops staff)

When someone submits a **driver application**, **fleet partnership**, **campaign brief** on the marketing site, or an **advertiser campaign for review**, registered ops devices receive the matching alert (`AdminAlert` / `campaign_submission`).

| Piece | Location |
|-------|----------|
| Token registration (after Clerk sign-in) | `apps/ops-mobile/lib/push-notifications.ts` |
| API store + send | `apps/api/app/v1/push-tokens`, `apps/api/lib/push/ops-alerts.ts` |
| Delivery receipts | `apps/api/lib/push/receipts.ts`, `apps/api/app/v1/push-receipts/check` |
| DB tables | `ops_push_tokens`, `push_tickets` (see `apps/web/prisma/scripts/ops-schema-additive.sql`) |

### Tickets vs receipts

Expo answers a send with a **ticket**, which only means it queued the message. Whether FCM or APNs actually accepted it is in the **delivery receipt**, available a few minutes later and kept for 24 hours.

Every message is written to `push_tickets` as `pending`. Resolving those rows to `ok` or `error` deletes tokens that came back `DeviceNotRegistered` / `InvalidCredentials` and recomputes `delivered_count` on `announcement_broadcasts`.

Two things trigger it:

- **Opening the announcements list** (`GET /v1/notifications`) sweeps up to 100 pending tickets first. Costs one indexed query when there is nothing to resolve.
- **A nightly cron** at 03:00 (`apps/api/vercel.json`) as the backstop. Vercel's Hobby plan only permits **one cron run per day** — a `*/15 * * * *` schedule fails the deploy outright. On Pro you can tighten it.

So the `delivered_count / target_count` shown in the ops console is **0 right after sending** and fills in once receipts arrive. A broadcast stuck at `0/N` with a `MismatchSenderId` error means the FCM V1 key and `google-services.json` belong to different Firebase senders.

The endpoint accepts either an ops session or `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` in the API environment.

### Resend

The mobile composer (`/(ops)/announcements/new`) has **Personalise** buttons that insert `{{first_name}}` or `{{org_name}}` at the cursor of whichever of title or message was focused last (refused if it would pass the limit, as on web), live character counts against the push limits (**65** title, **178** message), and a live preview of the notification with sample values (first name "Jordan", organisation "Acme Ads"; drivers have no organisation). When a send reaches both apps the preview has a Customer / Driver switch. Tapping a past broadcast in the list opens a detail sheet with the same preview, the delivery bar (reached / no longer registered / awaiting a receipt) and who sent it. The sample values and limits live in `@workspace/ops-contracts` (`announcement-ui.ts`).

Ops web and ops-mobile list past broadcasts with a **Resend** action. It reuses `POST /v1/notifications/broadcast` with the same title/body, so a resend creates a **new** `announcement_broadcasts` row and a fresh fan-out — it does not mutate the original send.

### One-time setup

1. **Database** — run the additive SQL (safe; does not touch Payload tables):

   ```bash
   npm run db:ops-schema -w web
   ```

2. **FCM (Android)** — in [expo.dev](https://expo.dev) → **admobihq-ops** → **Credentials** → **Push notifications**, upload your Firebase Cloud Messaging **service account key** (FCM v1). Without this, tokens register but Android push will not deliver.

3. **Deploy API** — redeploy `apps/api` so `/v1/push-tokens` and form hooks are live.

### OTA vs rebuild

Push **registration and handlers are JavaScript only** — ship fixes with:

```bash
npm run update:preview -w ops-mobile
```

No new APK is required unless you change native config (`app.json` plugins, permissions) or bump `runtimeVersion`. Your current preview APK already includes `expo-notifications`.

### Test on a physical device

1. Install the EAS preview APK (not the local Gradle dev client).
2. Sign in with `@admobihq.com`.
3. Accept the notification permission prompt.
4. Submit a test driver/fleet/campaign form on the marketing site.
5. Tap the notification — it should open the matching record in ops.
