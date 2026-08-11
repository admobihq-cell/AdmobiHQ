import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { isAdmobiEmail, teamInviteSchema, type TeamDto } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsAccess, requireOpsAdminAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

function requireOrgId(): string | null {
  return process.env.CLERK_ORG_ID ?? null
}

export async function GET() {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const organizationId = requireOrgId()
  if (!organizationId) return jsonError("CLERK_ORG_ID is not configured", 500)

  const client = await clerkClient()
  const [members, invitations, candidates] = await Promise.all([
    client.organizations.getOrganizationMembershipList({ organizationId }),
    client.organizations.getOrganizationInvitationList({
      organizationId,
      status: ["pending"],
    }),
    client.users.getUserList({ query: "@admobihq.com", limit: 200 }),
  ])

  const memberUserIds = members.data
    .map((m) => m.publicUserData?.userId)
    .filter((id): id is string => !!id)

  const assignments = await prisma.opsRoleAssignment.findMany({
    where: { clerk_user_id: { in: memberUserIds } },
    include: { role: true },
  })
  const roleByUserId = new Map(assignments.map((a) => [a.clerk_user_id, a.role]))

  const invitedEmails = new Set(invitations.data.map((i) => i.emailAddress.toLowerCase()))
  const memberEmails = new Set(
    members.data.map((m) => m.publicUserData?.identifier?.toLowerCase()).filter(Boolean),
  )

  const body: TeamDto = {
    members: members.data.map((m) => {
      const userId = m.publicUserData?.userId ?? ""
      const role = roleByUserId.get(userId)
      return {
        userId,
        email: m.publicUserData?.identifier ?? "",
        role: m.role === "org:admin" ? "admin" : "member",
        roleId: role?.id ?? null,
        roleName: role?.name ?? null,
        joinedAt: new Date(m.createdAt).toISOString(),
      }
    }),
    invitations: invitations.data.map((i) => ({
      id: i.id,
      email: i.emailAddress,
      role: i.role === "org:admin" ? "admin" : "member",
      createdAt: new Date(i.createdAt).toISOString(),
      status: i.status ?? "pending",
    })),
    notYetInvited: candidates.data
      .filter((u) => {
        const email = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
          ?.emailAddress
        if (!email || !isAdmobiEmail(email)) return false
        const lower = email.toLowerCase()
        return !memberEmails.has(lower) && !invitedEmails.has(lower)
      })
      .map((u) => ({
        userId: u.id,
        email:
          u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? "",
      })),
  }

  return NextResponse.json(body)
}

export async function POST(req: Request) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const organizationId = requireOrgId()
  if (!organizationId) return jsonError("CLERK_ORG_ID is not configured", 500)

  const parsed = await parseJsonBody(req, teamInviteSchema)
  if ("error" in parsed) return parsed.error
  const { email } = parsed.data

  if (parsed.data.tier === "member") {
    const role = await prisma.opsRole.findUnique({ where: { id: parsed.data.roleId } })
    if (!role) return jsonError("Unknown role", 400)
  }

  const client = await clerkClient()
  try {
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId,
      emailAddress: email,
      role: parsed.data.tier === "admin" ? "org:admin" : "org:member",
      inviterUserId: access.userId,
    })

    // If they already have a Clerk account, pre-assign the role now so it's
    // ready the instant they accept — brand-new signups fall back to the
    // default "Member" role until an admin reassigns them post-acceptance
    // (a Clerk user id doesn't exist to attach an assignment to yet).
    if (parsed.data.tier === "member") {
      const existing = await client.users.getUserList({ emailAddress: [email] })
      const user = existing.data[0]
      if (user) {
        await prisma.opsRoleAssignment.upsert({
          where: { clerk_user_id: user.id },
          create: { clerk_user_id: user.id, role_id: parsed.data.roleId },
          update: { role_id: parsed.data.roleId },
        })
      }
    }

    await auditFromOpsUser(access, {
      action: "create",
      entity_type: "team_invitation",
      entity_id: invitation.id,
      summary: `Invited ${email} as ${parsed.data.tier}`,
    })

    return NextResponse.json({
      id: invitation.id,
      email: invitation.emailAddress,
      role: parsed.data.tier,
      createdAt: new Date(invitation.createdAt).toISOString(),
      status: invitation.status ?? "pending",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite"
    return jsonError(message, 409)
  }
}
