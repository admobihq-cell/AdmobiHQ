/** Tools that only need a URL string (Next build, Prisma generate) — no connection is made. */
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

/** Runtime queries (Prisma, Payload) — prefer Neon's pooler. */
export function resolveRuntimeDatabaseUrl(): string | undefined {
  const raw = resolveDatabaseUrl()
  return raw ? preferNeonPooledConnectionString(raw) : undefined
}

/**
 * Payload on Vercel must use the Neon pooler. The unpooled compute host is
 * IPv6-first and routinely exceeds `pg` connect timeouts from Fluid
 * (`timeout exceeded when trying to connect`). Drizzle already emits
 * `"cms"."table"` SQL when `schemaName` is set, so search_path is not required.
 * Local/migrations can keep a direct URL.
 */
export function resolvePayloadDatabaseUrl(): string | undefined {
  const dedicated = process.env.PAYLOAD_DATABASE_URL?.trim()
  const raw = dedicated || resolveDatabaseUrl()
  if (!raw) {
    return undefined
  }
  if (process.env.VERCEL) {
    return preferNeonPooledConnectionString(raw)
  }
  return raw
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
