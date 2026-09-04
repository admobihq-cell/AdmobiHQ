import { NextResponse } from "next/server"

import { auditPublic } from "@/lib/audit"
import { prisma } from "@/lib/prisma"
import { driverJoinSchema } from "@/lib/validation/lead-schemas"
import { sendAdminEmail, sendEmail } from "@/lib/email/send-email"
import { renderTemplate } from "@/lib/email/render-template"
import { DriverConfirmation } from "@/lib/email/templates/DriverConfirmation"
import { AdminAlert, reviewUrl } from "@/lib/email/templates/AdminAlert"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "drivers", { limit: 5, windowSeconds: 60 })
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = driverJoinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const data = await prisma.driver.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        city: parsed.data.city,
        vehicle_type: parsed.data.vehicleType,
        days_per_week: parsed.data.daysPerWeek,
        heard_about: parsed.data.heardAbout,
        vehicle_make_model: parsed.data.vehicleMakeModel || null,
        vehicle_year: parsed.data.vehicleYear || null,
        vehicle_ownership: parsed.data.vehicleOwnership || null,
        routes_areas: parsed.data.routesAreas || null,
        hours_per_day: parsed.data.hoursPerDay || null,
        platforms: parsed.data.platforms ?? [],
        applicant_message: parsed.data.applicantMessage || null,
      },
    })

    console.log("[Admobi API drivers] Saved:", { id: data.id })

    // Push notifies ops staff independently of email — must not be
    // skipped just because Resend fails (e.g. invalid API key).
    void notifyOpsStaffAlert({
      type: "driver",
      entityId: data.id,
      submitterName: parsed.data.name,
    })

    await auditPublic({
      app: "web",
      actor_email: parsed.data.email || null,
      action: "create",
      entity_type: "driver",
      entity_id: data.id,
      summary: `Created driver #${data.id} (${data.name})`,
    })

    // Queue confirmation and admin emails (fire-and-forget)
    try {
      const driverHtml = await renderTemplate(DriverConfirmation, {
        name: parsed.data.name,
        city: parsed.data.city,
      })

      const adminDriverHtml = await renderTemplate(AdminAlert, {
        type: 'driver',
        submitterName: parsed.data.name,
        submitterEmail: parsed.data.email || 'No email',
        submitterPhone: parsed.data.phone,
        submitterCity: parsed.data.city,
        additionalInfo: [
          `Vehicle: ${parsed.data.vehicleType}`,
          parsed.data.vehicleMakeModel && `Make/model: ${parsed.data.vehicleMakeModel}`,
          parsed.data.vehicleYear && `Year: ${parsed.data.vehicleYear}`,
          parsed.data.vehicleOwnership && `Ownership: ${parsed.data.vehicleOwnership}`,
          `Days/week: ${parsed.data.daysPerWeek}`,
          parsed.data.hoursPerDay && `Hours/day: ${parsed.data.hoursPerDay}`,
          parsed.data.routesAreas && `Routes: ${parsed.data.routesAreas}`,
          parsed.data.platforms?.length && `Platforms: ${parsed.data.platforms.join(", ")}`,
          parsed.data.applicantMessage && `Message: ${parsed.data.applicantMessage}`,
        ]
          .filter(Boolean)
          .join(" · "),
        // No per-record route for leads (list + edit-sheet only) — link to
        // the Drivers list itself rather than a non-existent detail page.
        reviewUrl: reviewUrl('/drivers'),
      })

      if (parsed.data.email) {
        await sendEmail(
          parsed.data.email,
          "Welcome to Admobi - We'll review your application",
          driverHtml
        )
      }

      await sendAdminEmail(
        `New driver lead: ${parsed.data.name}`,
        adminDriverHtml
      )

      console.log("[Admobi API drivers] Driver emails queued")
    } catch (emailError) {
      console.error("[Admobi API drivers] Failed to queue emails:", emailError)
      // Don't block response if email queueing fails
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('[Admobi API drivers] Database error:', error)
    return NextResponse.json({ error: "Failed to save driver" }, { status: 500 })
  }
}
