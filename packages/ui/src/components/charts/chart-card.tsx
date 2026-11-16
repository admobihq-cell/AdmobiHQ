"use client"

import * as React from "react"
import { ChartColumn, Table2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

export type ChartTableData = {
  columns: string[]
  rows: (string | number | null)[][]
}

/**
 * Wraps every chart. Owns the title and description, the empty state, and the chart / table
 * toggle that gives screen-reader and keyboard users the same numbers as a table.
 * Empty is not broken: pass `isEmpty` and the message from the spec instead of a blank plot.
 */
export function ChartCard({
  title,
  description,
  action,
  isEmpty,
  emptyMessage,
  table,
  className,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  isEmpty: boolean
  emptyMessage: React.ReactNode
  table?: ChartTableData
  className?: string
  children: React.ReactNode
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart")
  const showTable = view === "table" && table !== undefined && !isEmpty

  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action || (table && !isEmpty) ? (
          <CardAction className="flex items-center gap-2">
            {action}
            {table && !isEmpty ? (
              <div role="group" aria-label="Chart view" className="flex items-center rounded-lg border p-0.5">
                <Button
                  variant={view === "chart" ? "secondary" : "ghost"}
                  size="icon-xs"
                  aria-label="Show chart"
                  aria-pressed={view === "chart"}
                  onClick={() => setView("chart")}
                >
                  <ChartColumn />
                </Button>
                <Button
                  variant={view === "table" ? "secondary" : "ghost"}
                  size="icon-xs"
                  aria-label="Show table"
                  aria-pressed={view === "table"}
                  onClick={() => setView("table")}
                >
                  <Table2 />
                </Button>
              </div>
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isEmpty ? (
          <p className="flex min-h-40 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : showTable ? (
          <div className="max-h-80 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {table.columns.map((column, index) => (
                    <TableHead key={column} className={cn("px-3 text-xs text-muted-foreground", index > 0 && "text-right")}>
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex} className={cn("px-3 py-1.5", cellIndex > 0 && "text-right tabular-nums")}>
                        {cell ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
