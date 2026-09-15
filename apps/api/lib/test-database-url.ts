import { existsSync, readFileSync } from "node:fs"

/**
 * Database URL for the DB-backed suites. Prefers an exported env var, then
 * falls back to reading apps/web/.env.local off disk (cwd = apps/api).
 *
 * The fallback matters: Vitest does not load .env files into process.env here,
 * so suites that only read `process.env.DATABASE_URL` skip silently on a
 * developer machine that has the URL sitting in .env.local.
 *
 * CI deliberately does not inject the URL — waking Neon on every PR — so these
 * suites still skip there, by design.
 */
export function testDatabaseUrl(): string | undefined {
  const fromEnv = process.env.DATABASE_URL?.trim()
  if (fromEnv) return fromEnv

  for (const envPath of ["../web/.env.local", ".env.local"]) {
    if (!existsSync(envPath)) continue

    const line = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((l) => /^\s*DATABASE_URL\s*=/.test(l))
    if (!line) continue

    const value = line
      .replace(/^\s*DATABASE_URL\s*=\s*/, "")
      .replace(/^["']|["']$/g, "")
      .trim()
    if (value) return value
  }

  return undefined
}
