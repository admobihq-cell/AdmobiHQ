import { NextResponse } from "next/server"

import { leadBodySchema } from "@/lib/validation/lead-schemas"

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

  console.log("[Admobi API leads]", parsed.data.audience, parsed.data)

  return NextResponse.json({ success: true })
}
