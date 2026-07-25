import { NextResponse } from "next/server"

import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { customerPushTokenRegisterSchema } from "@/lib/validation/push-schemas"

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, customerPushTokenRegisterSchema)
  if ("error" in parsed) return parsed.error

  const { expoPushToken, platform } = parsed.data

  try {
    await prisma.customerPushToken.upsert({
      where: { expo_push_token: expoPushToken },
      create: {
        expo_push_token: expoPushToken,
        platform: platform ?? null,
      },
      update: {
        platform: platform ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-tokens] customer register failed:", error)
    return jsonError("Failed to register push token", 500)
  }
}
