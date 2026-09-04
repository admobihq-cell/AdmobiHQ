import { NextResponse } from "next/server"

import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { renderPdf } from "@/lib/pdf/render-pdf"
import { EntityExportPdf } from "@/lib/pdf/templates/entity-export-pdf"
import { documentExportRequestSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, documentExportRequestSchema)
  if ("error" in parsed) return parsed.error

  // Rows arrive in the body rather than being queried here, so the
  // permission check is on the claimed entity, not on a query result —
  // same trust boundary the existing CSV export already accepts (the
  // client already holds this data before either export path runs).
  const auth = await requireOpsPermissionAccess(parsed.data.entity)
  if (auth.error) return auth.error

  const { title, headers, rows } = parsed.data

  try {
    const bytes = await renderPdf(
      <EntityExportPdf
        title={title}
        headers={headers}
        rows={rows}
        generatedAt={new Date().toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      />,
    )
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    })
  } catch (error: unknown) {
    console.error("[ops /v1/ops/documents/export POST]", error)
    return jsonError(
      error instanceof Error ? error.message : "PDF generation failed",
      500,
    )
  }
}
