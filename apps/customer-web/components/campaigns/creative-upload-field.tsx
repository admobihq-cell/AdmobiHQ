"use client"

import { useAuth } from "@clerk/nextjs"

import { useRef, useState } from "react"
import { Check, Film, FolderOpen, Trash2, Upload } from "lucide-react"
import {
  CREATIVE_FILE_EXTENSIONS,
  CREATIVE_FORMATS_LABEL,
  MAX_CREATIVE_BYTES,
  MAX_CREATIVES_PER_CAMPAIGN,
  checkCreativeDimensions,
  creativesForPanel,
  specsForFormat,
  type CampaignCreativeDto,
  type CampaignFormat,
  type CreativeSpec,
  type MediaAssetDto,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { BlobPreview } from "@/components/media/blob-preview"
import { MediaGrid } from "@/components/media/media-grid"
import { fetchCreativeBlob } from "@/lib/campaigns-client"
import { useAttachMediaAsset, useDeleteCreative, useUploadCreative } from "@/lib/use-campaigns"
import { useOrgPermissions } from "@/lib/use-org"

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
  const { getToken } = useAuth()
  const isVideo = creative.resource_type === "video"

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/20 duration-200 ease-out animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none">
      <BlobPreview
        queryKey={["campaign-creative-blob", campaignId, creative.id]}
        load={() => fetchCreativeBlob(getToken, campaignId, creative.id)}
        isVideo={isVideo}
        alt={creative.original_filename ?? "Creative"}
      />

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

/** One panel's box: what it is, the shape of art it takes, and its own upload
 * and library buttons — so with "Both panels" nobody has to guess which file
 * goes where. The checks run against THIS panel's spec, so a square file
 * dropped in the taxi-top box is refused with the reason. */
function PanelBox({
  campaignId,
  spec,
  creatives,
  disabled,
  atLimit,
  onCreativesChange,
}: {
  campaignId: number
  spec: CreativeSpec
  /** Every creative on the campaign; this box shows the ones that fit its shape. */
  creatives: CampaignCreativeDto[]
  disabled: boolean
  atLimit: boolean
  onCreativesChange?: (creatives: CampaignCreativeDto[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const upload = useUploadCreative(campaignId)
  const remove = useDeleteCreative(campaignId)
  const attach = useAttachMediaAsset(campaignId)
  const { can } = useOrgPermissions()

  const mine = creativesForPanel(spec.format, creatives)
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
        const check = checkCreativeDimensions(spec, dims.width, dims.height)
        if (!check.ok) {
          setError(check.message ?? `${file.name} doesn't match the ${spec.label} panel.`)
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

  async function handlePick(asset: MediaAssetDto) {
    // The hook toasts the reason on failure; the picker stays open to retry.
    const created = await attach.mutateAsync(asset.id).catch(() => null)
    if (!created) return
    onCreativesChange?.([...creatives, created])
    setLibraryOpen(false)
  }

  return (
    <section
      aria-label={`${spec.label} creative`}
      className={cn(
        "space-y-3 rounded-xl border p-4",
        mine.length > 0 ? "border-border" : "border-dashed border-border bg-muted/20",
      )}
    >
      <div className="flex items-start gap-3">
        {/* The panel's own shape, so 3:1 vs 1:1 is seen, not just read. */}
        <div
          aria-hidden
          className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-muted"
        >
          <div
            className="rounded-[3px] border-2 border-foreground/40"
            style={{
              // Fit the true ratio inside a 4.5rem x 2.25rem stage.
              width: `${Math.min(4.5, 2.25 * spec.aspectRatio)}rem`,
              aspectRatio: spec.aspectRatio,
            }}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold">{spec.label}</h3>
            {mine.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Check className="size-3" aria-hidden />
                {mine.length} added
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">Needs artwork</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {spec.aspectLabel} artwork · {spec.recommendedWidthPx} x {spec.recommendedHeightPx}{" "}
            recommended · {spec.sidesLabel.toLowerCase()}
            {spec.pitch ? ` · ${spec.pitch}` : ""}
          </p>
        </div>
      </div>

      {mine.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {mine.map((creative) => (
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

      <div className={cn("flex flex-col gap-2 sm:flex-row", atLimit && "hidden")}>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:flex-1"
          disabled={busy}
          loading={upload.isPending}
          loadingText="Uploading…"
          onClick={() => inputRef.current?.click()}
        >
          <Upload data-icon="inline-start" />
          {mine.length > 0
            ? `Add another ${spec.aspectLabel}`
            : `Upload ${spec.aspectLabel} creative`}
        </Button>
        {!disabled && can("media:read") ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:flex-1"
            disabled={busy}
            onClick={() => setLibraryOpen(true)}
          >
            <FolderOpen data-icon="inline-start" />
            Browse Media Manager
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Media Manager · {spec.label}</DialogTitle>
            <DialogDescription>
              Pick a {spec.aspectLabel} file you&apos;ve already uploaded. It stays in Media Manager
              and can be used on other campaigns too.
            </DialogDescription>
          </DialogHeader>
          <MediaGrid
            selection={{
              format: spec.format,
              attachedAssetIds: creatives.map((creative) => creative.media_asset_id),
              pendingAssetId: attach.isPending ? (attach.variables ?? null) : null,
              onSelect: (asset) => void handlePick(asset),
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
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
  const remove = useDeleteCreative(campaignId)
  const specs = specsForFormat(format)
  const atLimit = creatives.length >= MAX_CREATIVES_PER_CAMPAIGN
  // Files that fit none of this campaign's panels — e.g. bike art left over
  // after the format was narrowed to taxi-top. They'd never play, so say so.
  const fitted = new Set(specs.flatMap((spec) => creativesForPanel(spec.format, creatives)))
  const stray = creatives.filter((creative) => !fitted.has(creative))

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {specs.length > 1
          ? "This campaign runs on both panels, so each one needs its own artwork. "
          : null}
        {CREATIVE_FORMATS_LABEL} · up to {MAX_MB}MB · {MAX_CREATIVES_PER_CAMPAIGN} files in total
      </p>

      {specs.map((spec) => (
        <PanelBox
          key={spec.format}
          campaignId={campaignId}
          spec={spec}
          creatives={creatives}
          disabled={disabled}
          atLimit={atLimit}
          onCreativesChange={onCreativesChange}
        />
      ))}

      {stray.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-destructive/40 p-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold">Doesn&apos;t fit this campaign</h3>
            <p className="text-xs text-muted-foreground">
              These files don&apos;t match the panel shape this campaign runs on and won&apos;t
              play. Remove them or change the format in the brief.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {stray.map((creative) => (
              <CreativeThumb
                key={creative.id}
                campaignId={campaignId}
                creative={creative}
                disabled={disabled || remove.isPending}
                onDelete={() => {
                  void remove.mutateAsync(creative.id).then(() => {
                    onCreativesChange?.(creatives.filter((item) => item.id !== creative.id))
                  })
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
