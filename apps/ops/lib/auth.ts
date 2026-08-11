import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { OPS_PERMISSIONS, type OpsPermission, type OpsRole } from "@workspace/ops-contracts"

import { isAdmobiEmail } from "@/lib/allowed-email"
import { prisma } from "@/lib/prisma"

export { ALLOWED_DOMAIN, getAdmobiEmailError, isAdmobiEmail } from "@/lib/allowed-email"

export type OpsAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string | null }
  | {
      status: "authorized"
      userId: string
      email: string
      role: OpsRole
      permissions: OpsPermission[]
      orgName: string | null
      user: NonNullable<Awaited<ReturnType<typeof currentUser>>>
    }

function resolvePrimaryEmail(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): string | null {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  )
}

function toOpsRole(clerkRole: string): OpsRole {
  return clerkRole === "org:admin" ? "admin" : "member"
}

const OPS_ROLE_CACHE_TTL_MS = 60_000
const opsRoleCache = new Map<string, { role: OpsRole | null; expiresAt: number }>()

/** Membership in the fixed CLERK_ORG_ID org is the real access gate — not just
 * an @admobihq.com email. Cached (per-process, 60s) since this is a Backend
 * API network call, unlike the session-local currentUser() lookup above. */
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

  opsRoleCache.set(userId, { role, expiresAt: Date.now() + OPS_ROLE_CACHE_TTL_MS })
  return role
}

const OPS_ORG_NAME_CACHE_TTL_MS = 5 * 60_000
let opsOrgNameCache: { name: string | null; expiresAt: number } | null = null

/** Display name of the fixed CLERK_ORG_ID org, for showing "who am I signed
 * into" in the shell footer. Rarely changes, so cached longer than the
 * per-user role/permissions caches above. */
async function resolveOpsOrgName(): Promise<string | null> {
  if (opsOrgNameCache && opsOrgNameCache.expiresAt > Date.now()) {
    return opsOrgNameCache.name
  }

  const orgId = process.env.CLERK_ORG_ID
  let name: string | null = null

  if (orgId) {
    try {
      const client = await clerkClient()
      const org = await client.organizations.getOrganization({ organizationId: orgId })
      name = org.name
    } catch {
      name = null
    }
  }

  opsOrgNameCache = { name, expiresAt: Date.now() + OPS_ORG_NAME_CACHE_TTL_MS }
  return name
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

  opsPermissionsCache.set(userId, { permissions, expiresAt: Date.now() + OPS_ROLE_CACHE_TTL_MS })
  return permissions
}

export async function getOpsAccess(): Promise<OpsAccess> {
  const { userId } = await auth()
  if (!userId) {
    return { status: "unauthenticated" }
  }

  const user = await currentUser()
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
  const orgName = await resolveOpsOrgName()

  return { status: "authorized", userId, email: email!, role, permissions, orgName, user }
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
