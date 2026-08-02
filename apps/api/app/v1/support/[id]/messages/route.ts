import { NextResponse } from "next/server"

import { supportMessageCreateSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseId, parseJsonBody } from "@/lib/api-utils"
import { renderTemplate } from "@/lib/email/render-template"
import { SupportCaseReply } from "@/lib/email/templates/SupportCaseReply"
import { sendEmail } from "@/lib/email/send-email"
import { prisma } from "@/lib/prisma"
import { toOpsMessage } from "@/lib/support"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  let access
  try {
    access = await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const supportCase = await prisma.supportCase.findUnique({ where: { id } })
  if (!supportCase) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, supportMessageCreateSchema)
  if ("error" in parsed) return parsed.error

  const internalNote = parsed.data.internal_note === true

  const message = await prisma.supportMessage.create({
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
    await prisma.supportCase.update({ where: { id }, data: { status: "pending" } })
  }

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
