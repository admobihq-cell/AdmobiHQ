import { NextResponse } from "next/server"

import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { driverPushTokenRegisterSchema } from "@/lib/validation/push-schemas"

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "driver-push-tokens", { limit: 10, windowSeconds: 60 })
  if (limited) return limited

  const parsed = await parseJsonBody(req, driverPushTokenRegisterSchema)
  if ("error" in parsed) return parsed.error

  const { expoPushToken, platform, anonymousDeviceId } = parsed.data

  try {
    await prisma.driverPushToken.upsert({
      where: { expo_push_token: expoPushToken },
      create: {
        expo_push_token: expoPushToken,
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
      },
      update: {
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-tokens] driver register failed:", error)
    return jsonError("Failed to register push token", 500)
  }
}
