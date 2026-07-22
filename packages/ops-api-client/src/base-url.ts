const DEFAULT_API_BASE_URL = "http://localhost:3003"

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "")
}

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.EXPO_PUBLIC_API_URL ??
      DEFAULT_API_BASE_URL,
  )
}

export function publicApiUrl(resource: string): string {
  const path = resource.startsWith("/") ? resource : `/${resource}`
  return `${getApiBaseUrl()}/v1/public${path}`
}
