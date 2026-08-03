import { NextResponse } from "next/server"
import { z } from "zod"

import { auditPublic } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { getBearerToken, loadCaseByToken, toPublicMessage } from "@/lib/support"

type Params = { params: Promise<{ id: string }> }

const customerMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
})

export async function POST(req: Request, { params }: Params) {
  const limited = await checkRateLimit(req, "support-reply", { limit: 10, windowSeconds: 60 })
  if (limited) return limited

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const token = getBearerToken(req)
  if (!token) return jsonError("Unauthorized", 401)

  const supportCase = await loadCaseByToken(id, token)
  if (!supportCase) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, customerMessageSchema)
  if ("error" in parsed) return parsed.error

  const reopens = supportCase.status === "resolved" || supportCase.status === "closed"

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        case_id: id,
        author_type: "customer",
        author_email: supportCase.contact_email,
        body: parsed.data.body,
      },
    })

    if (reopens) {
      await tx.supportCase.update({ where: { id }, data: { status: "open" } })
    }

    return created
  })

  await auditPublic({
    app: supportCase.channel,
    actor_email: supportCase.contact_email,
    action: "update",
    entity_type: "support_case",
    entity_id: id,
    summary: `Customer replied on case #${id}`,
  })

  return NextResponse.json({ success: true, data: toPublicMessage(message) }, { status: 201 })
}
