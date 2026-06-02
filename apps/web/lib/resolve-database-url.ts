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
