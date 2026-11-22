"use client"

import { useState } from "react"
import type * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { DashboardTabs, type DashboardTab } from "@workspace/ui/components/dashboard/dashboard-tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

export type LedgerColumn<T> = {
  key: string
  header: React.ReactNode
  /** Numbers align right. */
  align?: "left" | "right"
  className?: string
  render: (row: T) => React.ReactNode
}

export type LedgerFooter = {
  /** e.g. "Viewing 10 out of 34". */
  viewing: string
  /** 1-based. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

/** Rows a page when the card pages `rows` itself. */
export const LEDGER_PAGE_SIZE = 25

/**
 * A summary strip, filter tabs and a rich table with pagination. The table scrolls inside
 * the card at phone width, so the page never scrolls sideways. Pass `footer` when the caller
 * pages (a server-paged list); otherwise the card pages `rows` itself, `pageSize` at a time,
 * and `note` is added to its "Viewing 1–25 of 80" line.
 */
export function LedgerCard<T>({
  title,
  description,
  summary,
  filterTabs,
  toolbar,
  columns,
  rows,
  rowKey,
  onRowClick,
  footer,
  note,
  pageSize = LEDGER_PAGE_SIZE,
  empty,
}: {
  title: React.ReactNode
  description: React.ReactNode
  summary?: { label: React.ReactNode; value: React.ReactNode; note?: React.ReactNode }[]
  filterTabs?: { tabs: DashboardTab[]; value: string; onChange: (value: string) => void }
  toolbar?: React.ReactNode
  columns: LedgerColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  footer?: LedgerFooter
  /** Extra context for the self-paged footer, e.g. "latest 500 of 812 in the period". */
  note?: string
  pageSize?: number
  empty: React.ReactNode
}) {
  const [localPage, setLocalPage] = useState(1)
  // A new filter or search starts back on page 1.
  const [seenCount, setSeenCount] = useState(rows.length)
  if (seenCount !== rows.length) {
    setSeenCount(rows.length)
    setLocalPage(1)
  }
  const localPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(localPage, localPages)
  const start = (current - 1) * pageSize
  const visible = footer ? rows : rows.slice(start, start + pageSize)
  const pager: LedgerFooter = footer ?? {
    viewing: [`Viewing ${start + 1}–${start + visible.length} of ${rows.length}`, note].filter(Boolean).join(" · "),
    page: current,
    pageCount: localPages,
    onPageChange: setLocalPage,
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary && summary.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {summary.map((tile, index) => (
              <MetricTile key={index} {...tile} />
            ))}
          </div>
        ) : null}
        {filterTabs || toolbar ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {filterTabs ? <DashboardTabs {...filterTabs} /> : <span />}
            {toolbar}
          </div>
        ) : null}
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "px-3 text-xs text-muted-foreground",
                        col.align === "right" && "text-right",
                        col.className
                      )}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "px-3 py-2.5",
                          col.align === "right" && "text-right tabular-nums",
                          col.className
                        )}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {rows.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{pager.viewing}</span>
            {pager.pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pager.page <= 1}
                  onClick={() => pager.onPageChange(pager.page - 1)}
                >
                  Previous
                </Button>
                <span className="tabular-nums">
                  Page {pager.page} of {pager.pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pager.page >= pager.pageCount}
                  onClick={() => pager.onPageChange(pager.page + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
