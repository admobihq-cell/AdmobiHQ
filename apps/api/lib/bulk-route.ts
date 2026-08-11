import { NextResponse } from "next/server"
import type { z } from "zod"
import type { AuditEntityType, OpsPermission } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"

type BulkDeleteBody = { action: "delete"; ids: number[] }
type BulkStatusBody = { action: "updateStatus"; ids: number[]; status: string }

export async function handleBulkRequest(
  req: Request,
  schema: z.ZodSchema<BulkDeleteBody | BulkStatusBody>,
  handlers: {
    delete: (ids: number[]) => Promise<number>
    updateStatus?: (ids: number[], status: string) => Promise<number>
  },
  entityType: AuditEntityType,
  permission: OpsPermission,
) {
  const auth = await requireOpsPermissionAccess(permission)
  if (auth.error) return auth.error
  const { access } = auth

  const parsed = await parseJsonBody(req, schema)
  if ("error" in parsed) return parsed.error

  const { action, ids } = parsed.data

  try {
    if (action === "delete") {
      const count = await handlers.delete(ids)
      await auditFromOpsUser(access, {
        action: "bulk_delete",
        entity_type: entityType,
        summary: `Bulk deleted ${count} ${entityType} record${count === 1 ? "" : "s"}`,
        metadata: { ids, count },
      })
      return NextResponse.json({ success: true, count })
    }

    if (action === "updateStatus") {
      if (!handlers.updateStatus) {
        return jsonError("Status updates are not supported", 400)
      }
      const count = await handlers.updateStatus(ids, parsed.data.status)
      await auditFromOpsUser(access, {
        action: "bulk_status",
        entity_type: entityType,
        summary: `Bulk set ${count} ${entityType} record${count === 1 ? "" : "s"} → ${parsed.data.status}`,
        metadata: { ids, count, status: parsed.data.status },
      })
      return NextResponse.json({ success: true, count })
    }

    return jsonError("Unknown action", 400)
  } catch (error: unknown) {
    console.error("[ops bulk action]", error)
    return jsonError(
      error instanceof Error ? error.message : "Bulk action failed",
      503,
    )
  }
}
