import { cn } from "@workspace/ui/lib/utils"

/**
 * Cropped from assets/brand/logo.png — the same mark used for the mobile apps'
 * app bar, loader, and splash screen. Each consuming app needs its own
 * public/brand/logo-mark.png.
 *
 * A plain <img>, not next/image: this package typechecks under strict Node
 * module resolution (see packages/typescript-config/base.json), which can't
 * resolve next/image's bundler-oriented export map. The mark is tiny and
 * always rendered near-native size, so there's little to gain from Next's
 * image pipeline here anyway.
 */
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
  const width = Math.round((LOGO_MARK_WIDTH / LOGO_MARK_HEIGHT) * markHeight)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <span className="sr-only">Admobi</span>
      <img
        src={LOGO_MARK_SRC}
        alt=""
        width={width}
        height={markHeight}
        aria-hidden
        className="w-auto shrink-0"
        style={{ height: markHeight }}
      />
      <span className={wordmarkClassName}>Admobi</span>
    </span>
  )
}
