import type { User } from "@clerk/backend"
import type { PlatformUserDto, PlatformUserListDto, PlatformUserType } from "@workspace/ops-contracts"

import { customerClerkClient } from "@/lib/customer-clerk"
import { driverClerkClient } from "@/lib/driver-clerk"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

export function toPlatformUserDto(user: User): PlatformUserDto {
  const name = user.fullName?.trim() || user.username || user.primaryEmailAddress?.emailAddress?.split("@")[0] || user.id
  return {
    id: user.id,
    name,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    phone: user.primaryPhoneNumber?.phoneNumber ?? null,
    createdAt: new Date(user.createdAt).toISOString(),
    status: user.banned ? "banned" : user.locked ? "locked" : "active",
  }
}

/** Columns the ops "Users" page lets you sort by. Clerk's getUserList only
 * accepts a fixed set of orderBy fields — "name" and "status" aren't among
 * them (no combined name field, no banned/locked ordering), so those two
 * columns stay client-unsortable in the UI. */
export type PlatformUserSortField = "email" | "phone" | "createdAt"

const SORT_FIELD_TO_CLERK: Record<PlatformUserSortField, string> = {
  email: "email_address",
  phone: "phone_number",
  createdAt: "created_at",
}

export type ListPlatformUsersParams = {
  type: PlatformUserType
  query?: string
  limit?: number
  offset?: number
  sortBy?: PlatformUserSortField
  sortDir?: "asc" | "desc"
}

/** Dispatches to the driver or customer Clerk instance's admin API based on
 * `type` — these are two separate Clerk applications, so which secret key
 * (and thus which client) is used depends entirely on the requested type.
 * See lib/driver-clerk.ts and lib/customer-clerk.ts for why these must
 * never be crossed. */
type ClerkUserListParams = NonNullable<Parameters<typeof driverClerkClient.users.getUserList>[0]>

export async function listPlatformUsers(
  params: ListPlatformUsersParams,
): Promise<PlatformUserListDto> {
  const client = params.type === "drivers" ? driverClerkClient : customerClerkClient
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(params.offset ?? 0, 0)
  const orderBy = params.sortBy
    ? (`${params.sortDir === "asc" ? "+" : "-"}${SORT_FIELD_TO_CLERK[params.sortBy]}` as ClerkUserListParams["orderBy"])
    : undefined

  const result = await client.users.getUserList({
    query: params.query || undefined,
    limit,
    offset,
    orderBy,
  })

  return {
    users: result.data.map(toPlatformUserDto),
    total: result.totalCount,
    hasMore: offset + result.data.length < result.totalCount,
  }
}
