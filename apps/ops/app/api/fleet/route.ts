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
import { fleetCreateSchema } from "@/lib/validation/schemas"

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
    sortBy: searchParams.get("sortBy") ?? "created_at",
    sortDir: searchParams.get("sortDir") ?? "desc",
  })

  const where: Prisma.FleetPartnerWhereInput = {}
  if (params.search) {
    where.OR = [
      { company_name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { primary_contact_name: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const city = searchParams.get("city")
  if (city) where.city = city

  const status = searchParams.get("status")
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.fleetPartner.findMany({
      where,
      orderBy: { created_at: params.sortDir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.fleetPartner.count({ where }),
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

  const parsed = await parseJsonBody(req, fleetCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.fleetPartner.create({ data: parsed.data })
  return NextResponse.json(data, { status: 201 })
}
