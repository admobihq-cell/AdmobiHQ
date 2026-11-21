"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bell, CircleCheck, TriangleAlert, X, type LucideIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { formatRelativeTime } from "@workspace/ui/lib/notifications"
import { playSound, type SoundName } from "@workspace/ui/lib/sounds"
import { cn } from "@workspace/ui/lib/utils"

type Tone = "info" | "success" | "warning"

export type LiveToastInput = {
  title: string
  body?: string
  tone?: Tone
  icon?: LucideIcon
  /** ISO time of the event; defaults to now. */
  at?: string
  action?: { label: string; href: string }
  sound?: SoundName
  /** Identifies the alert so only one open tab plays its sound. */
  key?: string
  /** Warnings that need a human (SOS) stay until dismissed. */
  sticky?: boolean
}

const TONE_STYLE: Record<Tone, { tile: string; icon: LucideIcon; bar: string }> = {
  info: { tile: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300", icon: Bell, bar: "bg-sky-500" },
  success: {
    tile: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
    icon: CircleCheck,
    bar: "bg-lime-500",
  },
  warning: {
    tile: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    icon: TriangleAlert,
    bar: "bg-amber-500",
  },
}

const DURATION_MS: Record<Tone, number> = { info: 6000, success: 6000, warning: 12000 }

function LiveToastCard({ id, input }: { id: string | number; input: LiveToastInput }) {
  const router = useRouter()
  const tone = input.tone ?? "info"
  const style = TONE_STYLE[tone]
  const Icon = input.icon ?? style.icon
  const duration = input.sticky ? null : DURATION_MS[tone]

  return (
    <div className="group relative flex w-[min(360px,calc(100vw-2rem))] gap-3 overflow-hidden rounded-xl border border-border/70 bg-popover p-3 pr-9 text-popover-foreground shadow-lg">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", style.tile)}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{input.title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {formatRelativeTime(input.at ?? new Date().toISOString())}
          </span>
        </div>
        {input.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{input.body}</p> : null}
        {input.action ? (
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => {
                toast.dismiss(id)
                router.push(input.action!.href)
              }}
            >
              {input.action.label}
            </Button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => toast.dismiss(id)}
        className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" aria-hidden />
      </button>
      {duration ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 origin-left group-hover:[animation-play-state:paused] motion-reduce:hidden",
            style.bar
          )}
          style={{ animation: `live-toast-countdown ${duration}ms linear forwards` }}
        />
      ) : null}
    </div>
  )
}

/** BoardUI-style notification toast on sonner (which keeps stacking, swipe and focus handling). */
export function liveToast(input: LiveToastInput): void {
  const tone = input.tone ?? "info"
  toast.custom((id) => <LiveToastCard id={id} input={input} />, {
    duration: input.sticky ? Infinity : DURATION_MS[tone],
    unstyled: true,
  })
  if (input.sound) playSound(input.sound, input.key)
}
