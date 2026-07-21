const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const

const optional = [
  "NEXT_PUBLIC_API_URL",
  "API_CORS_ORIGINS",
  "RESEND_API_KEY",
  "SENDER_EMAIL",
  "ADMIN_EMAIL",
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
    console.error(`[api env:check] Missing required: ${key}`)
    missing = true
    continue
  }

  const value = trimQuotes(raw)
  if (value !== raw) {
    console.error(
      `[api env:check] ${key} has surrounding quotes — remove quotes in Infisical`,
    )
    invalid = true
  }
}

const publishable = trimQuotes(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "")
const secret = trimQuotes(process.env.CLERK_SECRET_KEY ?? "")

if (publishable && !publishable.startsWith("pk_")) {
  console.error(
    "[api env:check] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_",
  )
  invalid = true
}

if (secret && !secret.startsWith("sk_")) {
  console.error("[api env:check] CLERK_SECRET_KEY must start with sk_test_ or sk_live_")
  invalid = true
}

const pubMode = clerkKeyMode(publishable)
const secMode = clerkKeyMode(secret)

if (pubMode && secMode && pubMode !== secMode) {
  console.error(
    `[api env:check] Clerk key mismatch: publishable is ${pubMode} but secret is ${secMode}.`,
  )
  invalid = true
}

for (const key of optional) {
  if (!process.env[key]?.trim()) {
    console.warn(`[api env:check] Optional not set: ${key}`)
  }
}

if (missing || invalid) {
  console.error("\n[api env:check] Fix env in Infisical, then: npm run env:pull -w api")
  process.exit(1)
}

console.log("[api env:check] OK")
