"use client"

import * as React from "react"
import { ArrowRight, BellOff } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { TONE_STYLES } from "@workspace/ui/components/notification-feed"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatAbsoluteTime,
  formatRelativeTime,
  type NotificationAction,
  type NotificationFeedItem,
} from "@workspace/ui/lib/notifications"

type NotificationPeekProps = {
  items: NotificationFeedItem[]
  unread: number
  isLoading?: boolean
  /** Route the "View all" footer links to. */
  allHref: string
  /** Framework link component (e.g. next/link). Defaults to a plain anchor. */
  linkComponent?: React.ElementType
  onMarkAllRead: () => void
  /** Fired when a card is clicked — mark it read, and navigate if it has an href. */
  onItemClick: (item: NotificationFeedItem) => void
  /** Fired when one of a card's inline actions is used, before it navigates. */
  onMarkRead?: (item: NotificationFeedItem) => void
  onNavigate?: () => void
}

type Tab = "all" | "unread" | "urgent"

const isUrgent = (item: NotificationFeedItem) => item.tone === "danger" || item.tone === "warning"

/**
 * The header-bell dropdown: a compact card per notification. Every card carries its kind
 * (icon or avatar), the time and an unread dot; ones that need someone carry their next step as
 * inline buttons, so a responder can act from the bell without opening the page.
 */
export function NotificationPeek({
  items,
  unread,
  isLoading = false,
  allHref,
  linkComponent,
  onMarkAllRead,
  onItemClick,
  onMarkRead,
  onNavigate,
}: NotificationPeekProps) {
  const LinkComponent = linkComponent ?? "a"
  const [tab, setTab] = React.useState<Tab>("all")

  const counts = {
    all: items.length,
    unread: items.filter((i) => !i.readAt).length,
    urgent: items.filter(isUrgent).length,
  }
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    ...(counts.urgent > 0 ? [{ id: "urgent" as const, label: "Urgent" }] : []),
  ]
  const active = tab === "urgent" && counts.urgent === 0 ? "all" : tab
  const visible =
    active === "unread" ? items.filter((i) => !i.readAt) : active === "urgent" ? items.filter(isUrgent) : items

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          <p className="text-base font-semibold tracking-tight">Notifications</p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary disabled:bg-muted disabled:text-muted-foreground"
          disabled={unread === 0}
          onClick={onMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      <div className="shrink-0 px-4 pb-3">
        <div role="tablist" aria-label="Filter notifications" className="flex rounded-lg bg-muted p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-[color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                active === t.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "min-w-4 rounded px-1 text-[10px] leading-4 font-semibold tabular-nums",
                  t.id === "urgent" ? "bg-destructive/10 text-destructive" : "bg-foreground/[0.07]",
                )}
              >
                {counts[t.id] > 99 ? "99+" : counts[t.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex shrink-0 flex-col items-center gap-2 border-t bg-muted/30 px-4 py-10 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-muted">
            <BellOff className="size-4 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : active === "all" ? "You're all caught up" : "Nothing here right now"}
          </p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain border-t bg-muted/30 p-2">
          {visible.map((item) => (
            <PeekCard
              key={item.id}
              item={item}
              LinkComponent={LinkComponent}
              onOpen={() => onItemClick(item)}
              onAction={() => {
                onMarkRead?.(item)
                onNavigate?.()
              }}
            />
          ))}
        </ul>
      )}

      <LinkComponent
        href={allHref}
        onClick={onNavigate}
        className="flex shrink-0 items-center justify-center gap-1.5 border-t px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        View all notifications
        <ArrowRight className="size-3.5" aria-hidden />
      </LinkComponent>
    </div>
  )
}

function PeekCard({
  item,
  LinkComponent,
  onOpen,
  onAction,
}: {
  item: NotificationFeedItem
  LinkComponent: React.ElementType
  onOpen: () => void
  onAction: () => void
}) {
  const tone = TONE_STYLES[item.tone] ?? TONE_STYLES.neutral
  const Icon = item.icon ?? tone.icon
  const isUnread = !item.readAt
  const actions = (item.actions ?? []).slice(0, 2)

  return (
    <li
      className={cn(
        "relative flex gap-3 rounded-xl bg-card p-3 shadow-xs ring-1 ring-border/60 transition-shadow hover:ring-border has-[[data-card-open]:focus-visible]:ring-2 has-[[data-card-open]:focus-visible]:ring-ring/60",
      )}
    >
      {item.imageUrl ? (
        // Plain img: remote CDN thumbnail, no Next Image in this shared package.
        <img src={item.imageUrl} alt="" className="size-9 shrink-0 rounded-full border object-cover" />
      ) : (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tone.wrap)} aria-hidden>
          <Icon className={cn("size-4", tone.glyph)} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {/* Stretched over the whole card, so anywhere outside the actions opens it. */}
          <button
            type="button"
            data-card-open
            onClick={onOpen}
            className={cn(
              "min-w-0 text-left text-sm leading-snug outline-none after:absolute after:inset-0 after:rounded-xl",
              isUnread ? "font-medium text-foreground" : "text-foreground/80",
            )}
          >
            <span className="line-clamp-1">{item.title}</span>
          </button>
          <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
            <time
              dateTime={item.createdAt}
              title={formatAbsoluteTime(item.createdAt)}
              className="text-[11px] text-muted-foreground tabular-nums"
            >
              {formatRelativeTime(item.createdAt)}
            </time>
            <span
              className={cn("size-1.5 rounded-full", isUnread ? "bg-primary" : "bg-transparent")}
              aria-label={isUnread ? "Unread" : undefined}
            />
          </span>
        </div>
        {item.body ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
        ) : null}
        {actions.length > 0 ? (
          <div className="relative z-10 mt-2 flex flex-wrap gap-1.5">
            {actions.map((action) => (
              <ActionButton key={action.label} action={action} LinkComponent={LinkComponent} onClick={onAction} />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  )
}

function ActionButton({
  action,
  LinkComponent,
  onClick,
}: {
  action: NotificationAction
  LinkComponent: React.ElementType
  onClick: () => void
}) {
  // Router links for app routes; tel:/mailto: stay plain anchors.
  const Comp = action.href.startsWith("/") ? LinkComponent : "a"
  return (
    <Button asChild size="xs" variant={action.primary ? "default" : "outline"}>
      <Comp href={action.href} onClick={onClick}>
        {action.label}
      </Comp>
    </Button>
  )
}
