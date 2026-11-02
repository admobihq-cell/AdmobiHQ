"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { FileVideo } from "lucide-react"

import { ImageLightbox } from "@workspace/ui/components/image-lightbox"
import { cn } from "@workspace/ui/lib/utils"
import { LedPanel } from "@/components/media/media-skeletons"

/**
 * Preview of a private file fetched through an authenticated proxy. Used by a
 * campaign's creative tiles and by the Media Library grid.
 *
 * `lazy` waits for a click before fetching. The library grid sets it for
 * video: a page of 24 creatives could otherwise pull down 24 files of up to
 * 50MB each just to draw the grid.
 */
export function BlobPreview({
  queryKey,
  load,
  isVideo,
  alt,
  lazy = false,
  className,
}: {
  queryKey: readonly unknown[]
  load: () => Promise<Blob>
  isVideo: boolean
  alt: string
  lazy?: boolean
  /** Sizes the preview. Defaults to a 32-tall strip. */
  className?: string
}) {
  const [wanted, setWanted] = useState(!lazy)
  const blobQuery = useQuery({ queryKey, queryFn: load, enabled: wanted })
  const box = cn("h-32 w-full", className)
  const blob = blobQuery.data

  // The Blob is cached; the object URL derived from it is not — it's revoked
  // on unmount, so caching the URL string would let a revoked URL leak into
  // another consumer of the same cache entry. Made here rather than in render
  // so each effect run owns the URL its cleanup revokes: a remount that finds
  // the Blob already cached must not reuse a URL that has been revoked.
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!wanted) {
    return (
      <button
        type="button"
        onClick={() => setWanted(true)}
        aria-label={`Load preview of ${alt}`}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          box,
        )}
      >
        <FileVideo className="size-10" strokeWidth={1.5} aria-hidden />
        <span className="font-medium">Load preview</span>
      </button>
    )
  }

  if (url) {
    return isVideo ? (
      <video src={url} controls className={cn("rounded-md bg-black object-contain", box)} />
    ) : (
      <ImageLightbox src={url} alt={alt} className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL from an authenticated blob, not a remote asset next/image can optimize */}
        <img src={url} alt={alt} className="size-full object-contain" />
      </ImageLightbox>
    )
  }

  if (blobQuery.isError) {
    return (
      <button
        type="button"
        onClick={() => void blobQuery.refetch()}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          box,
        )}
      >
        <span>Couldn&apos;t load preview</span>
        <span className="font-medium text-foreground">Click to retry</span>
      </button>
    )
  }

  return <LedPanel className={box} />
}
