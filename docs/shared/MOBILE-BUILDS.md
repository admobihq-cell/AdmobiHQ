# Mobile builds, APKs, and OTA updates

Guide for the **three Expo apps** in this monorepo: local dev, installable APKs, team distribution, and over-the-air (OTA) JS updates.

**Related:** [APP-MOBILE.md](../customer/APP-MOBILE.md) (customer) · [MOBILE-OPS.md](../ops/MOBILE-OPS.md) (ops) · [DRIVER-APP.md](../driver/DRIVER-APP.md) (driver) · [DEV-SETUP.md](./DEV-SETUP.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Three apps

| | **Ops** | **Customer** | **Driver** |
|---|---------|--------------|------------|
| Folder | `apps/ops-mobile` | `apps/customer-mobile` | `apps/driver-mobile` |
| Display name | Admobi Ops | Admobi | Admobi Driver |
| Android package | `com.admobihq.ops` | `com.admobihq.app` | `com.admobihq.driver` |
| EAS slug | `admobihq-ops` | `admobihq-app` | `admobihq-driver` |
| EAS project | `@admobimedia/admobihq-ops` | `@admobimedia/admobihq-app` | `@admobimedia/admobihq-driver` |
| Metro port | **8081** | **8082** | **8083** |
| Auth | Clerk (ops staff, always on) | Clerk (flag-gated) | Clerk (flag-gated) |
| Config | [`apps/ops-mobile/app.json`](../../apps/ops-mobile/app.json) | [`apps/customer-mobile/app.json`](../../apps/customer-mobile/app.json) | [`apps/driver-mobile/app.json`](../../apps/driver-mobile/app.json) |
| EAS profiles | [`apps/ops-mobile/eas.json`](../../apps/ops-mobile/eas.json) | [`apps/customer-mobile/eas.json`](../../apps/customer-mobile/eas.json) | [`apps/driver-mobile/eas.json`](../../apps/driver-mobile/eas.json) |

Always run **`eas` commands from the app folder**, not the repo root. On PowerShell use `;` instead of `&&`:

```powershell
cd apps\customer-mobile; npx eas-cli build -p android --profile preview
```

---

## Three ways to run the app

| Mode | Install | Needs Metro on a dev machine? | Custom splash / icon | Team share |
|------|---------|--------------------------------|----------------------|------------|
| **Expo Go** | Expo Go from Play Store | Yes | No (Expo branding) | No |
| **Local debug APK** | `app-debug.apk` from Gradle | **Yes** (dev client) | Yes | No |
| **EAS preview APK** | Download link from EAS | **No** (JS bundled) | Yes | **Yes** |

### Expo Go (fastest for UI work)

```bash
npm run dev -w ops-mobile          # ops, port 8081
npm run dev -w customer-mobile   # customer, port 8082
npm run dev -w driver-mobile     # driver, port 8083
npm run dev:all                  # web stack + all three Expo apps
npm run dev:mobile               # ops, clears Metro cache
npm run dev:mobile:customer      # customer, clears Metro cache
npm run dev:mobile:driver       # driver, clears Metro cache
```

Expo Go cannot show your native splash or launcher icon. The apps include a **JS splash** (`BrandedSplashScreen`) so Admobi branding still appears while loading.

### Local debug APK (your machine only)

Built with Gradle after `expo prebuild`:

```bash
npm run mobile:apk:local           # all three apps
npm run mobile:apk:local:ops       # ops only
npm run mobile:apk:local:customer  # customer only
npm run mobile:apk:local:driver    # driver only
```

Output:

```
apps/ops-mobile/android/app/build/outputs/apk/debug/app-debug.apk
apps/customer-mobile/android/app/build/outputs/apk/debug/app-debug.apk
apps/driver-mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Requires:** Android SDK (Android Studio), `JAVA_HOME` pointing at Android Studio JBR, network for Gradle deps.

These are **development clients** (`expo-dev-client`). They expect Metro running on the same Wi‑Fi. Do **not** distribute these to the team as standalone apps.

### EAS preview APK (team distribution)

Cloud build on [expo.dev](https://expo.dev). JS is embedded — **no Metro required** after install.

**One-time per machine:**

```bash
npx eas-cli login
```

**One-time per app** (already done if `app.json` contains `extra.eas.projectId`):

```powershell
cd apps\ops-mobile; npx eas-cli init
cd apps\customer-mobile; npx eas-cli init
```

**Build shareable APKs:**

```powershell
cd apps\ops-mobile
npx eas-cli build -p android --profile preview

cd apps\customer-mobile
npx eas-cli build -p android --profile preview
```

Or from repo root:

```bash
npm run mobile:apk:eas:ops
npm run mobile:apk:eas:customer
npm run mobile:apk:eas    # both sequentially
```

When the build finishes, open the link in the terminal or on [expo.dev](https://expo.dev) → project → Builds → download **APK**.

The `preview` profile in `eas.json` sets `buildType: "apk"` and `channel: "preview"`.

---

## Keystores and “remote Android credentials”

On the first EAS Android build, Expo asks to generate a keystore. Choose **yes** — Expo stores the signing key in the cloud (“remote credentials”).

| Why it matters | |
|----------------|---|
| Same key on every build | Users can install updates over the old APK |
| Per-app keys | Ops and Customer each have their own keystore |
| No local key management | Team does not need `keytool` or `.jks` files on laptops |

Do not lose access to the Expo account that owns these projects; that account controls signing for future releases.

---

## Over-the-air (OTA) updates

OTA pushes **JavaScript and assets** to installed apps without reinstalling the APK. Implemented with [`expo-updates`](https://docs.expo.dev/versions/latest/sdk/updates/) and EAS Update.

### What OTA can and cannot do

| Change | OTA? | Action |
|--------|------|--------|
| Screens, copy, styles, business logic | Yes | `eas update` |
| Ops push token registration & tap handlers | Yes | `eas update` |
| Images bundled in JS | Yes | `eas update` |
| New native module / Expo plugin | No | New `eas build` |
| `runtimeVersion` change | No | New `eas build` |
| Android permissions / native config | No | New `eas build` |

### Setup (once per app, after first successful EAS build)

```powershell
cd apps\ops-mobile; npx eas-cli update:configure
cd apps\customer-mobile; npx eas-cli update:configure
```

This adds `updates.url` to `app.json` (if missing) and links the app to EAS Update.

### Push an update to team devices

Apps built with the `preview` profile listen on the **`preview`** channel:

```powershell
cd apps\customer-mobile
npx eas-cli update --channel preview --environment preview --message "Describe the change"

cd apps\ops-mobile
npx eas-cli update --channel preview --environment preview --message "Describe the change"
```

**Important:** Always pass `--environment preview` (or `production`) when publishing OTA from a dev machine. Without it, Expo bundles your local `.env.local` values — e.g. `http://192.168.x.x:3003` — into the update, and preview APKs on team phones will stop reaching the deployed API.

Or use workspace scripts (they include `--environment`):

```bash
npm run update:preview -w customer-mobile
npm run update:preview -w ops-mobile
```

On launch, production/preview builds check for updates in the background (`lib/bootstrap-splash.ts` → `useOtaUpdates`). Once downloaded, the app shows a native "Update ready — Restart now?" prompt (same one the manual Settings/Profile "Check for updates" button already used) rather than silently waiting for the next cold start — **same APK, no reinstall** either way.

### OTA auto-notify (customer-mobile only) {#ota-auto-notify}

`npm run update:preview` / `update:production -w customer-mobile` do one more thing after the JS publish succeeds: they run `scripts/notify-app-update.mjs`, which sends a **real push notification** ("Admobi has a new update…") to every customer device with a registered token — via the same `POST /v1/notifications/broadcast` pipeline ops staff use to send announcements, authenticated with `CRON_SECRET` instead of a Clerk session (see [API.md](../api/API.md#service-to-service-auth)).

This fires on **every publish, on every channel** — there is no separate staging backend for this app, so a `preview` push and a `production` push both notify the exact same real customer audience. There is currently no way to publish JS-only without also notifying; if you need a silent OTA push (e.g. a same-day follow-up fix), that's a gap, not a flag you're missing.

Requires `CRON_SECRET` in the environment the script runs in — it fails soft (warns, exits 0) if unset, so a missing secret never blocks the OTA publish itself, it just means no notification goes out. **ops-mobile's** `update:*` scripts are not wired to this — pushing an ops-mobile update never notifies anyone.

### `runtimeVersion`

Both apps use a **fixed string** (required because `android/` exists from prebuild — bare workflow):

```json
"version": "0.0.1",
"runtimeVersion": "0.0.1"
```

When you ship a **new native build**, bump **both** `version` and `runtimeVersion` together (e.g. `"0.0.2"`). OTA updates only apply to builds with the same `runtimeVersion`.

Do **not** use `"runtimeVersion": { "policy": "appVersion" }` while the `android/` folder is present — EAS Build will fail.

---

## Brand assets (icons and splash)

Source logos live in [`assets/brand/`](../../assets/brand) (`logo.png`, `logo_typemark.png`).

Expo reads paths from each app’s `assets/images/`, not `assets/brand/` directly. Regenerate launcher icons and splash PNGs from brand sources:

```bash
npm run mobile:assets:sync
```

After changing icons, either:

- Run **`eas build`** again (EAS runs prebuild in the cloud), or
- Locally: `npm run mobile:prebuild` then rebuild APK

Native splash and Android **mipmap** launcher icons are baked into the APK at build time.

---

## EAS build profiles

Defined in each app’s `eas.json`:

| Profile | Purpose | Output | OTA channel |
|---------|---------|--------|-------------|
| `development` | Dev client with debugging | Internal | `development` |
| `preview` | **Team testing** — standalone APK | `.apk` download | `preview` |
| `production` | Store-ready / prod APK | `.apk` (configurable) | `production` |

For internal team distribution, use **`preview`**.

---

## GitHub Actions release APKs (tag-triggered)

A separate path from running `eas build` by hand: [`android-release-ops-mobile.yml`](../../.github/workflows/android-release-ops-mobile.yml), [`android-release-customer-mobile.yml`](../../.github/workflows/android-release-customer-mobile.yml), and [`android-release-driver-mobile.yml`](../../.github/workflows/android-release-driver-mobile.yml) build a release APK on a tag push and attach it to a **GitHub Release** — useful for stakeholders who want a direct-download APK without an Expo account. The three workflows do **not** all build the same way — see the two patterns below.

**Trigger (all three):** a version tag push or a manual run only. These do **not** run on every push to `master` or on pull requests — that was removed because the workflows previously watched the shared root `package.json`/`package-lock.json`, so any dependency change anywhere in the monorepo fired a full native Android build for every app.

```bash
# Cut an ops release
git tag ops-v0.0.5 && git push origin ops-v0.0.5

# Cut a customer release
git tag customer-v0.0.5 && git push origin customer-v0.0.5

# Cut a driver release
git tag driver-v0.0.1 && git push origin driver-v0.0.1
```

Or run manually from the GitHub Actions tab → select the workflow → **Run workflow**.

Output: a GitHub Release named e.g. `Ops App APK - <short-sha>` with `admobihq-ops-<short-sha>.apk` attached (`admobihq-customer-<short-sha>.apk` / `admobihq-driver-<short-sha>.apk` for the other two apps).

### Pattern 1 — ops-mobile / customer-mobile: local Gradle build, keystore from a GH secret

**Required repo secrets** (`OPS_*` / `CUSTOMER_*` prefixed per app): `EXPO_PUBLIC_API_URL`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (ops also needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; customer also needs `EXPO_PUBLIC_APP_URL`). The workflow decodes the keystore, runs `./gradlew assembleRelease` directly on the GitHub runner, and fails fast with a clear message if any secret is missing.

**Known gap:** neither app's checked-in `android/app/build.gradle` actually reads the `keystore.properties` file the workflow writes — the `release` build type is hardcoded to `signingConfigs.debug`. So today, both workflows decode a real keystore from secrets but then **sign the "release" APK with the plain committed debug keystore** regardless. Worth fixing to match driver's setup below — but changing the actual signing key on an app with previously-installed release APKs breaks in-place updates for existing installs (Android refuses to install an update signed with a different key), so treat it as a deliberate rollout, not a drive-by fix.

### Pattern 2 — driver-mobile: EAS cloud build, remote-managed credentials

driver-mobile's workflow does not build locally or handle a keystore file at all. It calls `eas build --platform android --profile production --non-interactive --wait`, which builds on Expo's infrastructure using the **remote Android credentials already stored on EAS** for `@admobimedia/admobihq-driver` (generated once via `eas build`'s automatic non-interactive keystore creation — nobody downloaded or handled the private key directly), then downloads the resulting `buildUrl` artifact and attaches it to the release exactly like the other two.

**Required repo secret:** `DRIVER_EXPO_TOKEN` — an Expo access token (expo.dev → account settings → **Access Tokens** → Create) with permission to build `@admobimedia/admobihq-driver`. No `ANDROID_KEYSTORE_*` secrets exist or are needed for driver — the signing key never leaves Expo's servers. `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_DRIVER_URL` are configured as EAS project environment variables (`eas env:set production --name ... --value ...`) rather than GitHub secrets, since `eas build` reads them from there, not from a `.env.local` written by the workflow.

Access tokens are revocable (expo.dev → Access Tokens → Revoke) and safe to rotate anytime, unlike a keystore — if `DRIVER_EXPO_TOKEN` ever leaks, revoke and reissue it with no impact on already-published builds.

**Caveat:** this signs with the keystore stored in those `ANDROID_KEYSTORE_BASE64` secrets, built locally via Gradle — separate from the EAS-managed remote keystore described above. Confirm whether it's the *same* key before assuming a GitHub-Release APK can install as an update over an EAS-built APK (or vice versa); Android refuses to install an update signed with a different key than what's already on the device.

---

## Command cheat sheet

### Development

| Command | App |
|---------|-----|
| `npm run dev:stack:mobile` | **API :3003 + both Expo apps** — pulls api/mobile secrets only |
| `npm run dev:stack:mobile:ops` | API + ops Expo (:8081) |
| `npm run dev:stack:mobile:customer` | API + customer Expo (:8082) |
| `npm run dev -w ops-mobile` | Ops Metro only (:8081) — start API separately |
| `npm run dev -w customer-mobile` | Customer Metro only (:8082) |
| `npm run dev:clear -w ops-mobile` | Ops — clear Metro cache |
| `npm run run:android -w ops-mobile` | Ops — install dev build on connected device/emulator |

### APK builds (Android)

| Command | What it produces |
|---------|------------------|
| `npm run mobile:apk:local:ops` | Local debug APK (needs Metro) |
| `npm run mobile:apk:local:customer` | Local debug APK (needs Metro) |
| `npm run mobile:apk:eas:ops` | EAS preview APK — **share with team** |
| `npm run mobile:apk:eas:customer` | EAS preview APK — **share with team** |

### IPA builds (iOS)

There is no local option — iOS builds require macOS + Xcode, so these always run on EAS's cloud build servers regardless of your dev machine's OS.

| Command | What it produces |
|---------|------------------|
| `npm run mobile:ipa:eas:ops` | EAS preview build for ops (`.ipa`, ad hoc/internal distribution) |
| `npm run mobile:ipa:eas:customer` | EAS preview build for customer (`.ipa`, ad hoc/internal distribution) |
| `npm run mobile:ipa:eas` | Both apps sequentially |
| `npm run build:ios:production -w ops-mobile` | App Store–ready build (ops) |
| `npm run build:ios:production -w customer-mobile` | App Store–ready build (customer) |

**One-time setup before the first iOS build:** you need an Apple Developer Program account. Run `npx eas-cli build --platform ios --profile preview` interactively (not `--non-interactive`) once per app so EAS can walk you through Apple sign-in, provisioning profile, and distribution certificate generation — after that, remote credentials are stored on EAS and the `npm run mobile:ipa:eas:*` scripts work non-interactively. Internal-distribution (preview/ad hoc) builds also require registering test devices' UDIDs with `npx eas-cli device:create` before they can install.

### OTA

| Command | When |
|---------|------|
| `npx eas-cli update:configure` | Once per app after first EAS build |
| `npm run update:preview -w ops-mobile` | After JS/UI changes to ops app |
| `npm run update:preview -w customer-mobile` | After JS/UI changes to customer app |

### Env

| Command | Notes |
|---------|--------|
| `npm run env:pull -w ops-mobile` | Maps `EXPO_PUBLIC_*` + Clerk for ops |
| `npm run env:pull -w customer-mobile` | Maps `EXPO_PUBLIC_*`, incl. Clerk keys (see [AUTH.md](./AUTH.md)) |

---

## Typical team workflow

1. **Build once:** `eas build -p android --profile preview` in each app folder.
2. **Share** the EAS download links; team installs APK on Android phones.
3. **Run** `eas update:configure` once per app.
4. **Develop** with `npm run dev -w ops-mobile` / `customer-mobile` as usual.
5. **Ship JS changes:** `eas update --channel preview` — team gets updates without reinstalling.
6. **New native dependency?** Bump `version` + `runtimeVersion`, run `eas build` again.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `eas build` from repo root targets wrong project | `cd apps/ops-mobile` or `apps/customer-mobile` first |
| PowerShell `&&` error | Use `;` — e.g. `cd apps\ops-mobile; npx eas-cli init` |
| `runtimeVersion` policy error on EAS | Use `"runtimeVersion": "0.0.1"` string, not `{ "policy": "appVersion" }` |
| Expo Go shows no custom splash | Expected — use EAS preview APK or dev build |
| Debug APK opens but blank / “could not connect” | Start Metro: `npm run dev -w ops-mobile` on same network |
| Turbo dev swallows `a` / `r` keys | Select task, press **`i`** to interact, or run Expo in a separate terminal |
| Gradle `JAVA_HOME` not set | Point at Android Studio JBR: `C:\Program Files\Android\Android Studio\jbr` |
| Local Gradle network errors | Retry when online, or use EAS Build (cloud) |

---

## Dashboard links

- Ops: [expo.dev/accounts/admobimedia/projects/admobihq-ops](https://expo.dev/accounts/admobimedia/projects/admobihq-ops)
- Customer: [expo.dev/accounts/admobimedia/projects/admobihq-app](https://expo.dev/accounts/admobimedia/projects/admobihq-app)

Expo org account: **`admobimedia`** (`owner` in each `app.json`).
