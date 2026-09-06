"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Film, Trash2, Upload } from "lucide-react"
import {
  CREATIVE_FILE_EXTENSIONS,
  CREATIVE_FORMATS_LABEL,
  MAX_CREATIVE_BYTES,
  MAX_CREATIVES_PER_CAMPAIGN,
  checkCreativeForFormat,
  specsForFormat,
  type CampaignCreativeDto,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { ImageLightbox } from "@workspace/ui/components/image-lightbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import { fetchCreativeBlob } from "@/lib/campaigns-client"
import { useDeleteCreative, useUploadCreative } from "@/lib/use-campaigns"

const ACCEPT = CREATIVE_FILE_EXTENSIONS.join(",")
const MAX_MB = Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)

/** Reads a local file's dimensions before upload, purely so a wrong-shaped
 * file fails instantly instead of after a 50MB round trip. The server check
 * is the real gate. Resolves null when the browser can't decode it — in which
 * case we upload and let the server decide. */
function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const done = (value: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }

    if (file.type.startsWith("video/")) {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => done({ width: video.videoWidth, height: video.videoHeight })
      video.onerror = () => done(null)
      video.src = url
      return
    }

    const image = new Image()
    image.onload = () => done({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => done(null)
    image.src = url
  })
}

function CreativeThumb({
  campaignId,
  creative,
  onDelete,
  disabled,
}: {
  campaignId: number
  creative: CampaignCreativeDto
  onDelete: () => void
  disabled: boolean
}) {
  const { getToken } = useAuthIfEnabled()
  const isVideo = creative.resource_type === "video"

  const blobQuery = useQuery({
    queryKey: ["campaign-creative-blob", campaignId, creative.id],
    queryFn: () => fetchCreativeBlob(getToken, campaignId, creative.id),
  })

  // The Blob is cached; the object URL derived from it is not — it's revoked
  // on unmount, so caching the URL string would let a revoked URL leak into
  // another consumer of the same cache entry.
  const url = useMemo(
    () => (blobQuery.data ? URL.createObjectURL(blobQuery.data) : null),
    [blobQuery.data],
  )
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const preview = url ? (
    isVideo ? (
      <video src={url} controls className="h-32 w-full bg-black object-contain" />
    ) : (
      <ImageLightbox src={url} alt={creative.original_filename ?? "Creative"}>
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL from an authenticated blob, not a remote asset next/image can optimize */}
        <img
          src={url}
          alt={creative.original_filename ?? "Creative"}
          className="h-32 w-full object-contain"
        />
      </ImageLightbox>
    )
  ) : blobQuery.isError ? (
    <button
      type="button"
      onClick={() => void blobQuery.refetch()}
      className="flex h-32 w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted"
    >
      <span>Couldn&apos;t load preview</span>
      <span className="font-medium text-foreground">Click to retry</span>
    </button>
  ) : (
    <Skeleton className="h-32 w-full" />
  )

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/20 duration-200 ease-out animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none">
      {preview}

      <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {isVideo ? <Film className="size-3 shrink-0" aria-hidden /> : null}
          <span className="truncate">
            {creative.width && creative.height
              ? `${creative.width} x ${creative.height}`
              : (creative.original_filename ?? "Creative")}
          </span>
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={disabled}
          onClick={onDelete}
          aria-label="Remove creative"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

export function CreativeUploadField({
  campaignId,
  format,
  creatives,
  disabled = false,
  onCreativesChange,
}: {
  campaignId: number
  format: CampaignFormat
  creatives: CampaignCreativeDto[]
  disabled?: boolean
  /** Keeps the wizard's local campaign snapshot in sync so Continue unlocks
   * as soon as an upload lands (query invalidation alone is not enough). */
  onCreativesChange?: (creatives: CampaignCreativeDto[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useUploadCreative(campaignId)
  const remove = useDeleteCreative(campaignId)

  const specs = specsForFormat(format)
  const atLimit = creatives.length >= MAX_CREATIVES_PER_CAMPAIGN
  const busy = disabled || upload.isPending

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    let next = creatives
    for (const file of Array.from(files)) {
      if (file.size > MAX_CREATIVE_BYTES) {
        setError(`${file.name} is over ${MAX_MB}MB.`)
        continue
      }
      const dims = await readDimensions(file)
      if (dims) {
        const check = checkCreativeForFormat(format, dims.width, dims.height)
        if (!check.ok) {
          setError(check.message ?? `${file.name} doesn't match the panel.`)
          continue
        }
      }
      const created = await upload.mutateAsync(file).catch(() => null)
      if (created) {
        next = [...next, created]
        onCreativesChange?.(next)
      }
    }

    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Creative specs</p>
        <ul className="mt-1.5 space-y-1">
          {specs.map((spec) => (
            <li key={spec.format}>
              <span className="font-medium text-foreground">{spec.label}</span> —{" "}
              {spec.widthMm} x {spec.heightMm} mm{spec.pitch ? `, ${spec.pitch}` : ""},{" "}
              {spec.aspectLabel}, {spec.sidesLabel.toLowerCase()}
            </li>
          ))}
        </ul>
        <p className="mt-1.5">
          {CREATIVE_FORMATS_LABEL} · up to {MAX_MB}MB · max {MAX_CREATIVES_PER_CAMPAIGN} files
        </p>
        {specs.length > 1 ? (
          <p className="mt-1.5 font-medium text-foreground">
            This campaign runs on both panels, so it needs artwork for each shape.
          </p>
        ) : null}
      </div>

      {creatives.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {creatives.map((creative) => (
            <CreativeThumb
              key={creative.id}
              campaignId={campaignId}
              creative={creative}
              disabled={busy || remove.isPending}
              onDelete={() => {
                void remove.mutateAsync(creative.id).then(() => {
                  onCreativesChange?.(creatives.filter((item) => item.id !== creative.id))
                })
              }}
            />
          ))}
        </div>
      ) : null}

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
        variant="outline"
        className={cn("w-full", atLimit && "hidden")}
        disabled={busy}
        loading={upload.isPending}
        loadingText="Uploading…"
        onClick={() => inputRef.current?.click()}
      >
        <Upload data-icon="inline-start" />
        {creatives.length > 0 ? "Add another creative" : "Upload creative"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
