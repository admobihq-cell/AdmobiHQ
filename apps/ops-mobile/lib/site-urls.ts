import { WEB_URL } from "@/lib/env"

/** Mirrors apps/ops/lib/site-urls.ts so the mobile Content screen links to the same CMS admin. */
export function cmsAdminUrl(): string {
  return `${WEB_URL.replace(/\/$/, "")}/admin`
}

/** Host + path label for CMS admin link copy, e.g. "admobihq.com/admin". */
export function cmsAdminLabel(): string {
  try {
    const { host } = new URL(WEB_URL)
    return `${host}/admin`
  } catch {
    return "admobihq.com/admin"
  }
}
