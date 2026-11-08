import type { DriverProfileDto } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import type { OpsAccess, ReviewOutcome } from "@/lib/campaigns/review-campaign"
import { getDriverEmail } from "@/lib/driver/driver-clerk"
import { toDriverProfileDto } from "@/lib/driver/driver-profile-dto"
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

/** One ops review decision on one driver application — status rules, audit
 * row, driver inbox + email. Shared by the single and bulk review routes.
 * `allowUnapprove: false` (bulk) only reviews "submitted" applications. */
export async function reviewDriverApplication(
  access: OpsAccess,
  id: number,
  input: { decision: DriverApplicationDecisionKind; reason?: string },
  opts: { allowUnapprove?: boolean } = {},
): Promise<ReviewOutcome<DriverProfileDto>> {
  const { decision, reason } = input
  const allowUnapprove = opts.allowUnapprove ?? true

  const existing = await prisma.driverProfile.findUnique({ where: { id } })
  if (!existing) return { ok: false, status: 404, error: "Not found" }

  // Normal review happens from "submitted". An already-"approved" profile
  // can only be walked back ("unapprove") — never re-approved through this
  // same no-op path — which is why decision must differ from the current
  // status there.
  const isUnapprove = allowUnapprove && existing.status === "approved" && decision !== "approved"
  if (existing.status !== "submitted" && !isUnapprove) {
    return {
      ok: false,
      status: 409,
      error: `Application can't be reviewed while status is "${existing.status}"`,
    }
  }
  if (decision !== "approved" && !reason) {
    return { ok: false, status: 400, error: "A reason is required to reject or request changes" }
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

  return { ok: true, value: toDriverProfileDto(updated) }
}
