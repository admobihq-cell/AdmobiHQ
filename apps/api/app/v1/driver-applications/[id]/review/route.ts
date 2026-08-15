import { NextResponse } from "next/server"

import { driverProfileReviewSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { getDriverEmail } from "@/lib/driver-clerk"
import { toDriverProfileDto } from "@/lib/driver-profile-dto"
import { renderTemplate } from "@/lib/email/render-template"
import { sendEmail } from "@/lib/email/send-email"
import {
  DriverApplicationDecision,
  type DriverApplicationDecisionKind,
} from "@/lib/email/templates/DriverApplicationDecision"
import { prisma } from "@/lib/prisma"

const NOTIFICATION_COPY: Record<
  DriverApplicationDecisionKind,
  { type: string; title: string; body: (reason?: string | null) => string }
> = {
  approved: {
    type: "application_approved",
    title: "You're verified",
    body: () => "Your driver application was approved — you have full access to the app.",
  },
  rejected: {
    type: "application_rejected",
    title: "Application not approved",
    body: (reason) => reason || "Your application needs changes before it can be approved.",
  },
  changes_requested: {
    type: "application_changes_requested",
    title: "Changes needed",
    body: (reason) => reason || "We requested some changes before your application can be approved.",
  },
}

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("driver_applications")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, driverProfileReviewSchema)
  if ("error" in parsed) return parsed.error
  const { decision, reason } = parsed.data

  const existing = await prisma.driverProfile.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)

  // Normal review happens from "submitted". An already-"approved" profile
  // can only be walked back ("unapprove") — never re-approved through this
  // same no-op path — which is why decision must differ from the current
  // status there.
  const isUnapprove = existing.status === "approved" && decision !== "approved"
  if (existing.status !== "submitted" && !isUnapprove) {
    return jsonError(`Application can't be reviewed while status is "${existing.status}"`, 409)
  }
  if (decision !== "approved" && !reason) {
    return jsonError("A reason is required to reject or request changes", 400)
  }

  const updated = await prisma.driverProfile.update({
    where: { id },
    data: {
      status: decision,
      reviewed_at: new Date(),
      reviewed_by_email: access.email,
      rejection_reason: decision === "approved" ? null : (reason ?? null),
    },
    include: { documents: { orderBy: { created_at: "asc" } } },
  })

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "driver_profile",
    entity_id: id,
    summary: isUnapprove
      ? `Driver application #${id} unapproved (now ${decision.replace(/_/g, " ")})`
      : `Driver application #${id} ${decision.replace(/_/g, " ")}`,
  })

  // Notify the driver (fire-and-forget, never blocks the response)
  try {
    const copy = NOTIFICATION_COPY[decision]

    await prisma.driverNotification.create({
      data: {
        clerk_user_id: updated.clerk_user_id,
        type: copy.type,
        title: copy.title,
        body: copy.body(updated.rejection_reason),
      },
    })

    const driverEmail = await getDriverEmail(updated.clerk_user_id)
    if (driverEmail) {
      const html = await renderTemplate(DriverApplicationDecision, {
        name: updated.full_name ?? "there",
        decision,
        reason: updated.rejection_reason,
      })
      await sendEmail(driverEmail, copy.title, html)
    }
  } catch (error) {
    console.error("[driver-applications/review] Failed to send notifications:", error)
  }

  return NextResponse.json(toDriverProfileDto(updated))
}
