import "@/lib/load-env"

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

import { resolveDatabaseUrl } from "@/lib/resolve-database-url"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const databaseUrl = resolveDatabaseUrl()

if (!databaseUrl && process.env.NODE_ENV !== "production") {
  console.warn(
    "[api] DATABASE_URL not set. Run `npm run env:pull -w api` (or ensure apps/web/.env.local exists).",
  )
}

const pool = new Pool({
  connectionString: databaseUrl,
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
