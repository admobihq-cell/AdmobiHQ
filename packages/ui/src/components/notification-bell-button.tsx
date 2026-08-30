"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bell } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type NotificationBellButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "size" | "variant"
> & {
  /** Number of unread notifications. 0 hides the badge and quiets the bell. */
  unreadCount?: number
}

const WIGGLE = [0, -9, 7, -4, 0]

/**
 * Header trigger for the notifications panel. Replaces the old bare red dot with
 * a terracotta count chip, a soft accent halo while unread, and a one-shot
 * wiggle + badge bump the moment the unread count climbs. Forwards its ref so it
 * can be a Radix `DropdownMenuTrigger asChild`.
 */
export const NotificationBellButton = React.forwardRef<
  HTMLButtonElement,
  NotificationBellButtonProps
>(function NotificationBellButton(
  { unreadCount = 0, className, ...props },
  ref,
) {
  const reduceMotion = useReducedMotion()
  const hasUnread = unreadCount > 0
  const label = hasUnread
    ? `Notifications, ${unreadCount} unread`
    : "Notifications"

  const controls = React.useRef(0)
  const [bump, setBump] = React.useState(0)
  const previous = React.useRef(unreadCount)

  React.useEffect(() => {
    if (unreadCount > previous.current) {
      controls.current += 1
      setBump(controls.current)
    }
    previous.current = unreadCount
  }, [unreadCount])

  const display = unreadCount > 9 ? "9+" : String(unreadCount)

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className={cn("relative", className)}
      {...props}
    >
      <motion.span
        className="relative flex size-5 items-center justify-center"
        animate={
          reduceMotion || bump === 0 ? undefined : { rotate: WIGGLE }
        }
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        key={bump}
      >
        <Bell
          aria-hidden
          className={cn(
            "size-5 transition-colors",
            hasUnread && "text-primary",
          )}
        />
        {hasUnread ? (
          <span
            aria-hidden
            className="absolute inset-0 -z-10 m-auto size-7 rounded-full bg-primary/10"
          />
        ) : null}
      </motion.span>

      <AnimatePresence>
        {hasUnread ? (
          <motion.span
            key="badge"
            aria-hidden
            initial={
              reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.4 }
            }
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: bump === 0 ? 1 : [1, 1.3, 1] }
            }
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center",
              "rounded-full border-2 border-background bg-primary px-1",
              "text-[10px] leading-none font-semibold tabular-nums text-primary-foreground",
            )}
          >
            {display}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </Button>
  )
})
