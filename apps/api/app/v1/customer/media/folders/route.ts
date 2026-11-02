import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

import { mediaFolderNameSchema, type MediaFolderDto } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireCustomerPermissionAccess("media:read")
  if (auth.error) return auth.error

  const orgId = auth.access.orgId
  const [folders, totals] = await Promise.all([
    prisma.mediaFolder.findMany({ where: { org_id: orgId }, orderBy: { name: "asc" } }),
    prisma.mediaAsset.groupBy({
      by: ["folder_id"],
      where: { org_id: orgId, folder_id: { not: null } },
      _count: { _all: true },
      _sum: { size_bytes: true },
      _max: { updated_at: true },
    }),
  ])

  const totalsByFolder = new Map(totals.map((total) => [total.folder_id, total]))
  const items: MediaFolderDto[] = folders.map((folder) => {
    const total = totalsByFolder.get(folder.id)
    const lastFile = total?._max.updated_at
    const updated = lastFile && lastFile > folder.updated_at ? lastFile : folder.updated_at
    return {
      id: folder.id,
      name: folder.name,
      file_count: total?._count._all ?? 0,
      size_bytes: total?._sum.size_bytes ?? 0,
      updated_at: updated.toISOString(),
    }
  })

  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, mediaFolderNameSchema)
  if ("error" in parsed) return parsed.error

  let created
  try {
    created = await prisma.mediaFolder.create({
      data: {
        org_id: auth.access.orgId,
        name: parsed.data.name,
        created_by_clerk_user_id: auth.access.userId,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(`You already have a folder called "${parsed.data.name}"`, 409)
    }
    throw error
  }

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "media_folder",
    entity_id: created.id,
    summary: `Media folder "${created.name}" created`,
  })

  const dto: MediaFolderDto = {
    id: created.id,
    name: created.name,
    file_count: 0,
    size_bytes: 0,
    updated_at: created.updated_at.toISOString(),
  }
  return NextResponse.json(dto, { status: 201 })
}
