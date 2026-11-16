import { unstable_cache } from "next/cache"

import type { DateRangeKey } from "@workspace/ops-contracts"
import { queryAdvertisers } from "@workspace/ops-queries"

import { getPgPool } from "@/lib/pg"

export const getAdvertisers = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(
    () => queryAdvertisers(getPgPool(), range, includeMoney),
    ["ops-advertisers", range, includeMoney ? "money" : "no-money"],
    { revalidate: 300 }
  )()
