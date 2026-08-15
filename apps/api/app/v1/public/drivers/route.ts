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
        additionalInfo: `Vehicle: ${parsed.data.vehicleType}, Days/week: ${parsed.data.daysPerWeek}`,
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
