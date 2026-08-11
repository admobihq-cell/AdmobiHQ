import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, requireOpsAdminAccess } from "@/lib/api-utils"

type Params = { params: Promise<{ invitationId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const organizationId = process.env.CLERK_ORG_ID
  if (!organizationId) return jsonError("CLERK_ORG_ID is not configured", 500)

  const { invitationId } = await params
  const client = await clerkClient()

  const invitation = await client.organizations.revokeOrganizationInvitation({
    organizationId,
    invitationId,
    requestingUserId: access.userId,
  })

  await auditFromOpsUser(access, {
    action: "delete",
    entity_type: "team_invitation",
    entity_id: invitationId,
    summary: `Revoked invitation for ${invitation.emailAddress}`,
  })

  return NextResponse.json({ success: true })
}
