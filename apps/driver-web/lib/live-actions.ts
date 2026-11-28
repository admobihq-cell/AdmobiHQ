"use server"

import { auth } from "@clerk/nextjs/server"
import { updateTag } from "next/cache"

import { driverProfileTag } from "@/lib/driver-profile-tag"

/** Drops the caller's own cached profile, so a review decision shows without waiting it out. */
export async function expireDriverProfile(): Promise<void> {
  const { userId } = await auth()
  if (userId) updateTag(driverProfileTag(userId))
}
