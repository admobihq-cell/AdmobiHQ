import { NextResponse } from "next/server"

import { ANNOUNCEMENT_TARGET_APPS, type AnnouncementTargetApp } from "@workspace/ops-contracts"

import { jsonError } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"

const MAX_ITEMS = 30
const DEFAULT_APP: AnnouncementTargetApp = "customer-mobile"

function resolveTargetApp(appParam: string | null): AnnouncementTargetApp {
  return (ANNOUNCEMENT_TARGET_APPS as readonly string[]).includes(appParam ?? "")
    ? (appParam as AnnouncementTargetApp)
    : DEFAULT_APP
}

export async function GET(req: Request) {
  const limited = await checkRateLimit(req, "announcements", { limit: 30, windowSeconds: 60 })
  if (limited) return limited

  // Always resolved to a concrete app (default customer-mobile) and always
  // filtered — never skip the `has` filter just because `?app=` is absent,
  // or a driver-only broadcast would leak into the customer feed and vice versa.
  const { searchParams } = new URL(req.url)
  const app = resolveTargetApp(searchParams.get("app"))

  try {
    const items = await prisma.announcementBroadcast.findMany({
      where: { deleted_at: null, target_apps: { has: app } },
      orderBy: { created_at: "desc" },
      take: MAX_ITEMS,
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        image_url: true,
        created_at: true,
      },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("[public/announcements] failed:", error)
    return jsonError("Failed to load announcements", 500)
  }
}
