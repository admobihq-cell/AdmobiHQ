/** Tools that only need a URL string (Next build, Prisma generate) — no connection is made. */
export const BUILD_PLACEHOLDER_DATABASE_URL =
  "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public"

/**
 * Resolve Postgres URL from common Infisical / host env key names.
 */
export function resolveDatabaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ]

  for (const value of candidates) {
    const trimmed = value?.trim()
    if (trimmed) {
      return trimmed
    }
  }

  return undefined
}

export function resolvePayloadDatabaseUrl(): string | undefined {
  const dedicated = process.env.PAYLOAD_DATABASE_URL?.trim()
  if (dedicated) {
    return dedicated
  }
  return resolveDatabaseUrl()
}

function isBuildTimeWithoutDatabase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.argv.some((arg) => arg.includes("prisma") && process.argv.includes("generate"))
  )
}

/**
 * Payload config must load during `next build` even when CI has no `.env.local`.
 * Use a placeholder URL in that phase; runtime still requires a real connection string.
 */
export function resolvePayloadDatabaseUrlForConfig(): string {
  const resolved = resolvePayloadDatabaseUrl()
  if (resolved) {
    return resolved
  }

  if (isBuildTimeWithoutDatabase()) {
    return BUILD_PLACEHOLDER_DATABASE_URL
  }

  throw new Error("DATABASE_URL is not set. Add it to apps/web/.env.local")
}
