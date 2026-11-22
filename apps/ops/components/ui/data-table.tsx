"use client"

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { TablePagination } from "@/components/ui/table-pagination"

export type { ColumnDef, SortingState, RowSelectionState }

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by TanStack's ColumnMeta<TData, TValue> shape
  interface ColumnMeta<TData, TValue> {
    /** Applied to both the TableHead and TableCell, unless the more specific
     * headerClassName/cellClassName below is also given. */
    className?: string
    headerClassName?: string
    cellClassName?: string
  }
}

/** Sortable column header — pass as a column's `header` for any column that
 * should be clickable to sort. Non-sortable columns just use a plain string. */
export function DataTableSortHeader({
  label,
  sorted,
  onToggle,
}: {
  label: string
  sorted: false | "asc" | "desc"
  onToggle: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={onToggle}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="ml-2 size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-2 size-3.5" />
      ) : (
        <ArrowUpDown className="ml-2 size-3.5 text-muted-foreground" />
      )}
    </Button>
  )
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  getRowId?: (row: TData) => string
  /** Controlled sorting state. Omit both this and `onSortingChange` for an
   * unsortable table. */
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  /** true (default): the caller applies sorting themselves (server-side API
   * params) and `data` is expected pre-sorted. false: TanStack sorts `data`
   * itself client-side using each column's accessor — for small, unpaginated
   * lists with no server sort support. */
  manualSorting?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  onRowClick?: (row: TData) => void
  rowClassName?: (row: TData) => string | undefined
  /** Skips rendering the <TableHeader> entirely — for tables that never had
   * a header row (e.g. a bare list of action rows). */
  hideHeader?: boolean
  headerRowClassName?: string
  /** Applied to the <table> element itself — e.g. `table-fixed` for tables
   * with percentage-width columns. */
  tableClassName?: string
  /** Pages `data` client-side, this many rows a page, with controls under the table. For lists
   * fetched whole; server-paged lists render TablePagination themselves and omit this. */
  pageSize?: number
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  sorting,
  onSortingChange,
  manualSorting = true,
  rowSelection = {},
  onRowSelectionChange,
  enableRowSelection,
  onRowClick,
  rowClassName,
  hideHeader,
  headerRowClassName,
  tableClassName,
  pageSize,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: pageSize ? getPaginationRowModel() : undefined,
    initialState: pageSize
      ? { pagination: { pageIndex: 0, pageSize } }
      : undefined,
    getRowId,
    manualSorting,
    state: { sorting, rowSelection },
    onSortingChange,
    onRowSelectionChange,
    enableRowSelection,
  })

  const pageCount = pageSize ? table.getPageCount() : 1
  return (
    <>
      <Table className={tableClassName}>
        {hideHeader ? null : (
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={headerRowClassName}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={
                      header.column.columnDef.meta?.headerClassName ??
                      header.column.columnDef.meta?.className
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        )}
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className={cn(
                onRowClick && "cursor-pointer",
                rowClassName?.(row.original)
              )}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={
                    cell.column.columnDef.meta?.cellClassName ??
                    cell.column.columnDef.meta?.className
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 ? (
        <div className="border-t px-3 py-2.5">
          <TablePagination
            page={table.getState().pagination.pageIndex + 1}
            totalPages={pageCount}
            total={data.length}
            onPageChange={(page) => table.setPageIndex(page - 1)}
          />
        </div>
      ) : null}
    </>
  )
}
