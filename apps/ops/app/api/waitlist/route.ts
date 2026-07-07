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
import { waitlistCreateSchema } from "@/lib/validation/schemas"

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

  const where: Prisma.WaitlistEntryWhereInput = {}
  if (params.search) {
    where.email = { contains: params.search, mode: "insensitive" }
  }

  const [items, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      orderBy: { created_at: params.sortDir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.waitlistEntry.count({ where }),
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

  const parsed = await parseJsonBody(req, waitlistCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.waitlistEntry.create({
    data: {
      email: parsed.data.email,
      source: parsed.data.source ?? "manual",
    },
  })

  return NextResponse.json(data, { status: 201 })
}
