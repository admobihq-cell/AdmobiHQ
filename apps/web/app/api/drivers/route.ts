import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { driverJoinSchema } from "@/lib/validation/lead-schemas"

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
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admobi API drivers] Database error:', error)
    return NextResponse.json({ error: "Failed to save driver" }, { status: 500 })
  }
}
