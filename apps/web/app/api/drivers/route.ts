import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { driverJoinSchema } from "@/lib/validation/lead-schemas"
import { queueEmail } from "@/lib/email/send-email-job"
import { renderTemplate } from "@/lib/email/render-template"
import { DriverConfirmation } from "@/lib/email/templates/DriverConfirmation"
import { AdminAlert } from "@/lib/email/templates/AdminAlert"

export async function POST(req: Request) {
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

    console.log("[Admobi API drivers] Saved:", parsed.data)

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
      })

      await queueEmail({
        to: process.env.TEST_RECIPIENT_EMAIL || parsed.data.email || '',
        subject: "Welcome to Admobi - We'll review your application",
        html: driverHtml,
      })

      await queueEmail({
        to: process.env.ADMIN_EMAIL || 'admobihq@gmail.com',
        subject: `New Driver Application: ${parsed.data.name}`,
        html: adminDriverHtml,
      })

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
