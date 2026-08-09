"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

import { settingsNavItems } from "@/lib/settings-navigation"

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
      {settingsNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/60",
              active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
