import { NextResponse } from "next/server"

import { auditPublic } from "@/lib/audit"
import { prisma } from "@/lib/prisma"
import { mediaKitSchema } from "@/lib/validation/lead-schemas"
import { notifyOpsStaffAlert } from "@/lib/push/ops-alerts"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = mediaKitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const data = await prisma.mediaKitRequest.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
      },
    })

    console.log("[Admobi API media-kit] Saved:", data.email)

    void notifyOpsStaffAlert({
      type: "media-kit",
      entityId: data.id,
      submitterName: data.name,
    })

    await auditPublic({
      app: "web",
      actor_email: data.email,
      action: "create",
      entity_type: "media_kit",
      entity_id: data.id,
      summary: `Created media kit #${data.id} (${data.email})`,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error("[Admobi API media-kit] Database error:", error)
    return NextResponse.json({ error: "Failed to save media kit request" }, { status: 500 })
  }
}
