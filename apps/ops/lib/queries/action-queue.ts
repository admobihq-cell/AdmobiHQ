import type { DateRangeKey, OpsPermission } from "@workspace/ops-contracts"
import { queryActionQueue } from "@workspace/ops-queries"

import { getDelivery, getPipeline } from "@/lib/queries/campaign-analytics"
import { getFinancePayouts } from "@/lib/queries/finance"
import { getFleet } from "@/lib/queries/fleet-analytics"
import { getSupport } from "@/lib/queries/support-analytics"

/**
 * The attention queue, built from the dashboards' own cached queries so the numbers match what each
 * link opens and a bell load costs nothing extra. The logic lives in `@workspace/ops-queries`.
 */
export const getActionQueue = (has: (permission: OpsPermission) => boolean, range: DateRangeKey) =>
  queryActionQueue(has, range, {
    pipeline: getPipeline,
    delivery: getDelivery,
    fleet: getFleet,
    support: getSupport,
    financePayouts: getFinancePayouts,
  })
