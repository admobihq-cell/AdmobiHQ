/** Tools that only need a URL string — no connection is made. */
export const BUILD_PLACEHOLDER_DATABASE_URL =
  "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public"

/**
 * Resolve Postgres URL from common Infisical / host env key names.
 * Direct (unpooled) Neon hosts are fine here — migrations need them.
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

/**
 * Neon serverless functions should use the PgBouncer pooler endpoint
 * (`ep-xxx-pooler.region.aws.neon.tech`). Direct connections hold a
 * Postgres session and keep compute from suspending.
 */
export function preferNeonPooledConnectionString(connectionString: string): string {
  try {
    const parsed = new URL(connectionString)
    const host = parsed.hostname
    if (!host.endsWith(".neon.tech") || host.includes("-pooler")) {
      return connectionString
    }
    parsed.hostname = host.replace(/^([^.]+)/, "$1-pooler")
    return parsed.toString()
  } catch {
    return connectionString
  }
}

/** Runtime queries (Prisma, `pg`, Payload) — prefer Neon's pooler. */
export function resolveRuntimeDatabaseUrl(): string | undefined {
  const raw = resolveDatabaseUrl()
  return raw ? preferNeonPooledConnectionString(raw) : undefined
}
