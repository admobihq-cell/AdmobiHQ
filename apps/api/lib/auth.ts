import { verifyToken } from "@clerk/backend"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { OPS_PERMISSIONS, type OpsPermission, type OpsRole } from "@workspace/ops-contracts"

import { isAdmobiEmail } from "@/lib/allowed-email"
import { prisma } from "@/lib/prisma"

export { ALLOWED_DOMAIN, getAdmobiEmailError, isAdmobiEmail } from "@/lib/allowed-email"

type ClerkEmailUser = {
  primaryEmailAddressId: string | null
  emailAddresses: ReadonlyArray<{ id: string; emailAddress: string }>
}

export type OpsAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string | null }
  | {
      status: "authorized"
      userId: string
      email: string
      role: OpsRole
      permissions: OpsPermission[]
      user: NonNullable<Awaited<ReturnType<typeof currentUser>>>
    }

function resolvePrimaryEmail(user: ClerkEmailUser): string | null {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  )
}

async function resolveUserId(): Promise<string | null> {
  const { userId } = await auth()
  if (userId) {
    return userId
  }

  const authHeader = (await headers()).get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  if (!bearer) {
    return null
  }

  try {
    const payload = await verifyToken(bearer, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>

const CLERK_USER_CACHE_TTL_MS = 60_000
const clerkUserCache = new Map<string, { user: ClerkUser; expiresAt: number }>()

function getCachedClerkUser(userId: string): ClerkUser | null {
  const entry = clerkUserCache.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    clerkUserCache.delete(userId)
    return null
  }
  return entry.user
}

async function resolveClerkUser(userId: string): Promise<ClerkUser | null> {
  const fromSession = await currentUser()
  if (fromSession?.id === userId) {
    return fromSession
  }

  const cached = getCachedClerkUser(userId)
  if (cached) {
    return cached
  }

  try {
    const user = (await (await clerkClient()).users.getUser(userId)) as ClerkUser
    clerkUserCache.set(userId, { user, expiresAt: Date.now() + CLERK_USER_CACHE_TTL_MS })
    return user
  } catch {
    return null
  }
}

function toOpsRole(clerkRole: string): OpsRole {
  return clerkRole === "org:admin" ? "admin" : "member"
}

const CLERK_ROLE_CACHE_TTL_MS = 60_000
const opsRoleCache = new Map<string, { role: OpsRole | null; expiresAt: number }>()

/** Membership in the fixed CLERK_ORG_ID org is the real access gate — not just
 * an @admobihq.com email. Cached (per-process, 60s) same as getCachedClerkUser
 * above, since this is an extra Backend API call. */
async function resolveOpsRole(userId: string): Promise<OpsRole | null> {
  const cached = opsRoleCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.role
  }

  const orgId = process.env.CLERK_ORG_ID
  let role: OpsRole | null = null

  if (orgId) {
    try {
      const client = await clerkClient()
      const { data } = await client.users.getOrganizationMembershipList({ userId })
      const membership = data.find((m) => m.organization.id === orgId)
      role = membership ? toOpsRole(membership.role) : null
    } catch {
      role = null
    }
  }

  opsRoleCache.set(userId, { role, expiresAt: Date.now() + CLERK_ROLE_CACHE_TTL_MS })
  return role
}

const opsPermissionsCache = new Map<string, { permissions: OpsPermission[]; expiresAt: number }>()

/** org:admin bypasses this (always all permissions). org:member gets whatever
 * their assigned OpsRole grants, falling back to the seeded "Member" role if
 * they somehow have no assignment yet. Cached like resolveOpsRole above. */
async function resolveOpsPermissions(userId: string, role: OpsRole): Promise<OpsPermission[]> {
  if (role === "admin") {
    return [...OPS_PERMISSIONS]
  }

  const cached = opsPermissionsCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions
  }

  const assignment = await prisma.opsRoleAssignment.findUnique({
    where: { clerk_user_id: userId },
    include: { role: true },
  })
  const opsRole = assignment?.role ?? (await prisma.opsRole.findUnique({ where: { name: "Member" } }))
  const permissions = (opsRole?.permissions ?? []).filter((p): p is OpsPermission =>
    (OPS_PERMISSIONS as readonly string[]).includes(p),
  )

  opsPermissionsCache.set(userId, { permissions, expiresAt: Date.now() + CLERK_ROLE_CACHE_TTL_MS })
  return permissions
}

export async function getOpsAccess(): Promise<OpsAccess> {
  const userId = await resolveUserId()
  if (!userId) {
    return { status: "unauthenticated" }
  }

  const user = await resolveClerkUser(userId)
  if (!user) {
    return { status: "unauthenticated" }
  }

  const email = resolvePrimaryEmail(user)
  if (!isAdmobiEmail(email)) {
    return { status: "forbidden", email }
  }

  const role = await resolveOpsRole(userId)
  if (!role) {
    return { status: "forbidden", email }
  }

  const permissions = await resolveOpsPermissions(userId, role)

  return { status: "authorized", userId, email: email!, role, permissions, user }
}

export async function requireOpsUser() {
  const access = await getOpsAccess()
  if (access.status === "unauthenticated") {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (access.status === "forbidden") {
    throw new Response(
      JSON.stringify({ error: "Forbidden — not a member of the Admobi Ops team" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  }

  return access
}

export async function requireOpsAdmin() {
  const access = await requireOpsUser()
  if (access.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }
  return access
}

export async function requireOpsPermission(permission: OpsPermission) {
  const access = await requireOpsUser()
  if (access.role !== "admin" && !access.permissions.includes(permission)) {
    throw new Response(
      JSON.stringify({ error: `Forbidden — "${permission}" access required` }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  }
  return access
}

export async function getOpsUser() {
  const access = await getOpsAccess()
  if (access.status !== "authorized") {
    return null
  }
  return access
}
