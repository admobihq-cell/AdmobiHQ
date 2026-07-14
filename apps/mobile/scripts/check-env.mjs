import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = resolve(mobileRoot, ".env.local")

function trimQuotes(value) {
  return value.replace(/^["']|["']$/g, "").trim()
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=")
        if (index === -1) return null
        return [
          line.slice(0, index).trim(),
          trimQuotes(line.slice(index + 1)),
        ]
      })
      .filter(Boolean),
  )
}

const vars = parseEnvFile(envPath)
const clerk =
  vars.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  vars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  ""
const ops =
  vars.EXPO_PUBLIC_OPS_URL ?? vars.NEXT_PUBLIC_OPS_URL ?? ""

let failed = false

if (!existsSync(envPath)) {
  console.error("[mobile env:check] Missing apps/mobile/.env.local")
  console.error("  Run: npm run env:pull -w mobile")
  failed = true
}

if (!clerk) {
  console.error(
    "[mobile env:check] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in Infisical)",
  )
  failed = true
} else if (!clerk.startsWith("pk_")) {
  console.error(
    "[mobile env:check] Clerk publishable key must start with pk_test_ or pk_live_",
  )
  failed = true
}

if (!ops) {
  console.warn(
    "[mobile env:check] EXPO_PUBLIC_OPS_URL not set — defaulting to http://localhost:3001",
  )
} else if (ops.includes("localhost") || ops.includes("127.0.0.1")) {
  console.warn(
    "[mobile env:check] OPS URL uses localhost — use your LAN IP (e.g. http://192.168.x.x:3001) when testing on a physical device",
  )
}

if (failed) {
  process.exit(1)
}

console.log("[mobile env:check] OK")
