"use client"

import { useAuth } from "@clerk/nextjs"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  MEDIA_FOLDERS_QUERY_KEY,
  MEDIA_QUERY_KEY,
  createMediaFolder,
  deleteMedia,
  deleteMediaFolder,
  listMedia,
  listMediaFolders,
  moveMedia,
  renameMedia,
  renameMediaFolder,
  setMediaStar,
  uploadMedia,
  type MediaListParams,
  type MediaPage,
} from "@/lib/media-client"

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong"
}

export function useMedia(params: MediaListParams) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, params],
    queryFn: () => listMedia(getToken, params),
    // Keeps the grid on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
  })
}

function useInvalidateMedia() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
}

export function useUploadMedia() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId: number | null }) =>
      uploadMedia(getToken, file, folderId),
    onSuccess: (asset) => {
      invalidate()
      toast.success(`"${asset.name}" added to Media Manager`)
    },
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useRenameMedia() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameMedia(getToken, id, name),
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useMoveMedia() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: ({ id, folderId }: { id: number; folderId: number | null }) =>
      moveMedia(getToken, id, folderId),
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error)),
  })
}

/** Flips the star in the cache straight away, so it answers the click. */
export function useToggleMediaStar() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateMedia()

  function patchStar(id: number, starred: boolean) {
    queryClient.setQueriesData({ queryKey: MEDIA_QUERY_KEY }, (data: unknown) => {
      if (!data || typeof data !== "object" || !("items" in data)) return data
      const page = data as MediaPage
      return {
        ...page,
        items: page.items.map((item) => (item.id === id ? { ...item, starred } : item)),
      }
    })
  }

  return useMutation({
    mutationFn: ({ id, starred }: { id: number; starred: boolean }) =>
      setMediaStar(getToken, id, starred),
    onMutate: ({ id, starred }) => patchStar(id, starred),
    onError: (error, { id, starred }) => {
      patchStar(id, !starred)
      toast.error(messageOf(error))
    },
    onSettled: invalidate,
  })
}

export function useMediaFolders() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: MEDIA_FOLDERS_QUERY_KEY,
    queryFn: () => listMediaFolders(getToken),
  })
}

export function useCreateMediaFolder() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: (name: string) => createMediaFolder(getToken, name),
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useRenameMediaFolder() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      renameMediaFolder(getToken, id, name),
    onSuccess: invalidate,
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useDeleteMediaFolder() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: (id: number) => deleteMediaFolder(getToken, id),
    onSuccess: () => {
      invalidate()
      toast.success("Folder deleted")
    },
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useDeleteMedia() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: (id: number) => deleteMedia(getToken, id),
    onSuccess: () => {
      invalidate()
      toast.success("File deleted")
    },
    // A 409 here carries the server's sentence naming the campaigns still
    // using the file — exactly what the user needs to read.
    onError: (error) => toast.error(messageOf(error)),
  })
}
