"use client"

import * as React from "react"
import { ZoomIn, XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@workspace/ui/components/dialog"

/** Wraps a thumbnail (`children`) so clicking it opens `src` full-size in a
 * modal. Trigger gets a hover affordance (dim + zoom icon) so the click
 * target reads as expandable before the user commits. */
export function ImageLightbox({
  src,
  alt,
  className,
  children,
}: {
  src: string
  alt: string
  className?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block w-full cursor-zoom-in overflow-hidden rounded-lg text-left",
          className,
        )}
      >
        {children}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/30 group-hover:opacity-100">
          <ZoomIn className="size-5 text-white" aria-hidden />
        </span>
      </button>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-0 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-[85vh] w-full rounded-xl object-contain" />
        <DialogClose className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-foreground/10 hover:bg-background">
          <XIcon className="size-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
