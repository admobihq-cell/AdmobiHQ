"use client"

import { useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { FolderPlus, Upload } from "lucide-react"
import {
  CREATIVE_FILE_EXTENSIONS,
  CREATIVE_FORMATS_LABEL,
  MAX_CREATIVE_BYTES,
  MEDIA_FOLDER_NAME_MAX,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { MediaGrid, NameDialog, type MediaView } from "@/components/media/media-grid"
import { useCreateMediaFolder, useUploadMedia } from "@/lib/use-media"
import { useOrgPermissions } from "@/lib/use-org"

const ACCEPT = CREATIVE_FILE_EXTENSIONS.join(",")
const MAX_MB = Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)

export function MediaLibraryView() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const upload = useUploadMedia()
  const createFolder = useCreateMediaFolder()
  const { can } = useOrgPermissions()
  const canWrite = can("media:write")

  const searchParams = useSearchParams()
  const view: MediaView = searchParams.get("view") === "list" ? "list" : "grid"
  const folderId = Number(searchParams.get("folder")) || null

  function urlWith(key: string, value: string | null): string {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    const query = params.toString()
    return query ? `?${query}` : window.location.pathname
  }

  // The native history API, not a Link: Next keeps useSearchParams in sync and
  // skips the navigation, which would reset the search and filter.
  function changeView(next: MediaView) {
    window.history.replaceState(null, "", urlWith("view", next === "list" ? "list" : null))
  }

  // pushState here, so the browser's Back button leaves the folder.
  function changeFolder(next: number | null) {
    window.history.pushState(null, "", urlWith("folder", next ? String(next) : null))
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    for (const file of Array.from(files)) {
      if (file.size > MAX_CREATIVE_BYTES) {
        setError(`${file.name} is over ${MAX_MB}MB.`)
        continue
      }
      // The hook toasts the reason on failure; keep going with the rest.
      await upload.mutateAsync({ file, folderId }).catch(() => null)
    }

    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Media Manager</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload a creative once and reuse it on any campaign. {CREATIVE_FORMATS_LABEL}, up to{" "}
            {MAX_MB}MB each.
          </p>
        </div>
        {canWrite ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <Button type="button" variant="outline" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus data-icon="inline-start" />
              New folder
            </Button>
            <Button
              type="button"
              loading={upload.isPending}
              loadingText="Uploading…"
              onClick={() => inputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Upload
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <MediaGrid
        view={view}
        onViewChange={changeView}
        folderId={folderId}
        onFolderChange={changeFolder}
        onUpload={canWrite ? () => inputRef.current?.click() : undefined}
      />

      <NameDialog
        open={newFolderOpen}
        title="New folder"
        label="Folder name"
        maxLength={MEDIA_FOLDER_NAME_MAX}
        submitLabel="Create folder"
        pending={createFolder.isPending}
        onSubmit={(name) =>
          createFolder.mutate(name, { onSuccess: () => setNewFolderOpen(false) })
        }
        onClose={() => setNewFolderOpen(false)}
      />
    </div>
  )
}
