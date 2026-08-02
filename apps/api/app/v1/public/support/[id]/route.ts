import { NextResponse } from "next/server"

import { jsonError, parseId } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { getBearerToken, loadCaseByToken, toPublicCase, toPublicMessage } from "@/lib/support"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const token = getBearerToken(req)
  if (!token) return jsonError("Unauthorized", 401)

  const supportCase = await loadCaseByToken(id, token)
  if (!supportCase) return jsonError("Not found", 404)

  const messages = await prisma.supportMessage.findMany({
    where: { case_id: id, internal_note: false },
    orderBy: { created_at: "asc" },
  })

  return NextResponse.json({
    ...toPublicCase(supportCase),
    messages: messages.map(toPublicMessage),
  })
}
