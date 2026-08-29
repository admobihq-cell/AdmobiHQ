"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CheckCircle2, Upload } from "lucide-react"
import type { DriverDocumentDto, DriverDocumentType } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import {
  fetchDriverDocumentBlob,
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
  const { getToken } = useAuthIfEnabled()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const previewQuery = useQuery({
    queryKey: ["driver-document-blob", document?.id],
    queryFn: () => fetchDriverDocumentBlob(getToken, document!.id),
    enabled: Boolean(document),
  })
  const previewBlob = previewQuery.data ?? null

  // The Blob is cached (shared with submitted-info-view.tsx's DocumentThumb
  // for the same document id); the object URL derived from it is not — it's
  // revoked on unmount/change, so caching the URL string itself would let a
  // revoked URL leak into another mounted consumer of the same cache entry.
  const previewUrl = useMemo(
    () => (previewBlob ? URL.createObjectURL(previewBlob) : null),
    [previewBlob],
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDriverDocument(getToken, type, file),
    onSuccess: (doc) => onUploaded(doc),
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed"),
  })
  const uploading = uploadMutation.isPending

  function handleFile(file: File) {
    setError(null)
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("File must be under 8MB.")
      return
    }
    uploadMutation.mutate(file)
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
              if (file) handleFile(file)
            }}
          />
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
