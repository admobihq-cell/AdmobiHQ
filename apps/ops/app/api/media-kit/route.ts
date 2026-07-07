import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"

import { requireOpsUser } from "@/lib/auth"
import {
  jsonError,
  paginatedResponse,
  paginationSchema,
  parseJsonBody,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { mediaKitCreateSchema } from "@/lib/validation/schemas"

export async function GET(req: Request) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { searchParams } = new URL(req.url)
  const params = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
    search: searchParams.get("search") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? "desc",
  })

  const where: Prisma.MediaKitRequestWhereInput = {}
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.mediaKitRequest.findMany({
      where,
      orderBy: { created_at: params.sortDir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.mediaKitRequest.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(items, total, params.page, params.pageSize))
}

export async function POST(req: Request) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const parsed = await parseJsonBody(req, mediaKitCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.mediaKitRequest.create({ data: parsed.data })
  return NextResponse.json(data, { status: 201 })
}
