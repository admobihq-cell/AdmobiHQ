# Customer mobile (`apps/app-mobile`)

Expo customer product twin of the web app at **`app.admobihq.com`**.

**No Clerk** — this scaffold has no authentication. Ops staff mobile remains at [`apps/mobile`](../apps/mobile) (Clerk).

## Local

```bash
npm install
npm run env:pull -w app-mobile   # optional; falls back to local defaults
npm run dev -w app-mobile
```

Or with the rest of the stack: `npm run dev:all` (starts ops `mobile` and `app-mobile`).

## Map

The **Map** tab uses MapLibre React Native (`@maplibre/maplibre-react-native`) with the same Nairobi corridor / coverage / proof-of-play fixtures as the web customer map (`@workspace/geo`).

MapLibre React Native requires a **development build** (not Expo Go). In Expo Go the Map tab uses a **WebView** MapLibre GL fallback with the same demo layers.

```bash
npx expo prebuild -w app-mobile   # if needed
npx expo run:android -w app-mobile
# or
npx expo run:ios -w app-mobile
```

Metro for this app listens on **port 8082** (ops mobile uses **8081**) so `npm run dev:all` can run both. Dev scripts use `--offline` to skip Expo’s online native-module version check (avoids a flaky `Body is unusable` crash).

## Env

| Variable | Required | Notes |
|----------|----------|--------|
| `EXPO_PUBLIC_APP_URL` | Optional | Web customer origin (`http://localhost:3002`) |
| `EXPO_PUBLIC_API_URL` | Optional | Business API for future product calls |

No `CLERK_*` keys.

## Bundle IDs

| Platform | ID |
|----------|-----|
| iOS | `com.admobihq.app` |
| Android | `com.admobihq.app` |
| Scheme | `admobihq-app` |
