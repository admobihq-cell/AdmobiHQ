import type { Media } from "@/payload-types"
import { SITE_URL } from "@/lib/seo/site"

function serverOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL?.trim()
  if (fromEnv) {
    try {
      const origin = new URL(fromEnv.replace(/\/$/, "")).origin
      if (
        process.env.NODE_ENV === "production" &&
        new URL(SITE_URL).hostname !== new URL(origin).hostname
      ) {
        return SITE_URL
      }
      return origin
    } catch {
      return SITE_URL
    }
  }
  return SITE_URL
}

function resolveMediaPath(
  media: Media,
  size?: "thumbnail" | "card" | "hero",
): string | null {
  const sized =
    size && media.sizes?.[size]?.url ? media.sizes[size]?.url : media.url

  if (!sized) {
    return null
  }

  if (sized.startsWith("http://") || sized.startsWith("https://")) {
    try {
      const mediaUrl = new URL(sized)
      const origin = new URL(serverOrigin())
      if (mediaUrl.origin === origin.origin) {
        return `${mediaUrl.pathname}${mediaUrl.search}`
      }
    } catch {
      // keep absolute URL for external hosts
    }
    return sized
  }

  return sized.startsWith("/") ? sized : `/${sized}`
}

/** Absolute URL for a Payload media document (OG tags, JSON-LD). */
export function getMediaUrl(
  media: Media | number | null | undefined,
  size?: "thumbnail" | "card" | "hero",
): string | null {
  if (!isMediaPopulated(media)) {
    return null
  }

  const path = resolveMediaPath(media, size)
  if (!path) {
    return null
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  return `${serverOrigin()}${path}`
}

/** Path or URL suitable for `next/image` `src` (same-origin media as relative paths). */
export function getMediaImageSrc(
  media: Media | number | null | undefined,
  size?: "thumbnail" | "card" | "hero",
): string | null {
  if (!isMediaPopulated(media)) {
    return null
  }

  return resolveMediaPath(media, size)
}

export function isMediaPopulated(
  media: Media | number | null | undefined,
): media is Media {
  return typeof media === "object" && media !== null && "url" in media
}

export function getMediaAlt(media: Media | number | null | undefined): string {
  if (!isMediaPopulated(media)) {
    return ""
  }
  return media.alt?.trim() || media.filename || "Image"
}
