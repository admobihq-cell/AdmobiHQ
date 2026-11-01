import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

import { mediaAssetUpdateSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { destroyCampaignCreative } from "@/lib/campaigns/campaign-creative-storage"
import {
  MEDIA_ASSET_INCLUDE,
  getOwnedMediaAsset,
  getOwnedMediaFolder,
  toMediaAssetDto,
} from "@/lib/campaigns/media-asset-store"
import type { PrivateResourceType } from "@/lib/storage/private-media"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  const parsed = await parseJsonBody(req, mediaAssetUpdateSchema)
  if ("error" in parsed) return parsed.error
  const { name, folderId } = parsed.data

  if (folderId && !(await getOwnedMediaFolder(auth.access.orgId, folderId))) {
    return jsonError("That folder doesn't exist", 404)
  }

  const updated = await prisma.mediaAsset.update({
    where: { id },
    data: { name, folder_id: folderId },
    include: MEDIA_ASSET_INCLUDE,
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "media_asset",
    entity_id: id,
    summary:
      name !== undefined
        ? `Media "${asset.name}" renamed to "${updated.name}"`
        : `Media "${asset.name}" moved`,
  })

  return NextResponse.json(toMediaAssetDto(updated))
}

/** Refused while any campaign still uses the file: deleting it would silently
 * pull creative out of a campaign that may be approved and running. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  const { campaigns } = toMediaAssetDto(asset)
  if (campaigns.length > 0) {
    const names = campaigns.map((c) => `"${c.name}"`).join(", ")
    return jsonError(
      `"${asset.name}" is used by ${names}. Remove it from ${campaigns.length === 1 ? "that campaign" : "those campaigns"} first.`,
      409,
      { campaigns },
    )
  }

  try {
    await prisma.mediaAsset.delete({ where: { id } })
  } catch (error) {
    // Attached to a campaign between the check above and this delete. The
    // foreign key's Restrict is the backstop.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(`"${asset.name}" was just added to a campaign. Remove it there first.`, 409)
    }
    throw error
  }

  // Row first, storage second: a leftover Cloudinary file is unreachable and
  // harmless, a row pointing at a destroyed file is a broken library item.
  await destroyCampaignCreative(
    asset.cloudinary_public_id,
    asset.resource_type as PrivateResourceType,
  )

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "media_asset",
    entity_id: id,
    summary: `Media "${asset.name}" deleted`,
  })

  return NextResponse.json({ success: true })
}
