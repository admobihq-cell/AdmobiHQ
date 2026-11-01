"use client"

import { useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import {
  CREATIVE_FILE_EXTENSIONS,
  CREATIVE_FORMATS_LABEL,
  MAX_CREATIVE_BYTES,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { MediaGrid, type MediaView } from "@/components/media/media-grid"
import { useUploadMedia } from "@/lib/use-media"
import { useOrgPermissions } from "@/lib/use-org"

const ACCEPT = CREATIVE_FILE_EXTENSIONS.join(",")
const MAX_MB = Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)

export function MediaLibraryView() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useUploadMedia()
  const { can } = useOrgPermissions()
  const canWrite = can("media:write")

  const searchParams = useSearchParams()
  const view: MediaView = searchParams.get("view") === "list" ? "list" : "grid"

  // history.replaceState, not a Link: Next keeps useSearchParams in sync and
  // skips the navigation, which would reset the search and filter.
  function changeView(next: MediaView) {
    window.history.replaceState(null, "", next === "list" ? "?view=list" : window.location.pathname)
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
      await upload.mutateAsync(file).catch(() => null)
    }

    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Media</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload a creative once and reuse it on any campaign. {CREATIVE_FORMATS_LABEL}, up to{" "}
            {MAX_MB}MB each.
          </p>
        </div>
        {canWrite ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <Button
              type="button"
              className="w-fit"
              loading={upload.isPending}
              loadingText="Uploading…"
              onClick={() => inputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Upload
            </Button>
          </>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <MediaGrid
        view={view}
        onViewChange={changeView}
        onUpload={canWrite ? () => inputRef.current?.click() : undefined}
      />
    </div>
  )
}
