import { NextResponse } from "next/server"

import { auditFromDriverUser } from "@/lib/audit"
import { jsonError, requireDriverAccess } from "@/lib/api-utils"
import { getDriverEmail } from "@/lib/driver-clerk"
import {
  missingProfileDocuments,
  missingProfileFields,
  toDriverProfileDto,
} from "@/lib/driver-profile-dto"
import { EDITABLE_STATUSES, getOrCreateDriverProfile } from "@/lib/driver-profile-store"
import { renderTemplate } from "@/lib/email/render-template"
import { sendAdminEmail, sendEmail } from "@/lib/email/send-email"
import { AdminAlert, reviewUrl } from "@/lib/email/templates/AdminAlert"
import { DriverApplicationSubmitted } from "@/lib/email/templates/DriverApplicationSubmitted"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const profile = await getOrCreateDriverProfile(auth.access.userId)
  if (!EDITABLE_STATUSES.has(profile.status)) {
    return jsonError(`Profile can't be submitted while status is "${profile.status}"`, 409)
  }

  const missingFields = missingProfileFields(profile)
  const missingDocuments = missingProfileDocuments(profile.documents)
  if (missingFields.length > 0 || missingDocuments.length > 0) {
    return jsonError("Profile is incomplete", 400, { missingFields, missingDocuments })
  }

  const updated = await prisma.driverProfile.update({
    where: { id: profile.id },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      rejection_reason: null,
    },
    include: { documents: { orderBy: { created_at: "asc" } } },
  })

  await auditFromDriverUser(auth.access.userId, {
    action: "update",
    entity_type: "driver_profile",
    entity_id: updated.id,
    summary: `Driver profile #${updated.id} submitted for review`,
  })

  // Notify the driver + ops admins (fire-and-forget, never blocks the response)
  try {
    const name = updated.full_name ?? "there"

    await prisma.driverNotification.create({
      data: {
        clerk_user_id: auth.access.userId,
        type: "application_submitted",
        title: "Application submitted",
        body: "We're reviewing your documents — this usually takes a day or two.",
      },
    })

    const driverEmail = await getDriverEmail(auth.access.userId)
    if (driverEmail) {
      const html = await renderTemplate(DriverApplicationSubmitted, { name })
      await sendEmail(driverEmail, "We got your Admobi driver application", html)
    }

    const adminHtml = await renderTemplate(AdminAlert, {
      type: "driver-application",
      submitterName: name,
      submitterEmail: driverEmail || "No email on file",
      submitterPhone: updated.phone || undefined,
      submitterCity: updated.city || undefined,
      additionalInfo: `Driver profile #${updated.id}`,
      reviewUrl: reviewUrl(`/driver-applications/${updated.id}`),
    })
    await sendAdminEmail(`Driver application ready for review: ${name}`, adminHtml)
  } catch (error) {
    console.error("[driver/profile/submit] Failed to send notifications:", error)
  }

  return NextResponse.json(toDriverProfileDto(updated))
}
