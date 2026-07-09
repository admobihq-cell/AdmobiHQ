import { NextResponse } from "next/server"
import type { z } from "zod"

import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseJsonBody } from "@/lib/api-utils"

type BulkDeleteBody = { action: "delete"; ids: number[] }
type BulkStatusBody = { action: "updateStatus"; ids: number[]; status: string }

export async function handleBulkRequest(
  req: Request,
  schema: z.ZodSchema<BulkDeleteBody | BulkStatusBody>,
  handlers: {
    delete: (ids: number[]) => Promise<number>
    updateStatus?: (ids: number[], status: string) => Promise<number>
  },
) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const parsed = await parseJsonBody(req, schema)
  if ("error" in parsed) return parsed.error

  const { action, ids } = parsed.data

  try {
    if (action === "delete") {
      const count = await handlers.delete(ids)
      return NextResponse.json({ success: true, count })
    }

    if (action === "updateStatus") {
      if (!handlers.updateStatus) {
        return jsonError("Status updates are not supported", 400)
      }
      const count = await handlers.updateStatus(ids, parsed.data.status)
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
