import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { leadBodySchema } from "@/lib/validation/lead-schemas"

// Database: Neon PostgreSQL with Prisma ORM

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
      return NextResponse.json({ success: true, data })
    }
  } catch (error: unknown) {
    console.error('[Admobi API leads] Database error:', error)
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 })
  }
}
