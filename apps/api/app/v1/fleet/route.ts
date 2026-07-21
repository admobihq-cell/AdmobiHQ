import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { listFleetPartners } from "@/lib/queries/entities"
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

  try {
    const result = await listFleetPartners({
      ...params,
      city: searchParams.get("city") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("[ops /api/fleet GET]", error)
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

  const parsed = await parseJsonBody(req, fleetCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.fleetPartner.create({ data: parsed.data })
  return NextResponse.json(data, { status: 201 })
}
