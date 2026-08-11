import { NextResponse } from "next/server"

import { supportMessageCreateSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { renderTemplate } from "@/lib/email/render-template"
import { SupportCaseReply } from "@/lib/email/templates/SupportCaseReply"
import { sendEmail } from "@/lib/email/send-email"
import { prisma } from "@/lib/prisma"
import { toOpsMessage } from "@/lib/support"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("support")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const supportCase = await prisma.supportCase.findUnique({ where: { id } })
  if (!supportCase) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, supportMessageCreateSchema)
  if ("error" in parsed) return parsed.error

  const internalNote = parsed.data.internal_note === true

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        case_id: id,
        author_type: "ops",
        author_email: access.email,
        author_clerk_id: access.userId,
        body: parsed.data.body,
        internal_note: internalNote,
      },
    })

    if (!internalNote && supportCase.status === "open") {
      await tx.supportCase.update({ where: { id }, data: { status: "pending" } })
    }

    return created
  })

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "support_case",
    entity_id: id,
    summary: internalNote
      ? `Added internal note on case #${id}`
      : `Replied on case #${id}`,
  })

  if (!internalNote) {
    try {
      const html = await renderTemplate(SupportCaseReply, {
        name: supportCase.contact_name,
        caseId: id,
        subject: supportCase.subject,
        reply: parsed.data.body,
      })
      await sendEmail(supportCase.contact_email, `Re: ${supportCase.subject} (case #${id})`, html)
    } catch (emailError) {
      console.error("[support] Failed to send reply email:", emailError)
    }
  }

  return NextResponse.json({ success: true, data: toOpsMessage(message) }, { status: 201 })
}
