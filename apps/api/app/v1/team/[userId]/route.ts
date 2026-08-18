import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { teamRoleUpdateSchema, type TeamMemberDto } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsAdminAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ userId: string }> }

function requireOrgId(): string | null {
  return process.env.CLERK_ORG_ID ?? null
}

/** Admins are protected: their role/membership can't be changed from the Team page, by anyone (including themselves or another admin). */
async function isProtectedAdmin(
  client: Awaited<ReturnType<typeof clerkClient>>,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await client.organizations.getOrganizationMembershipList({ organizationId })
  return data.some((m) => m.publicUserData?.userId === userId && m.role === "org:admin")
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const organizationId = requireOrgId()
  if (!organizationId) return jsonError("CLERK_ORG_ID is not configured", 500)

  const { userId } = await params
  const parsed = await parseJsonBody(req, teamRoleUpdateSchema)
  if ("error" in parsed) return parsed.error

  const client = await clerkClient()

  if (await isProtectedAdmin(client, organizationId, userId)) {
    return jsonError("Admins are protected and can't have their role changed here", 400)
  }

  if (parsed.data.tier === "member") {
    const role = await prisma.opsRole.findUnique({ where: { id: parsed.data.roleId } })
    if (!role) return jsonError("Unknown role", 400)
  }

  const membership = await client.organizations.updateOrganizationMembership({
    organizationId,
    userId,
    role: parsed.data.tier === "admin" ? "org:admin" : "org:member",
  })

  let roleName: string | null = null
  if (parsed.data.tier === "member") {
    const assignment = await prisma.opsRoleAssignment.upsert({
      where: { clerk_user_id: userId },
      create: { clerk_user_id: userId, role_id: parsed.data.roleId },
      update: { role_id: parsed.data.roleId },
      include: { role: true },
    })
    roleName = assignment.role.name
  } else {
    await prisma.opsRoleAssignment.deleteMany({ where: { clerk_user_id: userId } })
  }

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "team_member",
    entity_id: userId,
    summary: `Changed ${membership.publicUserData?.identifier ?? userId}'s role to ${parsed.data.tier}${roleName ? ` (${roleName})` : ""}`,
  })

  const body: TeamMemberDto = {
    userId: membership.publicUserData?.userId ?? userId,
    email: membership.publicUserData?.identifier ?? "",
    role: parsed.data.tier,
    roleId: parsed.data.tier === "member" ? parsed.data.roleId : null,
    roleName,
    joinedAt: new Date(membership.createdAt).toISOString(),
  }
  return NextResponse.json(body)
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const organizationId = requireOrgId()
  if (!organizationId) return jsonError("CLERK_ORG_ID is not configured", 500)

  const { userId } = await params
  const client = await clerkClient()

  if (await isProtectedAdmin(client, organizationId, userId)) {
    return jsonError("Admins are protected and can't be removed here", 400)
  }

  const membership = await client.organizations.deleteOrganizationMembership({
    organizationId,
    userId,
  })
  await prisma.opsRoleAssignment.deleteMany({ where: { clerk_user_id: userId } })

  await auditFromOpsUser(access, {
    action: "delete",
    entity_type: "team_member",
    entity_id: userId,
    summary: `Removed ${membership.publicUserData?.identifier ?? userId} from the ops team`,
  })

  return NextResponse.json({ success: true })
}
