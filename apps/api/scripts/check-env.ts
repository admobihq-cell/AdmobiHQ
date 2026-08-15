const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_ORG_ID",
  "DRIVER_CLERK_SECRET_KEY",
] as const

const optional = [
  "NEXT_PUBLIC_API_URL",
  "API_CORS_ORIGINS",
  "resend_api_key",
  "SENDER_EMAIL",
  "ADMIN_EMAIL",
  "BLOB_READ_WRITE_TOKEN",
  "CLOUDINARY_URL",
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

const driverSecret = trimQuotes(process.env.DRIVER_CLERK_SECRET_KEY ?? "")
if (driverSecret && !driverSecret.startsWith("sk_")) {
  console.error(
    "[api env:check] DRIVER_CLERK_SECRET_KEY must start with sk_test_ or sk_live_",
  )
  invalid = true
}
if (driverSecret && driverSecret === secret) {
  console.error(
    "[api env:check] DRIVER_CLERK_SECRET_KEY must not equal CLERK_SECRET_KEY — they are different Clerk instances (ops vs driver).",
  )
  invalid = true
}

const orgId = trimQuotes(process.env.CLERK_ORG_ID ?? "")
if (orgId && !orgId.startsWith("org_")) {
  console.error("[api env:check] CLERK_ORG_ID must start with org_")
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
