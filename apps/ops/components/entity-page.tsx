"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Download, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { formatApiError, getApiBaseUrl } from "@workspace/ops-api-client"
import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { downloadBlob, downloadCsv, downloadPdf, formatDateTime, toCsv } from "@/lib/format"
import { buildStyledXlsx } from "@/lib/xlsx"
import { apiPathToPermission, resolveOpsResource, useOpsClient } from "@/lib/ops-client"
import { EntityTableSkeleton } from "@/components/entity-table-skeleton"
import { DataTable, type ColumnDef as TanStackColumnDef } from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { TablePagination } from "@/components/ui/table-pagination"

// Radix's Select forbids an item value of "" (reserved to mean "no
// selection"), so "all statuses" needs a sentinel — statusFilter itself
// stays "" internally, translated only at this component's boundary.
const ALL_STATUSES = "__all__"

const DEFAULT_PAGE_SIZE = 25

export type ColumnDef<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  csv?: (row: T) => string | number | null
}

export type DetailFieldDef<T> = {
  key: string
  label: string
  render: (row: T) => React.ReactNode
}

type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type StatusBulkOption = {
  value: string
  label: string
}

export type BulkActionDef<T> = {
  id: string
  label: string
  variant?: "default" | "destructive" | "outline"
  confirm?: {
    title: string
    description: (count: number) => string
  }
  action: (ids: number[], rows: T[]) => Promise<void>
}

type EntityPageProps<T extends { id: number }> = {
  title: string
  description: string
  apiPath: string
  columns: ColumnDef<T>[]
  emptyMessage?: string
  initialData?: Paginated<T>
  detailFields?: DetailFieldDef<T>[]
  getRecordTitle?: (row: T) => string
  statusBulkOptions?: StatusBulkOption[]
  statusFilterOptions?: StatusBulkOption[]
  bulkActions?: BulkActionDef<T>[]
  renderForm: (props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial?: T | null
    onSubmit: (values: Record<string, unknown>) => Promise<void>
    saving: boolean
  }) => React.ReactNode
  getCsvRow?: (row: T) => Record<string, unknown>
}

export function EntityPage<T extends { id: number }>({
  title,
  description,
  apiPath,
  columns,
  emptyMessage = "No records yet.",
  initialData,
  detailFields,
  getRecordTitle,
  statusBulkOptions,
  statusFilterOptions,
  bulkActions = [],
  renderForm,
  getCsvRow,
}: EntityPageProps<T>) {
  const opsClient = useOpsClient()
  const resource = useMemo(
    () => resolveOpsResource(opsClient, apiPath),
    [opsClient, apiPath],
  )
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [viewing, setViewing] = useState<T | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<{
    title: string
    description: string
    destructive?: boolean
    onConfirm: () => Promise<void>
  } | null>(null)

  const listQueryKey = ["ops-entity", apiPath, { page, pageSize, search, statusFilter }] as const

  const {
    data,
    isLoading: loading,
    isError,
    error: fetchErrorRaw,
    refetch,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      resource.list({
        page,
        pageSize,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }) as unknown as Promise<Paginated<T>>,
    initialData:
      initialData && page === 1 && pageSize === DEFAULT_PAGE_SIZE && !search && !statusFilter
        ? initialData
        : undefined,
    placeholderData: keepPreviousData,
  })

  const fetchError = isError
    ? formatApiError(fetchErrorRaw, {
        apiUrl: getApiBaseUrl(),
        networkHint: `Cannot reach the ops API. Run \`npm run env:pull -w ops\` and confirm the API is running.`,
      })
    : null

  const pageIds = useMemo(
    () => data?.items.map((row) => row.id) ?? [],
    [data?.items],
  )
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))
  const selectedCount = selectedIds.size
  const selectedRows = useMemo(
    () => data?.items.filter((row) => selectedIds.has(row.id)) ?? [],
    [data?.items, selectedIds],
  )

  const detailRows =
    detailFields ??
    columns.map((column) => ({
      key: column.key,
      label: column.header,
      render: column.render,
    }))

  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, pageSize, search, apiPath])

  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const id of pageIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const postBulk = async (body: Record<string, unknown>) => {
    return resource.bulk(body as never)
  }

  // Drop rows from every cached page of this entity's list immediately, so a
  // deleted record can't linger on screen for the ~1s an invalidate+refetch
  // takes to come back. The invalidate still runs afterwards to reconcile
  // pagination (a page that's now one row short pulls the next row in).
  const dropFromListCache = (removed: Set<number>) => {
    queryClient.setQueriesData<Paginated<T>>(
      { queryKey: ["ops-entity", apiPath] },
      (old) =>
        old
          ? {
              ...old,
              items: old.items.filter((row) => !removed.has(row.id)),
              total: Math.max(0, old.total - removed.size),
            }
          : old,
    )
  }

  const bulkMutation = useMutation({
    mutationFn: (action: () => Promise<void>) => action(),
    onSuccess: () => {
      clearSelection()
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
    onSettled: () => setBulkConfirm(null),
  })

  const runBulkAction = (action: () => Promise<void>) => bulkMutation.mutate(action)

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds)
    setBulkConfirm({
      title: `Delete ${ids.length} record${ids.length === 1 ? "" : "s"}?`,
      description: `This action cannot be undone. ${ids.length} record${ids.length === 1 ? "" : "s"} will be permanently removed.`,
      destructive: true,
      onConfirm: async () => {
        const result = await postBulk({ action: "delete", ids })
        dropFromListCache(new Set(ids))
        toast.success(`Deleted ${result.count} record${result.count === 1 ? "" : "s"}`)
      },
    })
  }

  const handleBulkStatus = (status: string, label: string) => {
    const ids = Array.from(selectedIds)
    void runBulkAction(async () => {
      const result = await postBulk({ action: "updateStatus", ids, status })
      toast.success(
        `Updated ${result.count} record${result.count === 1 ? "" : "s"} to ${label}`,
      )
    })
  }

  const handleBulkExport = () => {
    if (!selectedRows.length) return
    const csvColumns = columns.filter((c) => c.csv).map((c) => c.key)
    const rows = selectedRows.map((row) => {
      if (getCsvRow) return getCsvRow(row)
      return Object.fromEntries(
        columns
          .filter((c) => c.csv)
          .map((c) => [c.key, c.csv!(row)]),
      )
    })
    downloadCsv(
      `${apiPath.replace(/^\/v1\//, "")}-selected.csv`,
      toCsv(rows, csvColumns),
    )
    toast.success(`Exported ${selectedRows.length} record${selectedRows.length === 1 ? "" : "s"}`)
  }

  const handleBulkExportPdf = async () => {
    if (!selectedRows.length) return
    const pdfColumns = columns.filter((c) => c.csv)
    const headers = pdfColumns.map((c) => c.header)
    const rows = selectedRows.map((row) =>
      pdfColumns.map((c) => String(c.csv!(row) ?? "")),
    )
    try {
      const blob = await opsClient.documents.exportPdf({
        entity: apiPathToPermission(apiPath),
        title,
        headers,
        rows,
      })
      downloadPdf(`${apiPath.replace(/^\/v1\//, "")}-selected.pdf`, blob)
      toast.success(
        `Exported ${selectedRows.length} record${selectedRows.length === 1 ? "" : "s"}`,
      )
    } catch (e) {
      toast.error(formatApiError(e))
    }
  }

  const handleBulkExportExcel = async () => {
    if (!selectedRows.length) return
    const excelColumns = columns.filter((c) => c.csv)
    const headers = excelColumns.map((c) => c.header)
    const rows = selectedRows.map((row) =>
      excelColumns.map((c) => String(c.csv!(row) ?? "")),
    )
    const blob = await buildStyledXlsx(title, headers, rows)
    downloadBlob(`${apiPath.replace(/^\/v1\//, "")}-selected.xlsx`, blob)
    toast.success(`Exported ${selectedRows.length} record${selectedRows.length === 1 ? "" : "s"}`)
  }

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      (editing
        ? resource.update(editing.id, values as never)
        : resource.create(values as never)) as unknown as Promise<T>,
    onSuccess: () => {
      toast.success(editing ? "Updated" : "Created")
      setFormOpen(false)
      setEditing(null)
      setViewing(null)
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const handleSubmit = async (values: Record<string, unknown>) => {
    // onError above already surfaces a toast; mutateAsync still rejects the
    // returned promise on failure, and the JSX call site fires this with
    // `void onSubmit(values)` — swallow here so a failed save doesn't also
    // surface as an unhandled promise rejection (e.g. to Sentry).
    await saveMutation.mutateAsync(values).catch(() => {})
  }

  const deleteMutation = useMutation({
    mutationFn: (target: T) => resource.delete(target.id),
    onSuccess: (_result, target) => {
      toast.success("Deleted")
      setDeleteTarget(null)
      setViewing(null)
      dropFromListCache(new Set([target.id]))
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget)
  }

  const handleExport = () => {
    if (!data?.items.length) return
    const csvColumns = columns.filter((c) => c.csv).map((c) => c.key)
    const rows = data.items.map((row) => {
      if (getCsvRow) return getCsvRow(row)
      return Object.fromEntries(
        columns
          .filter((c) => c.csv)
          .map((c) => [c.key, c.csv!(row)]),
      )
    })
    downloadCsv(`${apiPath.replace(/^\/v1\//, "")}.csv`, toCsv(rows, csvColumns))
  }

  const handleExportPdf = async () => {
    if (!data?.items.length) return
    const pdfColumns = columns.filter((c) => c.csv)
    const headers = pdfColumns.map((c) => c.header)
    const rows = data.items.map((row) =>
      pdfColumns.map((c) => String(c.csv!(row) ?? "")),
    )
    try {
      const blob = await opsClient.documents.exportPdf({
        entity: apiPathToPermission(apiPath),
        title,
        headers,
        rows,
      })
      downloadPdf(`${apiPath.replace(/^\/v1\//, "")}.pdf`, blob)
    } catch (e) {
      toast.error(formatApiError(e))
    }
  }

  const handleExportExcel = async () => {
    if (!data?.items.length) return
    const excelColumns = columns.filter((c) => c.csv)
    const headers = excelColumns.map((c) => c.header)
    const rows = data.items.map((row) =>
      excelColumns.map((c) => String(c.csv!(row) ?? "")),
    )
    const blob = await buildStyledXlsx(title, headers, rows)
    downloadBlob(`${apiPath.replace(/^\/v1\//, "")}.xlsx`, blob)
  }

  const quickStatusMutation = useMutation({
    mutationFn: (status: string) => {
      if (!viewing) throw new Error("No record selected")
      return resource.update(viewing.id, { status } as never) as unknown as Promise<T>
    },
    onSuccess: (_result, status) => {
      toast.success("Status updated")
      setViewing((prev) => (prev ? ({ ...prev, status } as T) : prev))
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const handleQuickStatusChange = (status: string) => quickStatusMutation.mutate(status)

  const saving = saveMutation.isPending || quickStatusMutation.isPending
  const deleting = deleteMutation.isPending

  const tableColumns: TanStackColumnDef<T, any>[] = [
    {
      id: "select",
      meta: { className: "w-10" },
      header: () => (
        <Checkbox
          checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => toggleAllOnPage(checked === true)}
          aria-label="Select all on page"
          disabled={loading || !data?.items.length}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={(checked) => toggleRow(row.original.id, checked === true)}
            aria-label={`Select record #${row.original.id}`}
          />
        </div>
      ),
    },
    ...columns.map(
      (col): TanStackColumnDef<T, any> => ({
        id: col.key,
        header: col.header,
        cell: ({ row }) => col.render(row.original),
      }),
    ),
    {
      id: "actions",
      header: "Actions",
      meta: { className: "w-[100px]" },
      cell: ({ row }) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(row.original)
              setFormOpen(true)
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero title={title} description={description} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!data?.items.length}>
              <Download data-icon="inline-start" />
              Export
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void handleExportExcel()}>
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleExportPdf()}>
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}>Export as CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {statusFilterOptions?.length ? (
          <Select
            value={statusFilter || ALL_STATUSES}
            onValueChange={(value) => {
              setStatusFilter(value === ALL_STATUSES ? "" : value)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              {statusFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </div>

      {fetchError ? (
        <ApiErrorBanner
          message={fetchError}
          onRetry={() => void refetch()}
        />
      ) : null}

      {selectedCount > 0 && (
        <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {statusBulkOptions && statusBulkOptions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkMutation.isPending}>
                    Set status
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {statusBulkOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleBulkStatus(option.value, option.label)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant ?? "outline"}
                size="sm"
                disabled={bulkMutation.isPending}
                onClick={() => {
                  const ids = Array.from(selectedIds)
                  if (action.confirm) {
                    setBulkConfirm({
                      title: action.confirm.title,
                      description: action.confirm.description(ids.length),
                      destructive: action.variant === "destructive",
                      onConfirm: () => action.action(ids, selectedRows),
                    })
                    return
                  }
                  void runBulkAction(() => action.action(ids, selectedRows))
                }}
              >
                {action.label}
              </Button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkMutation.isPending}>
                  <Download data-icon="inline-start" />
                  Export selected
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void handleBulkExportExcel()}>
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleBulkExportPdf()}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkExport}>Export as CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkMutation.isPending}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={bulkMutation.isPending}
              aria-label="Clear selection"
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {loading ? (
          <EntityTableSkeleton columnCount={columns.length} rows={5} selectable />
        ) : fetchError ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-foreground">Couldn&apos;t load records</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
        ) : !data?.items.length ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search or add a new record.
            </p>
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            data={data.items}
            getRowId={(row) => String(row.id)}
            onRowClick={(row) => setViewing(row)}
            rowClassName={(row) =>
              cn("hover:bg-muted/50", selectedIds.has(row.id) && "bg-muted/50")
            }
          />
        )}
      </div>

      {data && (
        <TablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      {renderForm({
        open: formOpen,
        onOpenChange: (open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        },
        initial: editing,
        onSubmit: handleSubmit,
        saving,
      })}

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {getRecordTitle?.(viewing) ?? `Record #${viewing.id}`}
                </DialogTitle>
                {"created_at" in viewing && (
                  <DialogDescription>
                    Submitted{" "}
                    {formatDateTime(
                      (viewing as T & { created_at?: string }).created_at,
                    )}
                  </DialogDescription>
                )}
              </DialogHeader>
              <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(0,7rem)_1fr]">
                {detailRows.map((field) => (
                  <div key={field.key} className="contents">
                    <dt className="text-muted-foreground">{field.label}</dt>
                    <dd className="min-w-0 break-words font-medium">
                      {field.render(viewing)}
                    </dd>
                  </div>
                ))}
              </dl>
              {statusBulkOptions?.length &&
              "status" in viewing &&
              viewing.status != null ? (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-muted-foreground text-sm">Quick status</span>
                  {statusBulkOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={
                        (viewing as T & { status?: string }).status === option.value
                          ? "default"
                          : "outline"
                      }
                      disabled={saving}
                      onClick={() => void handleQuickStatusChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewing(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setDeleteTarget(viewing)
                    setViewing(null)
                  }}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(viewing)
                    setFormOpen(true)
                    setViewing(null)
                  }}
                >
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.{" "}
              {deleteTarget
                ? `${getRecordTitle?.(deleteTarget) ?? `Record #${deleteTarget.id}`} will be permanently removed.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkConfirm !== null} onOpenChange={() => !bulkMutation.isPending && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkConfirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{bulkConfirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (bulkConfirm) void runBulkAction(bulkConfirm.onConfirm)
              }}
              disabled={bulkMutation.isPending}
              className={
                bulkConfirm?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {bulkMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function SimpleFormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSubmit,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: Array<{
    name: string
    label: string
    type?: string
    required?: boolean
    options?: Array<{ value: string; label: string }>
  }>
  initial?: Record<string, unknown> | null
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  saving: boolean
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      const next: Record<string, string> = {}
      for (const f of fields) {
        const v = initial?.[f.name]
        next[f.name] = v != null ? String(v) : ""
      }
      setValues(next)
    }
  }, [open, initial, fields])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void onSubmit(values)
          }}
        >
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.options ? (
                <Select
                  name={field.name}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onValueChange={(value) =>
                    setValues((v) => ({ ...v, [field.name]: value }))
                  }
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "multiline" ? (
                <Textarea
                  id={field.name}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  required={field.required}
                  rows={4}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  required={field.required}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} loading={saving}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
