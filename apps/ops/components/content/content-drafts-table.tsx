"use client"

import { useMemo, useState } from "react"

import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import {
  BulkBar,
  FilterSelect,
  TableToolbar,
} from "@/components/ui/table-toolbar"
import { formatDateTime, formatLabel, matchesSearch } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"
import {
  exportTableRows,
  type ExportColumn,
  type ExportFormat,
} from "@/lib/table-export"
import { useRowSelection } from "@/lib/use-row-selection"
import type { ContentStats } from "@/lib/queries/content"

type Draft = ContentStats["recentDrafts"][number]

// Ids repeat across content types, so the row key carries the type too.
const getDraftId = (draft: Draft) => `${draft.type}-${draft.id}`

const exportColumns: ExportColumn<Draft>[] = [
  { key: "title", header: "Title", value: (d) => d.title },
  { key: "type", header: "Type", value: (d) => formatLabel(d.type) },
  {
    key: "updated",
    header: "Updated",
    value: (d) => formatDateTime(d.updatedAt),
  },
]

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
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
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
      <span className="text-muted-foreground">
        {formatDateTime(row.original.updatedAt)}
      </span>
    ),
  },
]

export function ContentDraftsTable({ drafts }: { drafts: Draft[] }) {
  const client = useOpsClient()
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState("")
  const [type, setType] = useState("")

  const typeOptions = useMemo(
    () =>
      [...new Set(drafts.map((d) => d.type))]
        .sort()
        .map((value) => ({ value, label: formatLabel(value) })),
    [drafts]
  )
  const rows = useMemo(
    () =>
      drafts.filter(
        (d) => (!type || d.type === type) && matchesSearch(search, d.title)
      ),
    [drafts, type, search]
  )
  const selection = useRowSelection(rows, [type, search], getDraftId)
  const exportRows = (
    format: ExportFormat,
    list: Draft[],
    scope: "selected" | null
  ) =>
    void exportTableRows({
      format,
      title: "Content drafts",
      scope,
      columns: exportColumns,
      rows: list,
      entity: "content",
      client,
    })

  return (
    <div className="flex flex-col">
      {/* Rendered inside a p-0 card, so the controls carry their own padding. */}
      <div className="flex flex-col gap-3 border-b p-3">
        <TableToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search drafts…",
          }}
          filters={
            <FilterSelect
              value={type}
              onChange={setType}
              options={typeOptions}
              allLabel="All types"
            />
          }
          onExport={(format) => exportRows(format, rows, null)}
          exportDisabled={!rows.length}
        />
        <BulkBar
          count={selection.count}
          onExport={(format) =>
            exportRows(format, selection.selectedRows, "selected")
          }
          onClear={selection.clear}
        />
      </div>
      <DataTable
        pageSize={25}
        columns={[selection.selectColumn, ...columns]}
        data={rows}
        manualSorting={false}
        sorting={sorting}
        onSortingChange={setSorting}
        getRowId={getDraftId}
      />
    </div>
  )
}
