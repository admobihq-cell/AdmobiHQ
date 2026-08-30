"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatRelativeTime,
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
  /** Fired when a row is clicked — mark it read, and navigate if it has an href. */
  onItemClick: (item: NotificationFeedItem) => void
  onNavigate?: () => void
}

/** The header-bell dropdown body: a short peek at recent notifications that
 * shares the page feed's visual grammar (gutter dot, weight for unread) at a
 * tighter density, plus mark-all-read and a link to the full page. */
export function NotificationPeek({
  items,
  unread,
  isLoading = false,
  allHref,
  linkComponent,
  onMarkAllRead,
  onItemClick,
  onNavigate,
}: NotificationPeekProps) {
  const LinkComponent = linkComponent ?? "a"
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-sm font-medium">Notifications</p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-foreground"
          disabled={unread === 0}
          onClick={onMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          {isLoading ? "Loading…" : "You're all caught up"}
        </p>
      ) : (
        <ul className="max-h-96 overflow-y-auto border-t">
          {items.map((item) => {
            const isUnread = !item.readAt
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className={cn(
                    "flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                    isUnread && "bg-primary/[0.035]",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      isUnread ? "bg-primary" : "bg-transparent",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          isUnread
                            ? "font-medium"
                            : "text-foreground/90",
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
                      {item.body}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <LinkComponent
        href={allHref}
        onClick={onNavigate}
        className="flex items-center justify-between border-t px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted/50"
      >
        View all notifications
        <ArrowRight className="size-3.5" />
      </LinkComponent>
    </div>
  )
}
