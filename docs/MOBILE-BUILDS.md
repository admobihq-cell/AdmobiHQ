# Mobile builds, APKs, and OTA updates

Guide for **Expo** apps in this monorepo: local dev, installable APKs, team distribution, and over-the-air (OTA) JS updates.

**Related:** [APP-MOBILE.md](./APP-MOBILE.md) (customer app) · [DEV-SETUP.md](./DEV-SETUP.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Two apps

| | **Ops** | **Customer** |
|---|---------|--------------|
| Folder | `apps/ops-mobile` | `apps/customer-mobile` |
| Display name | Admobi Ops | Admobi |
| Android package | `com.admobihq.ops` | `com.admobihq.app` |
| EAS slug | `admobihq-ops` | `admobihq-app` |
| EAS project | `@admobimedia/admobihq-ops` | `@admobimedia/admobihq-app` |
| Metro port | **8081** | **8082** |
| Auth | Clerk (ops staff) | None |
| Config | [`apps/ops-mobile/app.json`](../apps/ops-mobile/app.json) | [`apps/customer-mobile/app.json`](../apps/customer-mobile/app.json) |
| EAS profiles | [`apps/ops-mobile/eas.json`](../apps/ops-mobile/eas.json) | [`apps/customer-mobile/eas.json`](../apps/customer-mobile/eas.json) |

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
npm run dev -w customer-mobile      # customer, port 8082
npm run dev:all                # both + web stack (Turbo TUI — press `i` on a task to send keys to Expo)
npm run dev:mobile             # ops, clears Metro cache
npm run dev:mobile:customer    # customer, clears Metro cache
```

Expo Go cannot show your native splash or launcher icon. The apps include a **JS splash** (`BrandedSplashScreen`) so Admobi branding still appears while loading.

### Local debug APK (your machine only)

Built with Gradle after `expo prebuild`:

```bash
npm run mobile:apk:local           # both apps
npm run mobile:apk:local:ops       # ops only
npm run mobile:apk:local:customer  # customer only
```

Output:

```
apps/ops-mobile/android/app/build/outputs/apk/debug/app-debug.apk
apps/customer-mobile/android/app/build/outputs/apk/debug/app-debug.apk
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
npx eas-cli update --channel preview --message "Describe the change"

cd apps\ops-mobile
npx eas-cli update --channel preview --message "Describe the change"
```

Or use workspace scripts:

```bash
npm run update:preview -w customer-mobile
npm run update:preview -w ops-mobile
```

On launch, production/preview builds check for updates (see `lib/bootstrap-splash.ts` → `useOtaUpdates`). Users get the new JS on next open — **same APK, no reinstall**.

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

Source logos live in [`assets/brand/`](../assets/brand/) (`logo.png`, `logo_typemark.png`).

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

### APK builds

| Command | What it produces |
|---------|------------------|
| `npm run mobile:apk:local:ops` | Local debug APK (needs Metro) |
| `npm run mobile:apk:local:customer` | Local debug APK (needs Metro) |
| `npm run mobile:apk:eas:ops` | EAS preview APK — **share with team** |
| `npm run mobile:apk:eas:customer` | EAS preview APK — **share with team** |

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
| `npm run env:pull -w customer-mobile` | Maps `EXPO_PUBLIC_*` (no Clerk) |

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
