import { Prisma } from "@prisma/client"
import { verifyToken } from "@clerk/backend"
import { headers } from "next/headers"

import { ADVERTISER_PERMISSIONS, type AdvertiserPermission } from "@workspace/ops-contracts"

import { getCustomerCompanyName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

/**
 * Verifies against the CUSTOMER Clerk instance (CUSTOMER_CLERK_SECRET_KEY), a
 * separate instance from ops (lib/auth.ts) and driver (lib/driver-auth.ts).
 * Bearer-token only, no session-cookie fallback — apps/api is a separate
 * origin from customer-web/customer-mobile. Callers must send
 * `Authorization: Bearer <token>` using a token from the customer Clerk
 * instance's getToken().
 *
 * Postgres owns tenancy — Clerk never learns organizations exist. See
 * docs/superpowers/specs/2026-09-07-advertiser-organizations-design.md §3.
 */

export type CustomerAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden"; reason: "membership_removed" }
  | {
      status: "authorized"
      userId: string
      orgId: number
      isOwner: boolean
      permissions: Set<AdvertiserPermission>
    }

type AdvertiserAccessValue = { orgId: number; isOwner: boolean; permissions: Set<AdvertiserPermission> }

const ADVERTISER_ACCESS_CACHE_TTL_MS = 60_000
// Role changes call invalidateAdvertiserAccessCache(); TTL is only a ceiling
// for missed invalidations.
const advertiserAccessCache = new Map<string, { value: AdvertiserAccessValue; expiresAt: number }>()

function getCachedAdvertiserAccess(userId: string): AdvertiserAccessValue | null {
  const entry = advertiserAccessCache.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    advertiserAccessCache.delete(userId)
    return null
  }
  return entry.value
}

function setCachedAdvertiserAccess(userId: string, value: AdvertiserAccessValue): void {
  advertiserAccessCache.set(userId, { value, expiresAt: Date.now() + ADVERTISER_ACCESS_CACHE_TTL_MS })
}

/** Drop a cached permission set so a role change / remove / invite accept
 * takes effect on the next request instead of waiting out the 60s TTL. */
export function invalidateAdvertiserAccessCache(userId: string): void {
  advertiserAccessCache.delete(userId)
}

async function resolveCustomerUserId(): Promise<string | null> {
  const authHeader = (await headers()).get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  if (!bearer) {
    return null
  }

  try {
    const payload = await verifyToken(bearer, {
      secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

async function resolveRolePermissions(roleId: number | null): Promise<Set<AdvertiserPermission>> {
  if (roleId == null) return new Set()
  const role = await prisma.advertiserRole.findUnique({ where: { id: roleId } })
  const permissions = (role?.permissions ?? []).filter((p): p is AdvertiserPermission =>
    (ADVERTISER_PERMISSIONS as readonly string[]).includes(p),
  )
  return new Set(permissions)
}

/**
 * The first authenticated request from a clerk_user_id with no
 * AdvertiserMember row creates the org and an admin membership in one
 * transaction. Lazy rather than at sign-up because it covers the Google SSO
 * round-trip, the email-code path, and pre-existing users with one code path
 * and no client cooperation.
 *
 * If two requests race, the loser's create hits the unique constraint on
 * clerk_user_id (P2002) — it reads back the winner's row rather than failing
 * the request, so "concurrent first requests create exactly one org" holds
 * without extra locking.
 */
async function bootstrapOrGetMembership(
  clerkUserId: string,
): Promise<
  | { kind: "ok"; orgId: number; isOwner: boolean; roleId: number | null }
  | { kind: "removed" }
> {
  const existing = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: clerkUserId } })
  if (existing?.removed_at) {
    return { kind: "removed" }
  }
  if (existing) {
    return { kind: "ok", orgId: existing.org_id, isOwner: existing.is_owner, roleId: existing.role_id }
  }

  const companyName = (await getCustomerCompanyName(clerkUserId)) ?? ""

  try {
    const member = await prisma.$transaction(async (tx) => {
      const org = await tx.advertiserOrg.create({ data: { name: companyName } })
      return tx.advertiserMember.create({
        data: { org_id: org.id, clerk_user_id: clerkUserId, is_owner: true },
      })
    })
    return { kind: "ok", orgId: member.org_id, isOwner: member.is_owner, roleId: member.role_id }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const winner = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: clerkUserId } })
      if (winner?.removed_at) return { kind: "removed" }
      if (winner) {
        return { kind: "ok", orgId: winner.org_id, isOwner: winner.is_owner, roleId: winner.role_id }
      }
    }
    throw error
  }
}

export async function getCustomerAccess(): Promise<CustomerAccess> {
  const userId = await resolveCustomerUserId()
  if (!userId) {
    return { status: "unauthenticated" }
  }

  const cached = getCachedAdvertiserAccess(userId)
  if (cached) {
    return { status: "authorized", userId, ...cached }
  }

  const membership = await bootstrapOrGetMembership(userId)
  if (membership.kind === "removed") {
    return { status: "forbidden", reason: "membership_removed" }
  }

  const { orgId, isOwner, roleId } = membership
  const permissions = isOwner ? new Set(ADVERTISER_PERMISSIONS) : await resolveRolePermissions(roleId)

  setCachedAdvertiserAccess(userId, { orgId, isOwner, permissions })
  return { status: "authorized", userId, orgId, isOwner, permissions }
}

/** Reads org_id for an existing member, WITHOUT bootstrapping — a missing
 * membership here returns null rather than creating an org, because audit
 * stamping must never have the side effect of creating tenancy. By the time
 * an audited action has happened, requireCustomerUser() already bootstrapped
 * the org earlier in the same request. */
export async function getAdvertiserOrgId(clerkUserId: string): Promise<number | null> {
  const cached = getCachedAdvertiserAccess(clerkUserId)
  if (cached) return cached.orgId
  const member = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: clerkUserId } })
  if (!member || member.removed_at) return null
  return member.org_id
}

export async function requireCustomerUser(): Promise<Extract<CustomerAccess, { status: "authorized" }>> {
  const access = await getCustomerAccess()
  if (access.status === "unauthenticated") {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (access.status === "forbidden") {
    throw new Response(
      JSON.stringify({
        error: "Your organization access was removed. Ask an admin to re-invite you.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  }
  return access
}

/**
 * Verifies the bearer token and returns the Clerk user id WITHOUT resolving
 * or bootstrapping an AdvertiserOrg. Used by invite accept so the invitee's
 * first membership row is the inviting org, not a solo org created by
 * getCustomerAccess().
 */
export async function requireCustomerIdentity(): Promise<{ userId: string }> {
  const userId = await resolveCustomerUserId()
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { userId }
}

/** Mirrors requireOpsPermission in lib/auth.ts. is_owner bypasses this
 * entirely, same as org:admin does for ops. */
export async function requireCustomerPermission(
  permission: AdvertiserPermission,
): Promise<Extract<CustomerAccess, { status: "authorized" }>> {
  const access = await requireCustomerUser()
  if (!access.isOwner && !access.permissions.has(permission)) {
    throw new Response(
      JSON.stringify({ error: `Forbidden — "${permission}" access required` }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  }
  return access
}
