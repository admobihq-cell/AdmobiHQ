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

## Campaigns

API-backed against `/v1/customer/campaigns` (same contracts as customer-web):

- **List / detail / calendar** — real data; status badges include derived flight phase (`scheduled` / `live` / `completed`).
- **Create / edit** — full-screen four-step wizard at `/campaigns/new` (resume with `id` param). Creative picker uses `expo-image-picker` for images **and** video; formats are PNG/JPG/GIF/MP4 only (from `CREATIVE_SPECS` in `@workspace/ops-contracts`). No toast library — inline banners (`ApiErrorBanner` pattern).
- **Review banner** — shows ops `review_reason` verbatim when status is `changes_requested` or `rejected`.
- **Budget estimator** — the wizard's budget step prices the flight with
  `calculateCampaignEstimate()` from `@workspace/ops-contracts`, the same rate
  card the website and customer-web use. The layout is native (no component
  can span React DOM and React Native) but the arithmetic is not re-implemented
  — market picks the zone, format picks the pricing model (per-play for
  taxi-top, per-side-per-day for delivery bike, summed for `both`), flight
  dates give the length. Steppers instead of the web's range slider: no slider
  dependency is installed, and a stepper is a better phone target.
- **PDF export** — parity with customer-web. The detail screen offers
  **Proof of play** on approved, dated campaigns; the calendar shows the
  active-budget total and downloads the **budget statement**. Both go through
  `useDownloadPdf()` → `File.downloadFileAsync()` (`expo-file-system`), which
  streams to the cache with the bearer token attached, so a multi-page PDF
  never sits in JS memory and no base64 round-trip is needed. The bytes are
  checked for the `%PDF` magic number before sharing — a download helper
  writes whatever the server sent, and a 401 or the 409 an unapproved campaign
  returns would otherwise be saved as a "PDF" that is really a JSON error.
  Delivery is the OS share sheet (`expo-sharing`): there is no "save to
  Downloads" on iOS, so sharing is how a file leaves the app on both platforms.

## Notifications + push

- **Merged inbox** (`useCustomerInbox`) — announcements + `/v1/customer/notifications`, newest-first; row tap marks read and follows `href` (e.g. `/campaigns/:id`).
- **Push deep links** — `usePushRegistration` reads `data.href` from cold start, background, and foreground taps; sign-in re-registers so `clerk_user_id` is linked immediately (`userId` in effect deps).

---

## Building an APK for the team

From **`apps/customer-mobile`** (not repo root):

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Download the APK from the EAS dashboard when the build completes. See [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md) for OTA updates, local debug APKs, and ops app builds.
