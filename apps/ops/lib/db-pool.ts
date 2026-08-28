import "@/lib/load-env"

import { attachDatabasePool } from "@vercel/functions"
import { Pool } from "pg"

import { resolveRuntimeDatabaseUrl } from "@/lib/resolve-database-url"

const globalForPool = globalThis as unknown as { pgPool: Pool | undefined }

function createPool(): Pool {
  const connectionString = resolveRuntimeDatabaseUrl()
  if (!connectionString && process.env.NODE_ENV !== "production") {
    console.warn(
      "[ops] DATABASE_URL not set. Run `npm run env:pull -w ops` (or ensure apps/web/.env.local exists).",
    )
  }

  const isServerless = Boolean(process.env.VERCEL)
  const isNeon = Boolean(connectionString?.includes("neon.tech"))

  const pool = new Pool({
    connectionString,
    // Serverless: one client per lambda. Neon from a long-lived `next dev`
    // process: keep the cap low so idle sessions don't block scale-to-zero.
    max: isServerless ? 1 : isNeon ? 3 : 10,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  })

  pool.on("error", (err) => {
    console.error("[ops/pg] Idle client error:", err.message)
  })

  if (isServerless) {
    attachDatabasePool(pool)
  }

  return pool
}

export function getPgPool(): Pool {
  if (!globalForPool.pgPool) {
    globalForPool.pgPool = createPool()
  }
  return globalForPool.pgPool
}
