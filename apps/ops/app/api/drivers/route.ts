import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { listDrivers } from "@/lib/queries/entities"
import { driverCreateSchema } from "@/lib/validation/schemas"

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
    const result = await listDrivers({
      ...params,
      city: searchParams.get("city") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      vehicleType: searchParams.get("vehicleType") ?? undefined,
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("[ops /api/drivers GET]", error)
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

  const parsed = await parseJsonBody(req, driverCreateSchema)
  if ("error" in parsed) return parsed.error

  const { email, ...rest } = parsed.data
  const data = await prisma.driver.create({
    data: {
      ...rest,
      email: email && email !== "" ? email : null,
    },
  })

  return NextResponse.json(data, { status: 201 })
}
