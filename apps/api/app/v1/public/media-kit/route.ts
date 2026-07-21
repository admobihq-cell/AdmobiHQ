import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { mediaKitSchema } from "@/lib/validation/lead-schemas"

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
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error("[Admobi API media-kit] Database error:", error)
    return NextResponse.json({ error: "Failed to save media kit request" }, { status: 500 })
  }
}
