import type { SearchResponseDto } from "@workspace/ops-contracts"

import type { GetToken } from "@/lib/driver-profile-client"
import { apiPublicUrl } from "@/lib/site-urls"

/** Command palette record search. The caller's signal cancels a stale request when the query changes. */
export async function searchRecords(getToken: GetToken, q: string, signal?: AbortSignal): Promise<SearchResponseDto> {
  const token = await getToken()
  const res = await fetch(`${apiPublicUrl()}/v1/driver/search?q=${encodeURIComponent(q)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
  })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  return (await res.json()) as SearchResponseDto
}
