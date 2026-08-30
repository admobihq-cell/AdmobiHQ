"use client"

import * as React from "react"
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  RotateCcw,
} from "lucide-react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatAbsoluteTime,
  formatRelativeTime,
  groupNotificationsByDate,
  unreadCount,
  useNow,
  type NotificationFeedItem,
  type NotificationTone,
} from "@workspace/ui/lib/notifications"

type ToneStyle = {
  icon: React.ComponentType<{ className?: string }>
  wrap: string
  glyph: string
}

const TONE_STYLES: Record<NotificationTone, ToneStyle> = {
  neutral: {
    icon: Bell,
    wrap: "bg-muted text-muted-foreground",
    glyph: "text-muted-foreground",
  },
  info: {
    icon: Info,
    wrap: "bg-[color-mix(in_oklch,var(--chart-3),transparent_86%)]",
    glyph: "text-[var(--chart-3)]",
  },
  success: {
    icon: Check,
    wrap: "bg-[color-mix(in_oklch,var(--primary),transparent_88%)]",
    glyph: "text-primary",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "bg-[color-mix(in_oklch,var(--chart-4),transparent_84%)]",
    glyph: "text-[var(--chart-4)]",
  },
  danger: {
    icon: AlertOctagon,
    wrap: "bg-destructive/10",
    glyph: "text-destructive",
  },
}

type FilterId = string

export type NotificationFeedProps = {
  items: NotificationFeedItem[]
  isLoading?: boolean
  isFetchingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  /** Called when a row is activated. The feed marks it read first, then calls this. */
  onOpen?: (item: NotificationFeedItem) => void
  onMarkRead?: (item: NotificationFeedItem) => void
  onMarkUnread?: (item: NotificationFeedItem) => void
  onMarkAllRead?: () => void
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

const ALL: FilterId = "__all__"
const UNREAD: FilterId = "__unread__"

export function NotificationFeed({
  items: rawItems,
  isLoading = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  onOpen,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
  emptyTitle = "You're all caught up",
  emptyDescription = "New notifications will show up here.",
  className,
}: NotificationFeedProps) {
  const now = useNow()
  const reduceMotion = useReducedMotion()
  const [filter, setFilter] = React.useState<FilterId>(ALL)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Defensive: a mid-rollout API can hand back a stale shape; never let a
  // nullish row reach the render.
  const items = React.useMemo(
    () => rawItems.filter((item): item is NotificationFeedItem => Boolean(item?.id)),
    [rawItems],
  )
  const totalUnread = unreadCount(items)

  const categories = React.useMemo(() => {
    const seen = new Map<string, number>()
    for (const item of items) {
      seen.set(item.category, (seen.get(item.category) ?? 0) + 1)
    }
    return [...seen.keys()].sort((a, b) => a.localeCompare(b))
  }, [items])

  // A filter whose category has since paged out just reads as "All" — derived,
  // not stored, so there's no effect round-trip.
  const activeFilter =
    filter !== ALL && filter !== UNREAD && !categories.includes(filter)
      ? ALL
      : filter

  const visible = React.useMemo(() => {
    if (activeFilter === ALL) return items
    if (activeFilter === UNREAD) return items.filter((item) => !item.readAt)
    return items.filter((item) => item.category === activeFilter)
  }, [items, activeFilter])

  const groups = React.useMemo(
    () => groupNotificationsByDate(visible, now),
    [visible, now],
  )

  const sentinelRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || !onLoadMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { rootMargin: "240px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, visible.length])

  function moveFocus(direction: 1 | -1) {
    const rows = listRef.current?.querySelectorAll<HTMLElement>(
      "[data-notification-row]",
    )
    if (!rows || rows.length === 0) return
    const list = [...rows]
    const index = list.indexOf(document.activeElement as HTMLElement)
    const next = index === -1 ? 0 : index + direction
    list[Math.max(0, Math.min(list.length - 1, next))]?.focus()
  }

  function handleListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault()
      moveFocus(1)
    } else if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault()
      moveFocus(-1)
    }
  }

  function activate(item: NotificationFeedItem) {
    if (!item.readAt) onMarkRead?.(item)
    onOpen?.(item)
  }

  function toggleRead(item: NotificationFeedItem) {
    if (item.readAt) onMarkUnread?.(item)
    else onMarkRead?.(item)
  }

  const rowVariants: Variants = {
    hidden: reduceMotion
      ? { opacity: 1 }
      : { opacity: 0, y: -8, filter: "blur(2px)" },
    shown: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  }

  const showEmpty = !isLoading && visible.length === 0
  const filteredEmpty = showEmpty && items.length > 0

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {totalUnread > 0
            ? `${totalUnread} unread`
            : items.length > 0
              ? "All caught up"
              : " "}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          disabled={totalUnread === 0}
          onClick={() => onMarkAllRead?.()}
        >
          <CheckCheck data-icon="inline-start" />
          Mark all as read
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        <FilterChip
          active={activeFilter === ALL}
          onClick={() => setFilter(ALL)}
          label="All"
        />
        <FilterChip
          active={activeFilter === UNREAD}
          onClick={() => setFilter(UNREAD)}
          label="Unread"
          count={totalUnread}
        />
        {categories.length > 1 ? (
          <>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            {categories.map((category) => (
              <FilterChip
                key={category}
                active={activeFilter === category}
                onClick={() => setFilter(category)}
                label={category}
              />
            ))}
          </>
        ) : null}
      </div>

      {isLoading ? (
        <FeedSkeleton />
      ) : showEmpty ? (
        <EmptyState
          filtered={filteredEmpty}
          title={emptyTitle}
          description={emptyDescription}
          onClear={() => setFilter(ALL)}
        />
      ) : (
        <div
          ref={listRef}
          role="list"
          onKeyDown={handleListKeyDown}
          className="divide-y"
        >
          {groups.map((group) => (
            <section key={group.key} role="presentation">
              <h2 className="sticky top-0 z-10 -mx-2 bg-background/85 px-2 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                {group.label}
              </h2>
              <div className="divide-y">
                <AnimatePresence initial={false}>
                  {group.items.map((item) => {
                    const tone = TONE_STYLES[item.tone] ?? TONE_STYLES.neutral
                    const ToneIcon = tone.icon
                    const isUnread = !item.readAt
                    return (
                      <motion.div
                        key={item.id}
                        layout={!reduceMotion}
                        variants={rowVariants}
                        initial="hidden"
                        animate="shown"
                        data-notification-row
                        role="listitem"
                        tabIndex={0}
                        aria-label={`${item.title}. ${
                          isUnread ? "Unread." : "Read."
                        }`}
                        onClick={() => activate(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            activate(item)
                          } else if (event.key === "e") {
                            event.preventDefault()
                            toggleRead(item)
                          }
                        }}
                        className={cn(
                          "group relative flex cursor-pointer gap-3 py-3 pr-2 pl-4 outline-none transition-colors",
                          "focus-visible:bg-muted/60 hover:bg-muted/40",
                          isUnread && "bg-primary/[0.035]",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full transition-colors",
                            isUnread ? "bg-primary" : "bg-transparent",
                          )}
                        />

                        {item.imageUrl ? (
                          // Plain img: remote CDN thumbnail, no Next Image in this shared package.
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="mt-0.5 size-9 shrink-0 rounded-md border object-cover"
                          />
                        ) : (
                          <span
                            className={cn(
                              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md",
                              tone.wrap,
                            )}
                          >
                            <ToneIcon className={cn("size-4", tone.glyph)} />
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p
                              className={cn(
                                "truncate text-sm",
                                isUnread
                                  ? "font-medium text-foreground"
                                  : "text-foreground/90",
                              )}
                            >
                              {item.title}
                            </p>
                            <time
                              dateTime={item.createdAt}
                              title={formatAbsoluteTime(item.createdAt)}
                              className="shrink-0 text-xs text-muted-foreground tabular-nums transition-opacity group-focus-within:opacity-0 group-hover:opacity-0"
                            >
                              {formatRelativeTime(item.createdAt, now)}
                            </time>
                          </div>
                          {item.body ? (
                            <p className="mt-0.5 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                              {item.body}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground/80">
                            {item.category}
                          </p>
                        </div>

                        <div className="absolute top-2 right-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={
                              isUnread ? "Mark as read" : "Mark as unread"
                            }
                            title={isUnread ? "Mark as read" : "Mark as unread"}
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleRead(item)
                            }}
                          >
                            {isUnread ? <Check /> : <RotateCcw />}
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}

          {hasMore ? (
            <div
              ref={sentinelRef}
              className="flex justify-center py-4"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={isFetchingMore}
                loadingText="Loading"
                onClick={() => onLoadMore?.()}
              >
                Load older
              </Button>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground/70">
              Nothing older to load.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-medium transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {typeof count === "number" && count > 0 ? (
        <span
          className={cn(
            "min-w-4 rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums",
            active
              ? "bg-background/20 text-background"
              : "bg-primary/12 text-primary",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  )
}

function FeedSkeleton() {
  return (
    <div className="divide-y">
      <Skeleton className="my-2 h-3 w-16" />
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-3 py-3 pr-2 pl-4">
          <Skeleton className="mt-0.5 size-9 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  filtered,
  title,
  description,
  onClear,
}: {
  filtered: boolean
  title: string
  description: string
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        {filtered ? (
          <Bell className="size-5 text-muted-foreground" aria-hidden />
        ) : (
          <BellOff className="size-5 text-muted-foreground" aria-hidden />
        )}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {filtered ? "Nothing matches this filter" : title}
        </p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          {filtered
            ? "Try a different filter to see more of your history."
            : description}
        </p>
      </div>
      {filtered ? (
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Show all
        </Button>
      ) : null}
    </div>
  )
}
