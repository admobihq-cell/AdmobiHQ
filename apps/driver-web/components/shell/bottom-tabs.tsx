"use client"

import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import type { DriverNavItem } from "@/lib/navigation"

/** Below md the sidebar is an off-canvas sheet behind a top-left button,
 * out of thumb reach. Drivers live on phones, so the four places they go
 * most sit at the bottom, like the native app's tabs. */
const TAB_HREFS = ["/", "/earnings", "/routes", "/settings/support"]
const SHORT_LABEL: Record<string, string> = { "/": "Home" }

export function BottomTabs({ items, currentHref }: { items: DriverNavItem[]; currentHref: string }) {
  const tabs = TAB_HREFS.map((href) => items.find((item) => item.href === href)).filter(
    (item): item is DriverNavItem => Boolean(item),
  )

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="grid h-16" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((item) => {
          const active = item.href === currentHref
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-[color,transform] duration-150 ease-out active:scale-[0.96]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {SHORT_LABEL[item.href] ?? item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
