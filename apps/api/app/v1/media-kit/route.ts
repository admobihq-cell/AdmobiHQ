import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { listMediaKitRequests } from "@/lib/queries/entities"
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

  try {
    const result = await listMediaKitRequests(params)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("[ops /api/media-kit GET]", error)
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

  const parsed = await parseJsonBody(req, mediaKitCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.mediaKitRequest.create({ data: parsed.data })
  return NextResponse.json(data, { status: 201 })
}
