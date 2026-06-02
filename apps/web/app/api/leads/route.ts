import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { leadBodySchema } from "@/lib/validation/lead-schemas"
import { sendEmail } from "@/lib/email/send-email"
import { renderTemplate } from "@/lib/email/render-template"
import { CampaignConfirmation } from "@/lib/email/templates/CampaignConfirmation"
import { FleetPartnerConfirmation } from "@/lib/email/templates/FleetPartnerConfirmation"
import { AdminAlert } from "@/lib/email/templates/AdminAlert"

// Database: Neon PostgreSQL with Prisma ORM
// Email: Resend with Bull queue for reliability

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = leadBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    if (parsed.data.audience === 'campaign') {
      const data = await prisma.lead.create({
        data: {
          email: parsed.data.email,
          company_name: parsed.data.company,
          phone: parsed.data.phone || '',
          audience: parsed.data.audience,
          budget_range: parsed.data.budget,
          campaign_start_date: null,
          additional_info: parsed.data.brief || '',
        },
      })
      console.log("[Admobi API leads] Saved campaign lead:", parsed.data)

      // Queue confirmation and admin emails (fire-and-forget)
      try {
        const campaignHtml = await renderTemplate(CampaignConfirmation, {
          name: parsed.data.name,
          company: parsed.data.company,
          budget: parsed.data.budget,
        })

        const adminHtml = await renderTemplate(AdminAlert, {
          type: 'campaign',
          submitterName: parsed.data.name,
          submitterEmail: parsed.data.email,
          submitterPhone: parsed.data.phone,
          submitterCompany: parsed.data.company,
          additionalInfo: parsed.data.brief,
        })

        await sendEmail(
          parsed.data.email,
          "We've received your campaign brief",
          campaignHtml
        )

        await sendEmail(
          process.env.ADMIN_EMAIL || 'admobihq@gmail.com',
          `New Campaign Submission: ${parsed.data.company}`,
          adminHtml
        )

        console.log("[Admobi API leads] Campaign emails queued")
      } catch (emailError) {
        console.error("[Admobi API leads] Failed to queue emails:", emailError)
        // Don't block response if email queueing fails
      }

      return NextResponse.json({ success: true, data })
    } else {
      const data = await prisma.fleetPartner.create({
        data: {
          email: parsed.data.email,
          company_name: parsed.data.fleetOrCompanyName,
          primary_contact_name: parsed.data.primaryContactName,
          phone: parsed.data.phone,
          city: parsed.data.city,
          fleet_types: parsed.data.fleetTypes,
          fleet_size: String(parsed.data.vehicleCount),
          vehicles_active: parsed.data.vehiclesActive,
          notes: parsed.data.notes || '',
        },
      })
      console.log("[Admobi API leads] Saved fleet partner:", parsed.data)

      // Queue confirmation and admin emails (fire-and-forget)
      try {
        const fleetHtml = await renderTemplate(FleetPartnerConfirmation, {
          name: parsed.data.primaryContactName,
          company: parsed.data.fleetOrCompanyName,
        })

        const adminFleetHtml = await renderTemplate(AdminAlert, {
          type: 'fleet',
          submitterName: parsed.data.primaryContactName,
          submitterEmail: parsed.data.email,
          submitterPhone: parsed.data.phone,
          submitterCompany: parsed.data.fleetOrCompanyName,
          submitterCity: parsed.data.city,
          additionalInfo: parsed.data.notes,
        })

        await sendEmail(
          parsed.data.email,
          "We've received your fleet partnership application",
          fleetHtml
        )

        await sendEmail(
          process.env.ADMIN_EMAIL || 'admobihq@gmail.com',
          `New Fleet Partnership Application: ${parsed.data.fleetOrCompanyName}`,
          adminFleetHtml
        )

        console.log("[Admobi API leads] Fleet emails queued")
      } catch (emailError) {
        console.error("[Admobi API leads] Failed to queue emails:", emailError)
        // Don't block response if email queueing fails
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error: unknown) {
    console.error('[Admobi API leads] Database error:', error)
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 })
  }
}
