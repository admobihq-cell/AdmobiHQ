import "../lib/load-env.ts"

const keys = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "PAYLOAD_SECRET",
  "NEXT_PUBLIC_SERVER_URL",
  "BLOB_READ_WRITE_TOKEN",
  "API_KEY_PEXELS",
  "RESEND_API_KEY",
  "SENDER_EMAIL",
  "ADMIN_EMAIL",
  "TEST_RECIPIENT_EMAIL",
]

console.log("apps/web/.env.local, keys present:\n")

for (const key of keys) {
  const value = process.env[key]
  console.log(`  ${key}: ${value ? "set" : "MISSING"}`)
}

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (url) {
  try {
    const host = new URL(url.replace(/^postgres(ql)?:\/\//, "https://")).hostname
    console.log(`\n  DB host: ${host}`)
  } catch {
    console.log("\n  (could not parse database URL)")
  }
}
