import { NextResponse } from "next/server"

import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { requireOpsUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  pushTokenRegisterSchema,
  pushTokenUnregisterSchema,
} from "@/lib/validation/push-schemas"

export async function POST(req: Request) {
  let access
  try {
    access = await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const parsed = await parseJsonBody(req, pushTokenRegisterSchema)
  if ("error" in parsed) return parsed.error

  const { expoPushToken, platform } = parsed.data

  try {
    await prisma.opsPushToken.upsert({
      where: { expo_push_token: expoPushToken },
      create: {
        clerk_user_id: access.userId,
        expo_push_token: expoPushToken,
        platform: platform ?? null,
      },
      update: {
        clerk_user_id: access.userId,
        platform: platform ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-tokens] register failed:", error)
    return jsonError("Failed to register push token", 500)
  }
}

export async function DELETE(req: Request) {
  let access
  try {
    access = await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const parsed = await parseJsonBody(req, pushTokenUnregisterSchema)
  if ("error" in parsed) return parsed.error

  try {
    await prisma.opsPushToken.deleteMany({
      where: {
        expo_push_token: parsed.data.expoPushToken,
        clerk_user_id: access.userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-tokens] unregister failed:", error)
    return jsonError("Failed to unregister push token", 500)
  }
}
