import { NextResponse } from "next/server"

import {
  queryActionQueue,
  queryDelivery,
  queryFinancePayouts,
  queryFleet,
  queryPipeline,
  querySupport,
} from "@workspace/ops-queries"

import { jsonError, requireOpsAccess } from "@/lib/api-utils"
import { can, opsDb, readRange } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

/**
 * The attention queue behind the ops header bell: counts that need someone, each linking to the
 * dashboard that explains them. Any ops user may ask; a row appears only when the caller holds the
 * permission for the dashboard it links to, and only when its count is above zero. `href` is an
 * ops-console path (mobile maps it onto its own routes).
 */
export async function GET(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const range = readRange(req)
  if (!range) return jsonError("Invalid range", 400)

  const db = opsDb()
  // ponytail: uncached, so a bell load runs up to six dashboard queries; cache here if the bell gets polled hard.
  const items = await queryActionQueue((p) => can(auth.access, p), range, {
    pipeline: (r, money) => queryPipeline(db, r, money),
    delivery: (r) => queryDelivery(db, r),
    fleet: (r, money) => queryFleet(db, r, money),
    support: (r, safety) => querySupport(db, r, safety),
    financePayouts: (r) => queryFinancePayouts(db, r),
  })
  return NextResponse.json({ items })
}
