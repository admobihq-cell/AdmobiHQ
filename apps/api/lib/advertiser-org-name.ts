import { prisma } from "@/lib/prisma"

/** Prefer the org row; fall back to null (never Clerk metadata on the read path). */
export async function getOrgNameForOrgId(orgId: number | null | undefined): Promise<string | null> {
  if (orgId == null) return null
  const org = await prisma.advertiserOrg.findUnique({
    where: { id: orgId },
    select: { name: true },
  })
  const name = org?.name?.trim()
  return name ? name : null
}

export async function getOrgNameForClerkUser(clerkUserId: string): Promise<string | null> {
  const member = await prisma.advertiserMember.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { removed_at: true, org: { select: { name: true } } },
  })
  if (!member || member.removed_at) return null
  const name = member.org.name?.trim()
  return name ? name : null
}

/** Batch lookup for the ops Users list — one query instead of N Clerk metadata reads. */
export async function getOrgNamesForClerkUsers(
  clerkUserIds: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>()
  for (const id of clerkUserIds) result.set(id, null)
  if (clerkUserIds.length === 0) return result

  const members = await prisma.advertiserMember.findMany({
    where: { clerk_user_id: { in: clerkUserIds }, removed_at: null },
    select: {
      clerk_user_id: true,
      org: { select: { name: true } },
    },
  })
  for (const member of members) {
    const name = member.org.name?.trim()
    result.set(member.clerk_user_id, name ? name : null)
  }
  return result
}
