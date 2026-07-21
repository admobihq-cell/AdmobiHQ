import "@/lib/load-env"

import { Pool } from "pg"

import { resolveDatabaseUrl } from "@/lib/resolve-database-url"

let pool: Pool | null = null

export function getPgPool(): Pool {
  if (!pool) {
    const url = resolveDatabaseUrl()
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Run `npm run env:pull -w api` from the repo root.",
      )
    }
    pool = new Pool({ connectionString: url })
  }
  return pool
}
