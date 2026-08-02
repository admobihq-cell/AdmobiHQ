import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

/** Cropped from assets/brand/logo.png — the same mark used for the mobile apps' app bar, loader, and splash screen. Each consuming app needs its own public/brand/logo-mark.png. */
const LOGO_MARK_SRC = "/brand/logo-mark.png"
const LOGO_MARK_WIDTH = 85
const LOGO_MARK_HEIGHT = 47

type LogoProps = {
  className?: string
  /** Height of the mark image in px. Defaults to the marketing nav's size. */
  markHeight?: number
  /** Tailwind classes for the "Admobi" wordmark text. Defaults to the marketing nav's size. */
  wordmarkClassName?: string
}

export function Logo({
  className,
  markHeight = 26,
  wordmarkClassName = "text-lg leading-none sm:text-xl",
}: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <span className="sr-only">Admobi</span>
      <Image
        src={LOGO_MARK_SRC}
        alt=""
        width={LOGO_MARK_WIDTH}
        height={LOGO_MARK_HEIGHT}
        priority
        aria-hidden
        className="w-auto shrink-0"
        style={{ height: markHeight }}
      />
      <span className={wordmarkClassName}>Admobi</span>
    </span>
  )
}
