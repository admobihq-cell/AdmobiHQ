"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ImagePlus, Loader2, Monitor, Smartphone } from "lucide-react"

import { ANNOUNCEMENT_FORM_FIELDS, ANNOUNCEMENT_TARGET_APP_OPTIONS } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { AnnouncementPreview } from "./announcement-preview"

// Matches ops-mobile / rich-notification 2:1 banner frame.
const TARGET_WIDTH = 1200
const TARGET_HEIGHT = 600
const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT

// Push payload limits — kept in step with the API's broadcast schema.
const TITLE_MAX = 65
const BODY_MAX = 178

const CATEGORY_FIELD = ANNOUNCEMENT_FORM_FIELDS.find((field) => field.name === "category")!

const TOKENS = [
  { token: "{{first_name}}", label: "First name" },
  { token: "{{org_name}}", label: "Organisation" },
]

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

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span
      className={cn(
        "text-xs tabular-nums text-muted-foreground",
        max - value.length <= 10 && "font-medium text-primary",
      )}
    >
      {value.length}/{max}
    </span>
  )
}

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  saving = false,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  // Tokens go into whichever text field the author was last in.
  const lastFieldRef = useRef<"title" | "body">("body")

  const [category, setCategory] = useState("announcement")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetApps, setTargetApps] = useState<string[]>(["customer-mobile"])
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

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
    setDragging(false)
    lastFieldRef.current = "body"
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

  function insertToken(token: string) {
    const field = lastFieldRef.current
    const el = field === "title" ? titleRef.current : bodyRef.current
    const value = field === "title" ? title : body
    const max = field === "title" ? TITLE_MAX : BODY_MAX
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const next = value.slice(0, start) + token + value.slice(end)
    if (next.length > max) return
    if (field === "title") setTitle(next)
    else setBody(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const imageBusy = processingImage || saving
  const canSubmit =
    !saving && !processingImage && title.trim() !== "" && body.trim() !== "" && targetApps.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>
            Mobile apps get a push notification; web apps get it in their notification feed.
            You&apos;ll confirm before anything is sent.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            onSubmit({
              title: title.trim(),
              body: body.trim(),
              category,
              targetApps,
              imageBlob,
            })
          }}
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-8">
            <div className="flex flex-col gap-5">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Send to</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ANNOUNCEMENT_TARGET_APP_OPTIONS.map((option) => {
                    const checked = targetApps.includes(option.value)
                    const Icon = option.value.endsWith("mobile") ? Smartphone : Monitor
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50",
                          checked && "border-primary/60 bg-primary/5 hover:bg-primary/10",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            setTargetApps((current) =>
                              next === true
                                ? [...current, option.value]
                                : current.filter((value) => value !== option.value),
                            )
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{option.label}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Icon className="size-3" aria-hidden />
                            {option.value.endsWith("mobile") ? "Push" : "In-app feed"}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                {targetApps.length === 0 ? (
                  <p className="text-xs text-destructive">Pick at least one app.</p>
                ) : null}
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="announcement-category">{CATEGORY_FIELD.label}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="announcement-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_FIELD.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="announcement-title">Title</Label>
                  <CharCount value={title} max={TITLE_MAX} />
                </div>
                <Input
                  ref={titleRef}
                  id="announcement-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => (lastFieldRef.current = "title")}
                  placeholder="e.g. New payout schedule"
                  required
                  maxLength={TITLE_MAX}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="announcement-body">Message</Label>
                  <CharCount value={body} max={BODY_MAX} />
                </div>
                <Textarea
                  ref={bodyRef}
                  id="announcement-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={() => (lastFieldRef.current = "body")}
                  placeholder="What should people know?"
                  required
                  maxLength={BODY_MAX}
                  rows={4}
                  aria-describedby="announcement-tokens"
                />
                <div id="announcement-tokens" className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Personalise:</span>
                  {TOKENS.map(({ token, label }) => (
                    <Button
                      key={token}
                      type="button"
                      variant="outline"
                      size="xs"
                      className="font-normal"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertToken(token)}
                    >
                      + {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={fileInputId}>
                  Image <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={imageBusy}
                  onChange={(e) => void handleFileChange(e.target.files?.[0])}
                />

                {previewUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                    <img
                      src={previewUrl}
                      alt=""
                      className="aspect-[2/1] w-20 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Image attached</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {TARGET_WIDTH}×{TARGET_HEIGHT} JPEG
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={imageBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {processingImage ? <Loader2 className="animate-spin" /> : "Replace"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      disabled={imageBusy}
                      onClick={clearImage}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={imageBusy}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      void handleFileChange(e.dataTransfer.files?.[0])
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60",
                      dragging && "border-primary bg-primary/5",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {processingImage ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ImagePlus className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {processingImage ? "Processing…" : "Drop an image or browse"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Cropped to {TARGET_WIDTH}×{TARGET_HEIGHT} to fit the banner
                      </span>
                    </span>
                  </button>
                )}
                {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}
              </div>
            </div>

            <div className="md:sticky md:top-0 md:self-start">
              <AnnouncementPreview
                title={title}
                body={body}
                imageUrl={previewUrl}
                targetApps={targetApps}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Review &amp; send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
