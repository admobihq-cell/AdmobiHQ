"use client"

import { useState } from "react"

import { DataTable, DataTableSortHeader, type ColumnDef, type SortingState } from "@/components/ui/data-table"
import { formatDateTime } from "@/lib/format"
import type { ContentStats } from "@/lib/queries/content"

type Draft = ContentStats["recentDrafts"][number]

const columns: ColumnDef<Draft, any>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Title"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Type"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Updated"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDateTime(row.original.updatedAt)}</span>
    ),
  },
]

export function ContentDraftsTable({ drafts }: { drafts: Draft[] }) {
  const [sorting, setSorting] = useState<SortingState>([])

  return (
    <DataTable
      columns={columns}
      data={drafts}
      manualSorting={false}
      sorting={sorting}
      onSortingChange={setSorting}
      getRowId={(draft) => `${draft.type}-${draft.id}`}
    />
  )
}
