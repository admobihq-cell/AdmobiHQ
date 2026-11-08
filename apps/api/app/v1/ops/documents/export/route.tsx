import { NextResponse } from "next/server"

import {
  jsonError,
  parseJsonBody,
  requireOpsAdminAccess,
  requireOpsPermissionAccess,
} from "@/lib/api-utils"
import { latin1 } from "@/lib/pdf/latin1"
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
  const { entity } = parsed.data
  const auth =
    entity === "admin"
      ? await requireOpsAdminAccess()
      : await requireOpsPermissionAccess(entity)
  if (auth.error) return auth.error

  // Rows are whatever the list page shows (names, "—" placeholders, "→"
  // flight ranges), and the PDF font throws on anything outside Latin-1.
  const title = latin1(parsed.data.title)
  const headers = parsed.data.headers.map(latin1)
  const rows = parsed.data.rows.map((row) => row.map(latin1))

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
      {
        metadata: {
          title: `Admobi — ${title}`,
          authors: ["Admobi"],
          creationDate: new Date().toISOString().slice(0, 10),
        },
      },
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
