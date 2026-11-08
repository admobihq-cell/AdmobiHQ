"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { History, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import {
  AUDIT_ACTIONS,
  AUDIT_APPS,
  AUDIT_ENTITY_TYPES,
  formatLabel,
  type AuditEventDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { BulkBar, FilterSelect, TableToolbar } from "@/components/ui/table-toolbar"
import { TablePagination } from "@/components/ui/table-pagination"
import { formatDateTime, truncate } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"
import { exportTableRows, type ExportColumn, type ExportFormat } from "@/lib/table-export"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { useRowSelection } from "@/lib/use-row-selection"

const toOptions = (keys: readonly string[]) => keys.map((value) => ({ value, label: formatLabel(value) }))

const exportColumns: ExportColumn<AuditEventDto>[] = [
  { key: "when", header: "When", value: (r) => formatDateTime(r.created_at) },
  { key: "actor", header: "Actor", value: (r) => r.actor_email ?? formatLabel(r.actor_type) },
  { key: "app", header: "App", value: (r) => r.app },
  { key: "action", header: "Action", value: (r) => formatLabel(r.action) },
  {
    key: "entity",
    header: "Entity",
    value: (r) => `${formatLabel(r.entity_type)}${r.entity_id ? ` #${r.entity_id}` : ""}`,
  },
  { key: "summary", header: "Summary", value: (r) => r.summary },
]

const columns: ColumnDef<AuditEventDto, any>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableSortHeader
        label="When"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDateTime(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "actor",
    header: "Actor",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{row.original.actor_email ?? "—"}</span>
        <span className="text-xs text-muted-foreground">
          {formatLabel(row.original.actor_type)}
          {row.original.app ? ` · ${row.original.app}` : ""}
        </span>
      </div>
    ),
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => <Badge variant="secondary">{formatLabel(row.original.action)}</Badge>,
  },
  {
    id: "entity",
    header: "Entity",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatLabel(row.original.entity_type)}
        {row.original.entity_id ? (
          <span className="text-muted-foreground"> #{row.original.entity_id}</span>
        ) : null}
      </span>
    ),
  },
  {
    id: "summary",
    header: "Summary",
    cell: ({ row }) => (
      <span className="max-w-md whitespace-normal break-words text-muted-foreground">
        {truncate(row.original.summary, 100)}
      </span>
    ),
  },
]

export function ActivityView() {
  const client = useOpsClient()
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")
  const [app, setApp] = useState("")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sorting, setSorting] = useState<SortingState>([])

  const sortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const activityQuery = useQuery({
    queryKey: [
      "ops-activity",
      { entityType, action, app, page, pageSize, sortDir, search: debouncedSearch },
    ],
    queryFn: () =>
      client.audit.list({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        entity_type: entityType || undefined,
        action: action || undefined,
        app: app || undefined,
        sortBy: "created_at",
        sortDir,
      }),
    placeholderData: keepPreviousData,
  })
  const data = activityQuery.data ?? null
  const loading = activityQuery.isLoading
  const refresh = () => activityQuery.refetch()

  useEffect(() => {
    if (activityQuery.isError) toast.error(formatApiError(activityQuery.error))
  }, [activityQuery.isError, activityQuery.error])

  useEffect(() => {
    setPage(1)
  }, [entityType, action, app, pageSize, sortDir, debouncedSearch])

  const items = data?.items ?? []
  const selection = useRowSelection(items, [
    page,
    pageSize,
    sortDir,
    entityType,
    action,
    app,
    debouncedSearch,
  ])
  const exportRows = (format: ExportFormat, rows: AuditEventDto[], scope: "selected" | null) =>
    void exportTableRows({
      format,
      title: "Activity",
      scope,
      columns: exportColumns,
      rows,
      entity: "activity",
      client,
    })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Activity"
        description="Who did what across ops, public forms, and future customer apps."
      />

      <TableToolbar
        search={{ value: search, onChange: setSearch, placeholder: "Search activity…" }}
        filters={
          <>
            <FilterSelect
              value={entityType}
              onChange={setEntityType}
              options={toOptions(AUDIT_ENTITY_TYPES)}
              allLabel="All entities"
            />
            <FilterSelect
              value={action}
              onChange={setAction}
              options={toOptions(AUDIT_ACTIONS)}
              allLabel="All actions"
            />
            <FilterSelect value={app} onChange={setApp} options={toOptions(AUDIT_APPS)} allLabel="All apps" />
          </>
        }
        onExport={(format) => exportRows(format, items, null)}
        exportDisabled={!items.length}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            loading={loading}
            loadingText="Refresh"
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />

      <BulkBar
        count={selection.count}
        onExport={(format) => exportRows(format, selection.selectedRows, "selected")}
        onClear={selection.clear}
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {loading && !data ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.items.length ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <History className="mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No activity yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ops edits and public submissions will appear here.
            </p>
          </div>
        ) : (
          <DataTable
            columns={[selection.selectColumn, ...columns]}
            data={data.items}
            sorting={sorting}
            onSortingChange={setSorting}
            getRowId={(row) => String(row.id)}
            rowClassName={(row) => cn(selection.selectedIds.has(row.id) && "bg-muted/50")}
          />
        )}
      </div>

      {data && data.total > 0 ? (
        <TablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  )
}
