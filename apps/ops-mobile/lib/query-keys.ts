import type { DateRangeKey } from "@workspace/ops-contracts"

import type { EntityKey } from "@/lib/entity-form-config"

/**
 * Keyed under a shared `["entities", entity, ...]` prefix so
 * `invalidateQueries({ queryKey: entityKeys.all(entity) })` refreshes the
 * paginated list, the dashboard's recent-activity preview, and any open
 * detail view for that entity together after a create/update/delete.
 */
export const entityKeys = {
  all: (entity: EntityKey) => ["entities", entity] as const,
  list: (entity: EntityKey, filter?: string | null) =>
    ["entities", entity, "list", filter ?? null] as const,
  recent: (entity: EntityKey) => ["entities", entity, "recent"] as const,
  detail: (entity: EntityKey, id: number) =>
    ["entities", entity, "detail", id] as const,
}

export const statsKeys = {
  stats: (range: DateRangeKey) => ["stats", range] as const,
}
