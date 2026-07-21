# Ops mobile (`apps/mobile`)

Expo app for **Admobi ops staff** — Clerk auth, calls the business API with session JWT.

**Customer mobile** (no Clerk): [APP-MOBILE.md](./APP-MOBILE.md)

**Builds, APKs, OTA:** [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)

---

## Local development

```bash
npm run env:pull -w mobile   # maps EXPO_PUBLIC_* + Clerk from Infisical
npm run dev -w mobile        # Metro on port 8081
npm run dev:clear -w mobile  # same, clears Metro cache
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

From **`apps/mobile`** (not repo root):

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Download the APK from the EAS dashboard when the build completes. See [MOBILE-BUILDS.md](./MOBILE-BUILDS.md) for OTA updates, keystores, and customer app builds.
