import type * as React from "react"
import { ChevronRight } from "lucide-react"

import { StatusPill, type StatusTone } from "@workspace/ui/components/dashboard/status-pill"

export type ActionItem = {
  title: React.ReactNode
  meta?: React.ReactNode
  /** Verb label for the row's link, e.g. "Add creative". */
  action: string
  tag?: { label: string; tone: StatusTone }
  href: string
}

/**
 * A short list of things that need a decision. Pass the app's router link as `LinkComponent`
 * so rows navigate client-side; it defaults to a plain anchor.
 */
export function ActionQueue({
  items,
  empty,
  LinkComponent = "a",
}: {
  items: ActionItem[]
  empty: React.ReactNode
  LinkComponent?: React.ElementType
}) {
  if (items.length === 0) {
    return <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((item, index) => (
        <li key={index}>
          <LinkComponent
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              {item.meta ? <p className="truncate text-xs text-muted-foreground">{item.meta}</p> : null}
            </div>
            {item.tag ? <StatusPill tone={item.tag.tone}>{item.tag.label}</StatusPill> : null}
            <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
              <span className="hidden sm:inline">{item.action}</span>
              <ChevronRight className="size-4" aria-hidden />
              <span className="sr-only sm:hidden">{item.action}</span>
            </span>
          </LinkComponent>
        </li>
      ))}
    </ul>
  )
}
