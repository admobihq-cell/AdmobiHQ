import type { MediaAssetDto } from "@workspace/ops-contracts"

import { authedFetch, jsonInit, type GetToken } from "@/lib/campaigns-client"

/** Root query key for everything the Media Library lists. Campaign mutations
 * invalidate it too, because attaching or removing a creative changes a
 * file's "used in" count. */
export const MEDIA_QUERY_KEY = ["customer-media"] as const

export type MediaFilter = "all" | "image" | "video" | "used" | "unused"

export type MediaSort = "newest" | "name" | "size"

export type MediaListParams = {
  page: number
  search: string
  filter: MediaFilter
  sort: MediaSort
}

export type MediaPage = {
  items: MediaAssetDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const PAGE_SIZE = 24

export async function listMedia(getToken: GetToken, params: MediaListParams): Promise<MediaPage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(PAGE_SIZE) })
  if (params.search) query.set("search", params.search)
  if (params.filter === "image" || params.filter === "video") query.set("type", params.filter)
  if (params.filter === "used" || params.filter === "unused") query.set("usage", params.filter)
  if (params.sort !== "newest") query.set("sort", params.sort)

  const res = await authedFetch(getToken, `/v1/customer/media?${query}`)
  return res.json()
}

export async function uploadMedia(getToken: GetToken, file: File): Promise<MediaAssetDto> {
  const form = new FormData()
  form.append("file", file)
  // Content-Type is deliberately unset: the browser must add the multipart
  // boundary, and setting it by hand produces a body the server can't parse.
  const res = await authedFetch(getToken, "/v1/customer/media", { method: "POST", body: form })
  return res.json()
}

export async function renameMedia(
  getToken: GetToken,
  id: number,
  name: string,
): Promise<MediaAssetDto> {
  const res = await authedFetch(getToken, `/v1/customer/media/${id}`, jsonInit("PATCH", { name }))
  return res.json()
}

export async function deleteMedia(getToken: GetToken, id: number): Promise<void> {
  await authedFetch(getToken, `/v1/customer/media/${id}`, { method: "DELETE" })
}

/** Bytes via the authenticated proxy. Turn the Blob into an object URL — an
 * image tag must never point at Cloudinary, which this deliberately is not. */
export async function fetchMediaBlob(getToken: GetToken, id: number): Promise<Blob> {
  const res = await authedFetch(getToken, `/v1/customer/media/${id}/file`)
  return res.blob()
}
