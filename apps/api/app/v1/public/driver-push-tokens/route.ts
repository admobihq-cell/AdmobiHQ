import { NextResponse } from "next/server"

import { getDriverAccess } from "@/lib/driver-auth"
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

  // Same reasoning as the customer push-tokens route: auth is optional so a
  // request without a usable token still registers the device.
  const access = await getDriverAccess()
  const clerkUserId = access.status === "authorized" ? access.userId : null

  try {
    await prisma.driverPushToken.upsert({
      where: { expo_push_token: expoPushToken },
      create: {
        expo_push_token: expoPushToken,
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
        clerk_user_id: clerkUserId,
      },
      update: {
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
        ...(clerkUserId ? { clerk_user_id: clerkUserId } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-tokens] driver register failed:", error)
    return jsonError("Failed to register push token", 500)
  }
}
