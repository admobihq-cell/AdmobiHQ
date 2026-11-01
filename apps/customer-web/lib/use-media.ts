"use client"

import { useAuth } from "@clerk/nextjs"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  MEDIA_QUERY_KEY,
  deleteMedia,
  listMedia,
  renameMedia,
  uploadMedia,
  type MediaListParams,
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
    mutationFn: (file: File) => uploadMedia(getToken, file),
    onSuccess: (asset) => {
      invalidate()
      toast.success(`"${asset.name}" added to your library`)
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
