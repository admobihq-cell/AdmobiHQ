"use server"

import { updateTag } from "next/cache"

import { requireOpsUser } from "@/lib/auth"
import { OPS_LIVE_TAG } from "@/lib/queries/live-tag"

/** Called on a live event: without it a re-render serves counts up to five minutes old. */
export async function expireLiveCache(): Promise<void> {
  await requireOpsUser()
  updateTag(OPS_LIVE_TAG)
}
