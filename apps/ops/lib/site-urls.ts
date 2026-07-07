const DEFAULT_WEB_URL = "http://localhost:3000"
const DEFAULT_OPS_URL = "http://localhost:3001"

function normalizeOrigin(raw: string | undefined, fallback: string): string {
  const value = raw?.trim()
  if (!value) {
    return fallback
  }
  try {
    return new URL(value.replace(/\/$/, "")).origin
  } catch {
    return fallback
  }
}

/** Marketing site origin (Payload admin, CMS links). */
export function webPublicUrl(): string {
  return normalizeOrigin(
    process.env.NEXT_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_SERVER_URL,
    DEFAULT_WEB_URL,
  )
}

/** Ops console public origin. */
export function opsPublicUrl(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_OPS_URL, DEFAULT_OPS_URL)
}

export function cmsAdminUrl(): string {
  return `${webPublicUrl()}/admin`
}

/** Host label for UI, e.g. ops.admobihq.com */
export function opsHostLabel(): string {
  try {
    return new URL(opsPublicUrl()).host
  } catch {
    return "ops.admobihq.com"
  }
}

/** Host + path label for CMS admin link copy. */
export function cmsAdminLabel(): string {
  try {
    const { host } = new URL(webPublicUrl())
    return `${host}/admin`
  } catch {
    return "admobihq.com/admin"
  }
}
