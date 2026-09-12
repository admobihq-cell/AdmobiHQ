import { ADVERTISER_PERMISSIONS, type AdvertiserPermission } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { notifyUserPush } from "@/lib/push/user-push"

async function memberHoldsPermission(
  isOwner: boolean,
  roleId: number | null,
  permission: AdvertiserPermission,
): Promise<boolean> {
  if (isOwner) return true
  if (roleId == null) return false
  const role = await prisma.advertiserRole.findUnique({ where: { id: roleId } })
  return (role?.permissions ?? []).includes(permission)
}

/** Active org members who hold `permission` (owners always qualify). */
export async function listOrgMemberIdsWithPermission(
  orgId: number,
  permission: AdvertiserPermission,
): Promise<string[]> {
  const members = await prisma.advertiserMember.findMany({
    where: { org_id: orgId, removed_at: null },
    select: { clerk_user_id: true, is_owner: true, role_id: true },
  })

  const ids: string[] = []
  for (const member of members) {
    if (await memberHoldsPermission(member.is_owner, member.role_id, permission)) {
      ids.push(member.clerk_user_id)
    }
  }
  return ids
}

/**
 * One CustomerNotification + push per active member with `campaigns:read`.
 * Email is left to the caller (usually the campaign contact).
 */
export async function fanOutCustomerCampaignNotice(input: {
  orgId: number | null | undefined
  fallbackUserId: string
  type: string
  title: string
  body: string
  href: string
}): Promise<void> {
  const recipients =
    input.orgId != null
      ? await listOrgMemberIdsWithPermission(input.orgId, "campaigns:read")
      : [input.fallbackUserId]

  const unique = [...new Set(recipients.length > 0 ? recipients : [input.fallbackUserId])]

  await prisma.customerNotification.createMany({
    data: unique.map((clerk_user_id) => ({
      clerk_user_id,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  })

  await Promise.all(
    unique.map((userId) =>
      notifyUserPush("customer", userId, {
        title: input.title,
        body: input.body,
        href: input.href,
      }),
    ),
  )
}

export function isKnownAdvertiserPermission(value: string): value is AdvertiserPermission {
  return (ADVERTISER_PERMISSIONS as readonly string[]).includes(value)
}
