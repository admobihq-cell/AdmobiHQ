import { NextResponse } from "next/server"

import { paginationSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { listLeads } from "@/lib/queries/entities"
import { leadCreateSchema } from "@/lib/validation/schemas"

export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("leads")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const params = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
    search: searchParams.get("search") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? "created_at",
    sortDir: searchParams.get("sortDir") ?? "desc",
  })

  try {
    const result = await listLeads({
      ...params,
      budget: searchParams.get("budget") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("[ops /api/leads GET]", error)
    return jsonError(
      error instanceof Error ? error.message : "Database query failed",
      503,
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("leads")
  if (auth.error) return auth.error
  const { access } = auth

  const parsed = await parseJsonBody(req, leadCreateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.lead.create({
    data: {
      ...parsed.data,
      audience: "campaign",
      phone: parsed.data.phone ?? null,
    },
  })

  await auditFromOpsUser(access, {
    action: "create",
    entity_type: "lead",
    entity_id: data.id,
    summary: `Created lead #${data.id} (${data.company_name})`,
  })

  return NextResponse.json(data, { status: 201 })
}
