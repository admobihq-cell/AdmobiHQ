import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { waitlistSchema } from "@/lib/validation/lead-schemas"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"

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

    // Upsert on a duplicate email re-touches updated_at without a real
    // signup happening — only alert ops staff on the genuine first insert.
    if (data.created_at.getTime() === data.updated_at.getTime()) {
      void notifyOpsStaffAlert({
        type: "waitlist",
        entityId: data.id,
        submitterName: data.email,
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error("[Admobi API waitlist] Database error:", error)
    return NextResponse.json({ error: "Failed to save waitlist entry" }, { status: 500 })
  }
}
