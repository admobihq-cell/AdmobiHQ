import { prisma } from "@/lib/prisma"

/** Upsert-on-read: a driver's first authenticated call to /v1/driver/profile
 * creates their draft row — there's no separate "create profile" step. */
export async function getOrCreateDriverProfile(clerkUserId: string) {
  return prisma.driverProfile.upsert({
    where: { clerk_user_id: clerkUserId },
    create: { clerk_user_id: clerkUserId },
    update: {},
    include: { documents: { orderBy: { created_at: "asc" } } },
  })
}

export const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])
