import { SEARCH_GROUP_LIMIT, escapeLike, type SearchHit } from "@workspace/ops-contracts"

export const take = SEARCH_GROUP_LIMIT

// Prisma's `contains` passes % and _ straight into ILIKE, so escape them or "50%" also matches "500".
export const ci = (value: string) => ({ contains: escapeLike(value), mode: "insensitive" as const })

export const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ")

/** `{ id }` when the query is a bare id, to spread into an OR. */
export const idOr = (numericId: number | null) => (numericId !== null ? [{ id: numericId }] : [])

/**
 * Looks the exact id up on its own and the text matches separately, then puts the id row first.
 * One combined `OR` query can't do this: newer text matches (every Kenyan phone contains "254")
 * would fill the window and push the row the user typed the id of out of it.
 */
export async function exactFirst<T extends { id: number }>(
  numericId: number | null,
  find: (where: object, limit: number) => Promise<T[]>,
  textWhere: object[],
  toHit: (row: T) => SearchHit
): Promise<SearchHit[]> {
  const [exact, rows] = await Promise.all([
    numericId !== null ? find({ id: numericId }, 1) : Promise.resolve([] as T[]),
    textWhere.length > 0 ? find({ OR: textWhere }, take + 1) : Promise.resolve([] as T[]),
  ])
  return ranked([...exact, ...rows], exact[0]?.id ?? null, toHit)
}

/** Exact hit first, then the rest, with duplicates dropped and capped at the group limit. */
export function ranked<T extends { id: number }>(rows: T[], exactId: number | null, toHit: (row: T) => SearchHit): SearchHit[] {
  const sorted = [...rows].sort((a, b) => Number(b.id === exactId) - Number(a.id === exactId))
  const seen = new Set<number>()
  return sorted
    .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    .slice(0, take)
    .map(toHit)
}
