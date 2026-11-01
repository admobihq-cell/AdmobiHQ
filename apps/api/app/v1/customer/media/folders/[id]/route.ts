import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

import { mediaFolderNameSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { getOwnedMediaFolder } from "@/lib/campaigns/media-asset-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const folder = await getOwnedMediaFolder(auth.access.orgId, id)
  if (!folder) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, mediaFolderNameSchema)
  if ("error" in parsed) return parsed.error

  try {
    await prisma.mediaFolder.update({ where: { id }, data: { name: parsed.data.name } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(`You already have a folder called "${parsed.data.name}"`, 409)
    }
    throw error
  }

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "media_folder",
    entity_id: id,
    summary: `Media folder "${folder.name}" renamed to "${parsed.data.name}"`,
  })

  return NextResponse.json({ id, name: parsed.data.name })
}

/** The folder goes; its files stay in the library, out of any folder. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const folder = await getOwnedMediaFolder(auth.access.orgId, id)
  if (!folder) return jsonError("Not found", 404)

  await prisma.mediaFolder.delete({ where: { id } })

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "media_folder",
    entity_id: id,
    summary: `Media folder "${folder.name}" deleted`,
  })

  return NextResponse.json({ success: true })
}
