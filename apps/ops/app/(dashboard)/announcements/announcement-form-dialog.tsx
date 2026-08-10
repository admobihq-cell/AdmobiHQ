"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"

import { ANNOUNCEMENT_FORM_FIELDS, ANNOUNCEMENT_TARGET_APP_OPTIONS } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

// Matches ops-mobile / rich-notification 2:1 banner frame.
const TARGET_WIDTH = 1200
const TARGET_HEIGHT = 600
const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT

const CATEGORY_FIELD = ANNOUNCEMENT_FORM_FIELDS.find((field) => field.name === "category")!

export type AnnouncementFormValues = {
  title: string
  body: string
  category: string
  targetApps: string[]
  /** Cropped JPEG ready to upload, if the user attached an image. */
  imageBlob: Blob | null
}

type AnnouncementFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving?: boolean
  onSubmit: (values: AnnouncementFormValues) => void
}

async function autoCropToTarget(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = bitmap
    const sourceAspect = width / height
    const crop =
      sourceAspect > TARGET_ASPECT
        ? {
            sx: (width - height * TARGET_ASPECT) / 2,
            sy: 0,
            sw: height * TARGET_ASPECT,
            sh: height,
          }
        : {
            sx: 0,
            sy: (height - width / TARGET_ASPECT) / 2,
            sw: width,
            sh: width / TARGET_ASPECT,
          }

    const canvas = document.createElement("canvas")
    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas unavailable")
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
        "image/jpeg",
        0.85,
      )
    })
  } finally {
    bitmap.close()
  }
}

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  saving = false,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState("announcement")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetApps, setTargetApps] = useState<string[]>(["customer-mobile"])
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setCategory("announcement")
    setTitle("")
    setBody("")
    setTargetApps(["customer-mobile"])
    setImageBlob(null)
    setPreviewUrl(null)
    setProcessingImage(false)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [open])

  useEffect(() => {
    if (!imageBlob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageBlob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageBlob])

  async function handleFileChange(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setImageError("Choose a JPEG, PNG, or WebP image.")
      return
    }
    setProcessingImage(true)
    setImageError(null)
    try {
      const cropped = await autoCropToTarget(file)
      setImageBlob(cropped)
    } catch {
      setImageError("Couldn't process that image. Try a different one.")
      setImageBlob(null)
    } finally {
      setProcessingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function clearImage() {
    setImageBlob(null)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({
              title: title.trim(),
              body: body.trim(),
              category,
              targetApps,
              imageBlob,
            })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label>Send to</Label>
            <div className="flex flex-col gap-2">
              {ANNOUNCEMENT_TARGET_APP_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={targetApps.includes(option.value)}
                    onCheckedChange={(checked) =>
                      setTargetApps((current) =>
                        checked === true
                          ? [...current, option.value]
                          : current.filter((value) => value !== option.value),
                      )
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-category">{CATEGORY_FIELD.label}</Label>
            <select
              id="announcement-category"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {CATEGORY_FIELD.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New payout schedule"
              required
              maxLength={65}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-body">Message</Label>
            <Textarea
              id="announcement-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the notification customers will see…"
              required
              maxLength={178}
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={fileInputId}>Image (optional)</Label>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={processingImage || saving}
              onChange={(e) => void handleFileChange(e.target.files?.[0])}
            />

            {previewUrl ? (
              <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={previewUrl} alt="" className="size-full object-cover" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  className="absolute top-2 right-2"
                  aria-label="Remove image"
                  disabled={processingImage || saving}
                  onClick={clearImage}
                >
                  <X />
                </Button>
                {processingImage ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled={processingImage || saving}
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-60"
              >
                {processingImage ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-xs">Processing…</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-5" />
                    <span className="text-sm font-medium text-foreground">Add image</span>
                    <span className="text-xs">
                      {TARGET_WIDTH}×{TARGET_HEIGHT} · auto-cropped &amp; resized
                    </span>
                  </>
                )}
              </button>
            )}
            {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving || processingImage || !title.trim() || !body.trim() || targetApps.length === 0
              }
            >
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
