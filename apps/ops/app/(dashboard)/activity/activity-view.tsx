"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { TablePagination } from "@/components/ui/table-pagination"
import { formatDateTime, truncate } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ALL = "__all__"

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
  const [data, setData] = useState<Paginated<AuditEventDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState<string>(ALL)
  const [action, setAction] = useState<string>(ALL)
  const [app, setApp] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchSeq = useRef(0)
  const sortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const refresh = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    try {
      const result = await client.audit.list({
        page,
        pageSize,
        entity_type: entityType === ALL ? undefined : entityType,
        action: action === ALL ? undefined : action,
        app: app === ALL ? undefined : app,
        sortBy: "created_at",
        sortDir,
      })
      if (seq !== fetchSeq.current) return
      setData(result)
    } catch (e) {
      if (seq !== fetchSeq.current) return
      toast.error(formatApiError(e))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, entityType, action, app, page, pageSize, sortDir])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setPage(1)
  }, [entityType, action, app, pageSize, sortDir])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Activity"
        description="Who did what across ops, public forms, and future customer apps."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entities</SelectItem>
            {AUDIT_ENTITY_TYPES.map((key) => (
              <SelectItem key={key} value={key}>
                {formatLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {AUDIT_ACTIONS.map((key) => (
              <SelectItem key={key} value={key}>
                {formatLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={app} onValueChange={setApp}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="App" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All apps</SelectItem>
            {AUDIT_APPS.map((key) => (
              <SelectItem key={key} value={key}>
                {formatLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
          loading={loading}
          loadingText="Refresh"
          className="ml-auto"
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

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
            columns={columns}
            data={data.items}
            sorting={sorting}
            onSortingChange={setSorting}
            getRowId={(row) => String(row.id)}
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
