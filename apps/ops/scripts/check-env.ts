const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const

const optional = [
  "NEXT_PUBLIC_OPS_URL",
  "NEXT_PUBLIC_WEB_URL",
  "PAYLOAD_SECRET",
] as const

function clerkKeyMode(value: string): "test" | "live" | null {
  if (value.startsWith("pk_test_") || value.startsWith("sk_test_")) return "test"
  if (value.startsWith("pk_live_") || value.startsWith("sk_live_")) return "live"
  return null
}

function trimQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim()
}

let missing = false
let invalid = false

for (const key of required) {
  const raw = process.env[key]?.trim()
  if (!raw) {
    console.error(`[ops env:check] Missing required: ${key}`)
    missing = true
    continue
  }

  const value = trimQuotes(raw)
  if (value !== raw) {
    console.error(
      `[ops env:check] ${key} has surrounding quotes — remove quotes in Infisical`,
    )
    invalid = true
  }
}

const publishable = trimQuotes(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "")
const secret = trimQuotes(process.env.CLERK_SECRET_KEY ?? "")

if (publishable && !publishable.startsWith("pk_")) {
  console.error(
    "[ops env:check] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_",
  )
  invalid = true
}

if (secret && !secret.startsWith("sk_")) {
  console.error("[ops env:check] CLERK_SECRET_KEY must start with sk_test_ or sk_live_")
  invalid = true
}

const pubMode = clerkKeyMode(publishable)
const secMode = clerkKeyMode(secret)

if (pubMode && secMode && pubMode !== secMode) {
  console.error(
    `[ops env:check] Clerk key mismatch: publishable is ${pubMode} but secret is ${secMode}. Both must be test or both live, from the same Clerk app.`,
  )
  invalid = true
}

for (const key of optional) {
  if (!process.env[key]?.trim()) {
    console.warn(`[ops env:check] Optional not set: ${key}`)
  }
}

if (missing || invalid) {
  console.error(
    "\n[ops env:check] Fix Clerk keys in Infisical (dev env) from:",
  )
  console.error(
    "  https://dashboard.clerk.com/last-active?path=api-keys",
  )
  console.error("  App: app_3GALZRS50nwbrWeiFLZXxsgDIid")
  console.error("  Then: npm run env:pull -w ops && npm run env:check -w ops")
  process.exit(1)
}

console.log("[ops env:check] OK")
