# Customer mobile (`apps/customer-mobile`)

Expo customer product twin of the web app at **`app.admobihq.com`**.

**Clerk sign-in is live** (email code + Google, same customer instance as `apps/customer-web`), gated by `EXPO_PUBLIC_AUTH_ENABLED`. Full reference: [AUTH.md](../shared/AUTH.md). Ops staff mobile is at [`apps/ops-mobile`](../../apps/ops-mobile) (separate, ops Clerk instance, always on).

**Builds, APKs, OTA:** [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md)

---

## Local development

```bash
npm install
npm run env:pull -w customer-mobile   # optional; falls back to local defaults
npm run dev -w customer-mobile        # Metro on port 8082
npm run dev:clear -w customer-mobile  # same, clears Metro cache
```

Or with the rest of the stack: `npm run dev:all` (starts ops-mobile, customer-mobile, and driver-mobile).

Metro for this app listens on **port 8082** (ops **8081**, driver **8083**) so `npm run dev:all` can run all three. Dev scripts use `--host lan` so physical devices on the same Wi‑Fi can load the dev client (scan QR or open the network URL). If Expo CLI crashes on startup with `Body is unusable`, retry with `expo start --port 8082 --offline` (disables LAN).

---

## Map

The **Map** tab uses MapLibre React Native (`@maplibre/maplibre-react-native`) with the same Nairobi corridor / coverage / proof-of-play fixtures as the web customer map (`@workspace/geo`).

MapLibre React Native requires a **development build** or **EAS preview APK** (not Expo Go) for the native map. In Expo Go the Map tab uses a **WebView** MapLibre GL fallback with the same demo layers.

---

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `EXPO_PUBLIC_APP_URL` | Optional | Web customer origin (`http://localhost:3002`) |
| `EXPO_PUBLIC_API_URL` | Yes (for support, announcements, flags, push) | Business API |
| `EXPO_PUBLIC_AUTH_ENABLED` | Local-only, not in Infisical | Gates whether Clerk mounts — see [AUTH.md](../shared/AUTH.md) §4 |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Required when auth is enabled | Customer Clerk publishable key (mapped on `env:pull`) |

---

## Identity

| Platform | ID |
|----------|-----|
| iOS | `com.admobihq.app` |
| Android | `com.admobihq.app` |
| Scheme | `admobihq-app` |
| EAS slug | `admobihq-app` |

`lib/auth/use-customer-session.ts` still persists an `anonymousDeviceId` (via `getOrCreateDeviceId()`) for support-case identity tokens and push registration when Clerk is off or the user has not signed in. When `EXPO_PUBLIC_AUTH_ENABLED` is on, `<AuthGate>` uses the Clerk session for route protection; the anonymous device id remains the fallback identity for public support and push-token rows.

---

## Building an APK for the team

From **`apps/customer-mobile`** (not repo root):

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Download the APK from the EAS dashboard when the build completes. See [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md) for OTA updates, local debug APKs, and ops app builds.
