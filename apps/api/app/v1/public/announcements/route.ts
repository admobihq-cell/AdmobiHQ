import { NextResponse } from "next/server"

import { jsonError } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

const MAX_ITEMS = 30

export async function GET() {
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
