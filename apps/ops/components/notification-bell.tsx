"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import type { DriverApplicationListItemDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const POLL_INTERVAL_MS = 60_000
const PREVIEW_LIMIT = 8

/** Ops's "inbox" is the driver-applications review queue itself, so this
 * shows the live pending list rather than a separate read/unread log — the
 * badge is a real backlog count, not an unread count. Only rendered for
 * users with the driver_applications permission (see ops-shell.tsx). */
export function NotificationBell() {
  const client = useOpsClient()
  const [items, setItems] = useState<DriverApplicationListItemDto[]>([])
  const [total, setTotal] = useState(0)

  const load = useCallback(() => {
    client.driverApplications
      .list({ status: "submitted", pageSize: PREVIEW_LIMIT })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch(() => {})
  }, [client])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Pending driver applications">
          <Bell aria-hidden />
          {total > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
              {total > 9 ? "9+" : total}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80">
        <DropdownMenuLabel>Pending applications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing waiting on review
          </p>
        ) : (
          <div className="-mx-1 max-h-80 space-y-0.5 overflow-y-auto px-1">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/driver-applications/${item.id}`}
                className="block rounded-md px-1 py-2 text-sm hover:bg-accent"
              >
                <p className="font-medium">{item.full_name ?? "Driver application"}</p>
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDateTime(item.submitted_at)}
                </p>
              </Link>
            ))}
            {total > items.length ? (
              <Link
                href="/driver-applications"
                className="block rounded-md px-1 py-2 text-center text-xs font-medium text-primary hover:underline"
              >
                View all {total} pending
              </Link>
            ) : null}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
