"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

import { useOrgPermissions } from "@/lib/use-org"

const TABS = [
  { href: "/settings/team", label: "Members" },
  { href: "/settings/team/roles", label: "Roles", permission: "team:manage" as const },
]

export function TeamSettingsTabs() {
  const pathname = usePathname()
  const { can } = useOrgPermissions()
  const tabs = TABS.filter((tab) => !tab.permission || can(tab.permission))

  // A lone "Members" pill is noise — only render the switcher when there's a
  // choice to make.
  if (tabs.length < 2) return null

  return (
    <div className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
