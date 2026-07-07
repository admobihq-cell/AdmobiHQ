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
import { leadCreateSchema } from "@/lib/validation/schemas"

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

  const where: Prisma.LeadWhereInput = {}
  if (params.search) {
    where.OR = [
      { contact_name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { company_name: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const budget = searchParams.get("budget")
  if (budget) where.budget_range = budget

  const status = searchParams.get("status")
  if (status) where.status = status

  const sortField = ["created_at", "contact_name", "company_name", "status"].includes(
    params.sortBy ?? "",
  )
    ? params.sortBy!
    : "created_at"

  try {
    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortField]: params.sortDir },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(items, total, params.page, params.pageSize))
  } catch (error: unknown) {
    console.error("[ops /api/leads GET]", error)
    return jsonError(
      error instanceof Error ? error.message : "Database query failed",
      503,
    )
  }
}

export async function POST(req: Request) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const parsed = await parseJsonBody(req, leadCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.lead.create({
    data: {
      ...parsed.data,
      audience: "campaign",
      phone: parsed.data.phone ?? null,
    },
  })

  return NextResponse.json(data, { status: 201 })
}
