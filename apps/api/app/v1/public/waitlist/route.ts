import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { waitlistSchema } from "@/lib/validation/lead-schemas"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = waitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const data = await prisma.waitlistEntry.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, source: "homepage" },
      update: {},
    })

    console.log("[Admobi API waitlist] Saved:", data.email)
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error("[Admobi API waitlist] Database error:", error)
    return NextResponse.json({ error: "Failed to save waitlist entry" }, { status: 500 })
  }
}
