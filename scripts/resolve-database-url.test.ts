import assert from "node:assert/strict"
import test from "node:test"

import {
  preferNeonPooledConnectionString,
  resolvePayloadDatabaseUrl,
  resolveRuntimeDatabaseUrl,
} from "../apps/web/lib/resolve-database-url.ts"

const DIRECT =
  "postgresql://u:p@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

test("Prisma runtime URL is rewritten to the Neon pooler", () => {
  const prev = process.env.DATABASE_URL
  process.env.DATABASE_URL = DIRECT
  try {
    const url = resolveRuntimeDatabaseUrl()
    assert.ok(url)
    assert.equal(
      new URL(url).hostname,
      "ep-cool-name-123456-pooler.us-east-2.aws.neon.tech",
    )
  } finally {
    process.env.DATABASE_URL = prev
  }
})

test("Payload URL stays on the direct Neon host (Drizzle + cms schema)", () => {
  const prevDb = process.env.DATABASE_URL
  const prevPayload = process.env.PAYLOAD_DATABASE_URL
  process.env.DATABASE_URL = DIRECT
  delete process.env.PAYLOAD_DATABASE_URL
  try {
    const url = resolvePayloadDatabaseUrl()
    assert.ok(url)
    assert.equal(new URL(url).hostname, "ep-cool-name-123456.us-east-2.aws.neon.tech")
    assert.equal(new URL(url).hostname.includes("-pooler"), false)
  } finally {
    process.env.DATABASE_URL = prevDb
    if (prevPayload === undefined) {
      delete process.env.PAYLOAD_DATABASE_URL
    } else {
      process.env.PAYLOAD_DATABASE_URL = prevPayload
    }
  }
})

test("preferNeonPooledConnectionString is a no-op for non-Neon hosts", () => {
  const local = "postgresql://u:p@localhost:5432/admobi"
  assert.equal(preferNeonPooledConnectionString(local), local)
})
