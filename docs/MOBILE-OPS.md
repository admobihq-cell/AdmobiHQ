# Ops mobile (`apps/ops-mobile`)

Expo app for **Admobi ops staff** — Clerk auth, calls the business API with session JWT.

**Customer mobile** (no Clerk): [APP-MOBILE.md](./APP-MOBILE.md)

**Builds, APKs, OTA:** [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)

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

Download the APK from the EAS dashboard when the build completes. See [MOBILE-BUILDS.md](./MOBILE-BUILDS.md) for OTA updates, keystores, and customer app builds.

---

## Push notifications (ops staff)

When someone submits a **driver application**, **fleet partnership**, or **campaign brief** on the marketing site, registered ops devices receive the same alert as the admin email (`AdminAlert`).

| Piece | Location |
|-------|----------|
| Token registration (after Clerk sign-in) | `apps/ops-mobile/lib/push-notifications.ts` |
| API store + send | `apps/api/app/v1/push-tokens`, `apps/api/lib/push/ops-alerts.ts` |
| DB table | `ops_push_tokens` (see `apps/web/prisma/scripts/ops-schema-additive.sql`) |

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
