import { unstable_cache } from "next/cache"

import type { DateRangeKey } from "@workspace/ops-contracts"
import { querySupport } from "@workspace/ops-queries"

import { getPgPool } from "@/lib/pg"

export const getSupport = (range: DateRangeKey, includeSafety: boolean) =>
  unstable_cache(() => querySupport(getPgPool(), range, includeSafety), ["ops-support", range, includeSafety ? "safety" : "no-safety"], {
    revalidate: 300,
  })()
