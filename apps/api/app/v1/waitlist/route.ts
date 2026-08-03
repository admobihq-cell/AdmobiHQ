import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { listWaitlist } from "@/lib/queries/entities"
import { waitlistCreateSchema } from "@/lib/validation/schemas"

export async function GET(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const params = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
    search: searchParams.get("search") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? "desc",
  })

  try {
    const result = await listWaitlist(params)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("[ops /api/waitlist GET]", error)
    return jsonError(
      error instanceof Error ? error.message : "Database query failed",
      503,
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const parsed = await parseJsonBody(req, waitlistCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.waitlistEntry.create({
    data: {
      email: parsed.data.email,
      source: parsed.data.source ?? "manual",
    },
  })

  await auditFromOpsUser(access, {
    action: "create",
    entity_type: "waitlist",
    entity_id: data.id,
    summary: `Created waitlist #${data.id} (${data.email})`,
  })

  return NextResponse.json(data, { status: 201 })
}
