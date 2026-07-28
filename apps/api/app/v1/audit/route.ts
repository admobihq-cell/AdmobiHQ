import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { paginationSchema } from "@workspace/ops-contracts"

import { toAuditEventDto } from "@/lib/audit"
import { requireOpsUser } from "@/lib/auth"
import { jsonError, paginatedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

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

  const entityType = searchParams.get("entity_type") ?? undefined
  const actorEmail = searchParams.get("actor_email") ?? undefined
  const app = searchParams.get("app") ?? undefined
  const action = searchParams.get("action") ?? undefined

  const where: Prisma.AuditEventWhereInput = {}
  if (entityType) where.entity_type = entityType
  if (actorEmail) {
    where.actor_email = { contains: actorEmail, mode: "insensitive" }
  }
  if (app) where.app = app
  if (action) where.action = action
  if (params.search) {
    where.OR = [
      { summary: { contains: params.search, mode: "insensitive" } },
      { actor_email: { contains: params.search, mode: "insensitive" } },
      { entity_id: { contains: params.search, mode: "insensitive" } },
    ]
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        orderBy: { created_at: params.sortDir === "asc" ? "asc" : "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ])

    return NextResponse.json(
      paginatedResponse(
        rows.map(toAuditEventDto),
        total,
        params.page,
        params.pageSize,
      ),
    )
  } catch (error: unknown) {
    console.error("[ops /v1/audit GET]", error)
    return jsonError(
      error instanceof Error ? error.message : "Database query failed",
      503,
    )
  }
}
