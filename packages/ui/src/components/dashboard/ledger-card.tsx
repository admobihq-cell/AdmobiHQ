"use client"

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

/**
 * A summary strip, filter tabs and a rich table with pagination. The table scrolls inside
 * the card at phone width, so the page never scrolls sideways.
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
  empty: React.ReactNode
}) {
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
                {rows.map((row) => (
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
        {footer && rows.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{footer.viewing}</span>
            {footer.pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={footer.page <= 1}
                  onClick={() => footer.onPageChange(footer.page - 1)}
                >
                  Previous
                </Button>
                <span className="tabular-nums">
                  Page {footer.page} of {footer.pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={footer.page >= footer.pageCount}
                  onClick={() => footer.onPageChange(footer.page + 1)}
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
