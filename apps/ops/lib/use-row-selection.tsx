"use client"

import { useMemo, useState } from "react"

import { Checkbox } from "@workspace/ui/components/checkbox"

import type { ColumnDef } from "@/components/ui/data-table"

/** Row checkboxes for a DataTable. Selection clears whenever `resetKey`
 * changes (page, page size, search, filters) so hidden rows can never be
 * exported or acted on. */
export function useRowSelection<T extends { id: number }>(
  rows: T[],
  resetKey: unknown
) {
  // Selection is stored against the resetKey it was made under; a different
  // key reads as empty, so no effect is needed to clear it.
  const resetToken = JSON.stringify(resetKey)
  const [selection, setSelection] = useState<{
    token: string
    ids: Set<number>
  }>({
    token: resetToken,
    ids: new Set(),
  })
  const selectedIds = useMemo(
    () => (selection.token === resetToken ? selection.ids : new Set<number>()),
    [selection, resetToken]
  )
  const setSelectedIds = (update: (current: Set<number>) => Set<number>) =>
    setSelection((prev) => ({
      token: resetToken,
      ids: update(prev.token === resetToken ? prev.ids : new Set()),
    }))

  const pageIds = useMemo(() => rows.map((row) => row.id), [rows])
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds]
  )

  const toggleRow = (id: number, checked: boolean) =>
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const toggleAllOnPage = (checked: boolean) =>
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const id of pageIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })

  const selectColumn: ColumnDef<T, any> = {
    id: "select",
    meta: { className: "w-10" },
    header: () => (
      <Checkbox
        checked={
          allPageSelected ? true : somePageSelected ? "indeterminate" : false
        }
        onCheckedChange={(checked) => toggleAllOnPage(checked === true)}
        aria-label="Select all on page"
        disabled={!rows.length}
      />
    ),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(checked) =>
            toggleRow(row.original.id, checked === true)
          }
          aria-label={`Select record #${row.original.id}`}
        />
      </div>
    ),
  }

  return {
    selectedIds,
    selectedRows,
    count: selectedIds.size,
    clear: () => setSelectedIds(() => new Set()),
    selectColumn,
  }
}
