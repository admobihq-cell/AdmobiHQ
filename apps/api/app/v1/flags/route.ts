import { NextResponse } from "next/server"

import { PLATFORM_FLAG_KEYS, platformFlagUpdateSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const rows = await prisma.platformFlag.findMany({ orderBy: { key: "asc" } })
  const byKey = new Map(rows.map((row) => [row.key, row]))

  const flags = PLATFORM_FLAG_KEYS.map((key) => {
    const existing = byKey.get(key)
    return {
      key,
      enabled: existing?.enabled ?? false,
      updated_by_email: existing?.updated_by_email ?? null,
      updated_at: (existing?.updated_at ?? new Date(0)).toISOString(),
    }
  })

  return NextResponse.json({ items: flags })
}

export async function PATCH(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const parsed = await parseJsonBody(req, platformFlagUpdateSchema)
  if ("error" in parsed) return parsed.error
  const { key, enabled } = parsed.data

  const flag = await prisma.platformFlag.upsert({
    where: { key },
    create: { key, enabled, updated_by_email: access.email },
    update: { enabled, updated_by_email: access.email },
  })

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "platform_flag",
    entity_id: flag.key,
    summary: `${enabled ? "Enabled" : "Disabled"} platform flag "${key}"`,
  })

  return NextResponse.json({
    key: flag.key,
    enabled: flag.enabled,
    updated_by_email: flag.updated_by_email,
    updated_at: flag.updated_at.toISOString(),
  })
}
