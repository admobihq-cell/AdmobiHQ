import { NextResponse } from "next/server"

import { requireOpsUser } from "@/lib/auth"
import { jsonError, parseId, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { waitlistUpdateSchema } from "@/lib/validation/schemas"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const item = await prisma.waitlistEntry.findUnique({ where: { id } })
  if (!item) return jsonError("Not found", 404)

  return NextResponse.json(item)
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, waitlistUpdateSchema)
  if ("error" in parsed) return parsed.error

  const data = await prisma.waitlistEntry.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  await prisma.waitlistEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
