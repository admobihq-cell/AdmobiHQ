import { NextResponse } from "next/server"

import { jsonError } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"

const MAX_ITEMS = 30

export async function GET(req: Request) {
  const limited = await checkRateLimit(req, "announcements", { limit: 30, windowSeconds: 60 })
  if (limited) return limited

  try {
    const items = await prisma.announcementBroadcast.findMany({
      where: { deleted_at: null },
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
