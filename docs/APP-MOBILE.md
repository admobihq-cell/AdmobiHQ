# Customer mobile (`apps/app-mobile`)

Expo customer product twin of the web app at **`app.admobihq.com`**.

**No Clerk** — this scaffold has no authentication. Ops staff mobile is at [`apps/mobile`](../apps/mobile) (Clerk).

**Builds, APKs, OTA:** [MOBILE-BUILDS.md](./MOBILE-BUILDS.md)

---

## Local development

```bash
npm install
npm run env:pull -w app-mobile   # optional; falls back to local defaults
npm run dev -w app-mobile        # Metro on port 8082
npm run dev:clear -w app-mobile  # same, clears Metro cache
```

Or with the rest of the stack: `npm run dev:all` (starts ops `mobile` and `app-mobile`).

Metro for this app listens on **port 8082** (ops mobile uses **8081**) so `npm run dev:all` can run both. Dev scripts use `--offline` to skip Expo’s online native-module version check (avoids a flaky `Body is unusable` crash).

---

## Map

The **Map** tab uses MapLibre React Native (`@maplibre/maplibre-react-native`) with the same Nairobi corridor / coverage / proof-of-play fixtures as the web customer map (`@workspace/geo`).

MapLibre React Native requires a **development build** or **EAS preview APK** (not Expo Go) for the native map. In Expo Go the Map tab uses a **WebView** MapLibre GL fallback with the same demo layers.

---

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `EXPO_PUBLIC_APP_URL` | Optional | Web customer origin (`http://localhost:3002`) |
| `EXPO_PUBLIC_API_URL` | Optional | Business API for future product calls |

No `CLERK_*` keys.

---

## Identity

| Platform | ID |
|----------|-----|
| iOS | `com.admobihq.app` |
| Android | `com.admobihq.app` |
| Scheme | `admobihq-app` |
| EAS slug | `admobihq-app` |

---

## Building an APK for the team

From **`apps/app-mobile`** (not repo root):

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Download the APK from the EAS dashboard when the build completes. See [MOBILE-BUILDS.md](./MOBILE-BUILDS.md) for OTA updates, local debug APKs, and ops app builds.
