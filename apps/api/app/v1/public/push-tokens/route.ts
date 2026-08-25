import { NextResponse } from "next/server"

import { getCustomerAccess } from "@/lib/customer-auth"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { customerPushTokenRegisterSchema } from "@/lib/validation/push-schemas"

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "push-tokens", { limit: 10, windowSeconds: 60 })
  if (limited) return limited

  const parsed = await parseJsonBody(req, customerPushTokenRegisterSchema)
  if ("error" in parsed) return parsed.error

  const { expoPushToken, platform, anonymousDeviceId } = parsed.data

  // Auth is optional here on purpose: a request without a token (or with one
  // that fails to verify, e.g. mid-refresh) must still register the device
  // for push — it just won't carry a clerk_user_id yet. `requireCustomerUser`
  // would 401 the whole request instead, which push registration can't afford.
  const access = await getCustomerAccess()
  const clerkUserId = access.status === "authorized" ? access.userId : null

  try {
    await prisma.customerPushToken.upsert({
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
    console.error("[push-tokens] customer register failed:", error)
    return jsonError("Failed to register push token", 500)
  }
}
