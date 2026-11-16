import { NextResponse } from "next/server"

import { integrationInputSchema, totals } from "@workspace/ops-contracts/integration-costs"
import { queryIntegrations } from "@workspace/ops-queries"

import { auditFromOpsUser } from "@/lib/audit"
import { parseJsonBody, requireOpsAdminAccess } from "@/lib/api-utils"
import { toIntegrationDto } from "@/lib/integrations"
import { opsDb } from "@/lib/ops-db"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** Every tool and subscription, with the monthly USD / KES totals the ops console's Integrations page shows. Ops admin only. */
export async function GET() {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error

  const items = await queryIntegrations(opsDb())
  return NextResponse.json({ items, totals: totals(items) })
}

/** Adds an integration. Same rules as the console's form (`integrationInputSchema`). */
export async function POST(req: Request) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, integrationInputSchema)
  if ("error" in parsed) return parsed.error

  const row = await prisma.integration.create({ data: { ...parsed.data, updated_by_email: auth.access.email } })
  await auditFromOpsUser(auth.access, {
    action: "create",
    entity_type: "integration",
    entity_id: row.id,
    summary: `Added integration ${row.name}`,
    metadata: { name: row.name, category: row.category, cost: Number(row.cost), currency: row.currency },
  })
  return NextResponse.json(toIntegrationDto(row), { status: 201 })
}
