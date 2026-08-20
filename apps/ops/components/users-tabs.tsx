"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

const TABS = [
  { href: "/users", label: "Drivers" },
  { href: "/users/customers", label: "Customers" },
  { href: "/users/admins", label: "Admins" },
]

export function UsersTabs() {
  const pathname = usePathname()

  return (
    <div className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => {
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
