import { NextResponse } from "next/server"

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

  console.log("[Admobi API media-kit]", parsed.data)

  return NextResponse.json({ success: true })
}
