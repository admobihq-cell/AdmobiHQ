import { unstable_cache } from "next/cache"

import type { DateRangeKey } from "@workspace/ops-contracts"
import { queryFleet } from "@workspace/ops-queries"

import { getPgPool } from "@/lib/pg"

export const getFleet = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(() => queryFleet(getPgPool(), range, includeMoney), ["ops-fleet", range, includeMoney ? "money" : "no-money"], { revalidate: 300 })()
