/**
 * Build installable debug APKs locally (no Expo account required).
 * Output: apps/<app>/android/app/build/outputs/apk/debug/app-debug.apk
 *
 * Requires Android SDK + Android Studio JBR (Java).
 * Usage: node scripts/build-apk-local.mjs [ops-mobile|customer-mobile|all]
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sdk = resolve(process.env.LOCALAPPDATA ?? "", "Android", "Sdk")
const javaHome =
  process.env.JAVA_HOME ??
  "C:\\Program Files\\Android\\Android Studio\\jbr"

const target = process.argv[2] ?? "all"
const apps =
  target === "all"
    ? ["ops-mobile", "customer-mobile"]
    : target === "ops-mobile" || target === "customer-mobile"
      ? [target]
      : null

if (!apps) {
  console.error(
    "Usage: node scripts/build-apk-local.mjs [ops-mobile|customer-mobile|all]",
  )
  process.exit(1)
}

if (!existsSync(sdk)) {
  console.error(`Android SDK not found at ${sdk}`)
  console.error("Install Android Studio first.")
  process.exit(1)
}

if (!existsSync(resolve(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java"))) {
  console.error(`Java not found at ${javaHome}`)
  console.error("Set JAVA_HOME to Android Studio JBR.")
  process.exit(1)
}

const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  JAVA_HOME: javaHome,
  PATH: `${resolve(sdk, "platform-tools")};${resolve(javaHome, "bin")};${process.env.PATH ?? ""}`,
}

for (const app of apps) {
  const androidDir = resolve(root, "apps", app, "android")
  const gradlew =
    process.platform === "win32"
      ? resolve(androidDir, "gradlew.bat")
      : resolve(androidDir, "gradlew")

  if (!existsSync(gradlew)) {
    console.log(`[${app}] No android/ folder — running prebuild…`)
    const prebuild = spawnSync(
      "npx",
      ["expo", "prebuild", "--platform", "android"],
      {
        cwd: resolve(root, "apps", app),
        stdio: "inherit",
        shell: true,
        env,
      },
    )
    if (prebuild.status !== 0) process.exit(prebuild.status ?? 1)
  }

  console.log(`\n[${app}] Building debug APK…`)
  const build = spawnSync(gradlew, ["assembleDebug", "-x", "lint", "-x", "test"], {
    cwd: androidDir,
    stdio: "inherit",
    shell: true,
    env,
  })

  if (build.status !== 0) {
    console.error(`[${app}] Build failed.`)
    process.exit(build.status ?? 1)
  }

  const apk = resolve(
    androidDir,
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk",
  )
  console.log(`[${app}] APK ready:\n  ${apk}`)
}

console.log("\nInstall on phone: copy APK to device and open it (allow unknown sources).")
