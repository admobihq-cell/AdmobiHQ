import { NextResponse } from "next/server"

import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { getOwnedMediaAsset } from "@/lib/campaigns/media-asset-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/** Stars belong to the person, not the org, so `media:read` is enough: nobody
 * else's library changes. Both verbs are safe to repeat. */
export async function PUT(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:read")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  const key = { media_asset_id: id, clerk_user_id: auth.access.userId }
  await prisma.mediaAssetStar.upsert({
    where: { media_asset_id_clerk_user_id: key },
    create: key,
    update: {},
  })

  return NextResponse.json({ starred: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("media:read")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const asset = await getOwnedMediaAsset(auth.access.orgId, id)
  if (!asset) return jsonError("Not found", 404)

  await prisma.mediaAssetStar.deleteMany({
    where: { media_asset_id: id, clerk_user_id: auth.access.userId },
  })

  return NextResponse.json({ starred: false })
}
