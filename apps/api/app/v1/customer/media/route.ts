import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

import { paginatedResponse, paginationSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { resolveCustomerIdentities } from "@/lib/advertiser/advertiser-org"
import {
  MEDIA_ASSET_INCLUDE,
  getOwnedMediaFolder,
  mediaAssetCreateData,
  storeCreativeFile,
  toMediaAssetDto,
} from "@/lib/campaigns/media-asset-store"
import { prisma } from "@/lib/prisma"

/** Newest first unless asked otherwise. The id tiebreak keeps paging stable
 * when two rows share a name, a size or a timestamp. */
function orderByFor(sort: string | null): Prisma.MediaAssetOrderByWithRelationInput[] {
  if (sort === "name") return [{ name: "asc" }, { id: "desc" }]
  if (sort === "size") return [{ size_bytes: "desc" }, { id: "desc" }]
  return [{ created_at: "desc" }, { id: "desc" }]
}

export async function GET(req: Request) {
  const auth = await requireCustomerPermissionAccess("media:read")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const paging = paginationSchema.safeParse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 24,
  })
  if (!paging.success) return jsonError("Invalid page", 400)
  const { page, pageSize } = paging.data

  const search = searchParams.get("search")?.trim() || undefined
  const type = searchParams.get("type")
  const usage = searchParams.get("usage")
  const folderId = parseId(searchParams.get("folder") ?? "")
  const userId = auth.access.userId

  const where: Prisma.MediaAssetWhereInput = {
    org_id: auth.access.orgId,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(type === "image" || type === "video" ? { resource_type: type } : {}),
    ...(usage === "used"
      ? { attachments: { some: {} } }
      : usage === "unused"
        ? { attachments: { none: {} } }
        : {}),
    ...(folderId ? { folder_id: folderId } : {}),
    ...(searchParams.get("starred") === "true"
      ? { stars: { some: { clerk_user_id: userId } } }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: orderByFor(searchParams.get("sort")),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: MEDIA_ASSET_INCLUDE,
    }),
    prisma.mediaAsset.count({ where }),
  ])

  // One batched Clerk lookup for the page, same as the campaigns list.
  const [uploaders, stars] = await Promise.all([
    resolveCustomerIdentities(rows.map((r) => r.created_by_clerk_user_id)),
    prisma.mediaAssetStar.findMany({
      where: { clerk_user_id: userId, media_asset_id: { in: rows.map((r) => r.id) } },
      select: { media_asset_id: true },
    }),
  ])
  const starredIds = new Set(stars.map((star) => star.media_asset_id))
  const items = rows.map((row) => {
    const uploader = uploaders.get(row.created_by_clerk_user_id)
    return toMediaAssetDto(row, {
      createdByName: uploader?.name ?? uploader?.email ?? null,
      starred: starredIds.has(row.id),
    })
  })

  return NextResponse.json(paginatedResponse(items, total, page, pageSize))
}

/** Uploads straight into the library. There is no campaign here, so there is
 * no panel to judge the file against — a 4:3 image is as "ready" as a 3:1 one.
 * Fit is checked when the file is attached to a campaign. */
export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("media:write")
  if (auth.error) return auth.error

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return jsonError("Missing file", 400)

  // Checked before storing, so a bad folder never leaves a file behind.
  const rawFolderId = form?.get("folderId")
  let folderId: number | null = null
  if (typeof rawFolderId === "string") {
    folderId = parseId(rawFolderId)
    if (!folderId || !(await getOwnedMediaFolder(auth.access.orgId, folderId))) {
      return jsonError("That folder doesn't exist", 404)
    }
  }

  const result = await storeCreativeFile(auth.access.orgId, file)
  if (result.error) return result.error

  const created = await prisma.mediaAsset.create({
    data: mediaAssetCreateData({
      orgId: auth.access.orgId,
      userId: auth.access.userId,
      file,
      stored: result.stored,
      folderId,
    }),
    include: MEDIA_ASSET_INCLUDE,
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "media_asset",
    entity_id: created.id,
    summary: `Media "${created.name}" uploaded (${created.resource_type})`,
  })

  return NextResponse.json(toMediaAssetDto(created), { status: 201 })
}
