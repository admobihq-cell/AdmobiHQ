import { EXPO_PUBLIC_WEB_URL } from "@/lib/env"

const DEFAULT_WEB_URL = "https://admobihq.com"

function webPublicUrl(): string {
  return EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "") || DEFAULT_WEB_URL
}

export const TERMS_URL = `${webPublicUrl()}/terms`
export const PRIVACY_URL = `${webPublicUrl()}/privacy`
