const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:19006",
  "exp://localhost:8081",
  "exp://localhost:8082",
]

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.OPS_CORS_ORIGINS
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  }
  return DEFAULT_ALLOWED_ORIGINS
}

function isDevLanOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false

  if (origin.startsWith("exp://")) {
    try {
      const { hostname } = new URL(origin)
      if (hostname === "localhost" || hostname === "127.0.0.1") return true
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
      if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
      if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return true
      }
    } catch {
      return false
    }
  }

  try {
    const url = new URL(origin)
    if (!["http:", "https:"].includes(url.protocol)) return false
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true
    }
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
      return true
    }
  } catch {
    return false
  }

  return false
}

export function isAllowedCorsOrigin(origin: string | null): origin is string {
  if (!origin) return false
  if (getAllowedOrigins().includes(origin)) return true
  return isDevLanOrigin(origin)
}

export function corsHeaders(origin: string | null): HeadersInit {
  if (!isAllowedCorsOrigin(origin)) {
    return {}
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}
