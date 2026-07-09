import "./load-env"

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { attachDatabasePool } from "@vercel/functions"
import { Pool } from "pg"

import { resolveDatabaseUrl } from "@/lib/resolve-database-url"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPool(): Pool {
  const connectionString = resolveDatabaseUrl()
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to apps/web/.env.local")
  }

  const isServerless = Boolean(process.env.VERCEL)

  const pool = new Pool({
    connectionString,
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: isServerless ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  })

  pool.on("error", (err) => {
    console.error("[prisma/pg] Idle client error:", err.message)
  })

  if (isServerless) {
    attachDatabasePool(pool)
  }

  return pool
}

const pool = globalForPrisma.pool ?? createPool()
if (!globalForPrisma.pool) {
  globalForPrisma.pool = pool
}

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  })

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}
