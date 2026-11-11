import { unstable_cache } from "next/cache"

import type { DateRangeKey } from "@workspace/ops-contracts"
import { queryDelivery, queryInventory, queryPipeline } from "@workspace/ops-queries"

import { getPgPool } from "@/lib/pg"

const CACHE = { revalidate: 300 }
const variant = (includeMoney: boolean) => (includeMoney ? "money" : "no-money")

export const getPipeline = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(() => queryPipeline(getPgPool(), range, includeMoney), ["ops-campaigns-pipeline", range, variant(includeMoney)], CACHE)()
export const getDelivery = (range: DateRangeKey) =>
  unstable_cache(() => queryDelivery(getPgPool(), range), ["ops-campaigns-delivery", range], CACHE)()
export const getInventory = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(() => queryInventory(getPgPool(), range, includeMoney), ["ops-campaigns-inventory", range, variant(includeMoney)], CACHE)()
