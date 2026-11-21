import { SEARCH_GROUP_LIMIT, escapeLike, type SearchHit } from "@workspace/ops-contracts"

export const take = SEARCH_GROUP_LIMIT

// Prisma's `contains` passes % and _ straight into ILIKE, so escape them or "50%" also matches "500".
export const ci = (value: string) => ({ contains: escapeLike(value), mode: "insensitive" as const })

export const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ")

/** `{ id }` when the query is a bare id, to spread into an OR. */
export const idOr = (numericId: number | null) => (numericId !== null ? [{ id: numericId }] : [])

/** Exact-id hits first, then the rest, with duplicates dropped and capped at the group limit. */
export function ranked<T extends { id: number }>(rows: T[], exactId: number | null, toHit: (row: T) => SearchHit): SearchHit[] {
  const sorted = [...rows].sort((a, b) => Number(b.id === exactId) - Number(a.id === exactId))
  const seen = new Set<number>()
  return sorted
    .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    .slice(0, take)
    .map(toHit)
}
