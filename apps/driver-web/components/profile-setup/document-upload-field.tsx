"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { CheckCircle2, Upload } from "lucide-react"
import type { DriverDocumentDto, DriverDocumentType } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  fetchDriverDocumentObjectUrl,
  uploadDriverDocument,
} from "@/lib/driver-profile-client"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 8 * 1024 * 1024

export function DocumentUploadField({
  type,
  label,
  hint,
  document,
  onUploaded,
}: {
  type: DriverDocumentType
  label: string
  hint?: string
  document: DriverDocumentDto | undefined
  onUploaded: (doc: DriverDocumentDto) => void
}) {
  const { getToken } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    if (document) {
      fetchDriverDocumentObjectUrl(getToken, document.id)
        .then((url) => {
          if (cancelled) return
          objectUrl = url
          setPreviewUrl(url)
        })
        .catch(() => {
          if (!cancelled) setPreviewUrl(null)
        })
    } else {
      setPreviewUrl(null)
    }

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id])

  async function handleFile(file: File) {
    setError(null)
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("File must be under 8MB.")
      return
    }

    setUploading(true)
    try {
      const doc = await uploadDriverDocument(getToken, type, file)
      onUploaded(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {document ? (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Uploaded
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed border-border p-3",
          document && "border-solid",
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="size-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Upload className="size-5" aria-hidden />
          </div>
        )}

        <div className="flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            loadingText="Uploading…"
            onClick={() => inputRef.current?.click()}
          >
            {document ? "Replace file" : "Choose file"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void handleFile(file)
            }}
          />
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
