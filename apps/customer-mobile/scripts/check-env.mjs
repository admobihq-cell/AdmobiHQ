import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = resolve(appRoot, ".env.local")

const recommended = ["EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_APP_URL"]

if (!existsSync(envPath)) {
  console.warn("[customer-mobile env:check] No .env.local — run npm run env:pull -w customer-mobile")
  process.exit(0)
}

const content = readFileSync(envPath, "utf8")
const present = new Set(
  content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0]?.trim())
    .filter(Boolean),
)

const missing = recommended.filter((key) => !present.has(key))
if (missing.length) {
  console.warn(
    `[customer-mobile env:check] Optional keys missing: ${missing.join(", ")}`,
  )
} else {
  console.log("[customer-mobile env:check] OK")
}
