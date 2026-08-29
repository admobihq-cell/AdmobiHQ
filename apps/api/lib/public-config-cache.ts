type FlagRow = { key: string; enabled: boolean }

const PUBLIC_CONFIG_TTL_MS = 300_000

let cache: { rows: FlagRow[]; expiresAt: number } | null = null

export function getCachedPublicFlags(): FlagRow[] | null {
  if (!cache || cache.expiresAt < Date.now()) return null
  return cache.rows
}

export function setCachedPublicFlags(rows: FlagRow[]) {
  cache = { rows, expiresAt: Date.now() + PUBLIC_CONFIG_TTL_MS }
}

export function invalidatePublicConfigCache() {
  cache = null
}
