import type { MediaAssetDto, MediaFolderDto } from "@workspace/ops-contracts"

import { authedFetch, jsonInit, type GetToken } from "@/lib/campaigns-client"

/** Root query key for everything the Media Manager lists. Campaign mutations
 * invalidate it too, because attaching or removing a creative changes a
 * file's "used in" count. */
export const MEDIA_QUERY_KEY = ["customer-media"] as const

export const MEDIA_FOLDERS_QUERY_KEY = [...MEDIA_QUERY_KEY, "folders"] as const

export type MediaFilter = "all" | "starred" | "image" | "video" | "used" | "unused"

export type MediaSort = "newest" | "name" | "size"

export type MediaListParams = {
  page: number
  search: string
  filter: MediaFilter
  sort: MediaSort
  /** Null lists every file, in a folder or not. */
  folderId: number | null
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
  if (params.filter === "starred") query.set("starred", "true")
  if (params.sort !== "newest") query.set("sort", params.sort)
  if (params.folderId != null) query.set("folder", String(params.folderId))

  const res = await authedFetch(getToken, `/v1/customer/media?${query}`)
  return res.json()
}

export async function uploadMedia(
  getToken: GetToken,
  file: File,
  folderId: number | null,
): Promise<MediaAssetDto> {
  const form = new FormData()
  form.append("file", file)
  if (folderId != null) form.append("folderId", String(folderId))
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

/** Null takes the file out of its folder. */
export async function moveMedia(
  getToken: GetToken,
  id: number,
  folderId: number | null,
): Promise<MediaAssetDto> {
  const res = await authedFetch(
    getToken,
    `/v1/customer/media/${id}`,
    jsonInit("PATCH", { folderId }),
  )
  return res.json()
}

export async function setMediaStar(
  getToken: GetToken,
  id: number,
  starred: boolean,
): Promise<void> {
  await authedFetch(getToken, `/v1/customer/media/${id}/star`, {
    method: starred ? "PUT" : "DELETE",
  })
}

export async function listMediaFolders(getToken: GetToken): Promise<MediaFolderDto[]> {
  const res = await authedFetch(getToken, "/v1/customer/media/folders")
  return res.json()
}

export async function createMediaFolder(getToken: GetToken, name: string): Promise<MediaFolderDto> {
  const res = await authedFetch(getToken, "/v1/customer/media/folders", jsonInit("POST", { name }))
  return res.json()
}

export async function renameMediaFolder(
  getToken: GetToken,
  id: number,
  name: string,
): Promise<void> {
  await authedFetch(getToken, `/v1/customer/media/folders/${id}`, jsonInit("PATCH", { name }))
}

export async function deleteMediaFolder(getToken: GetToken, id: number): Promise<void> {
  await authedFetch(getToken, `/v1/customer/media/folders/${id}`, { method: "DELETE" })
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
