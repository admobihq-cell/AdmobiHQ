import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

/** Cropped from assets/brand/logo.png — the same mark used for the mobile apps' app bar, loader, and splash screen. */
const LOGO_MARK_SRC = "/brand/logo-mark.png"
const LOGO_MARK_WIDTH = 85
const LOGO_MARK_HEIGHT = 47

export function Logo({ className }: { className?: string }) {
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
        className="h-[26px] w-auto shrink-0"
      />
      <span className="text-lg leading-none sm:text-xl">Admobi</span>
    </span>
  )
}
