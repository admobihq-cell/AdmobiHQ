"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Inbox, Loader2, RefreshCw, Search } from "lucide-react"

import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  formatLabel,
  type SupportCaseDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { TablePagination } from "@/components/ui/table-pagination"
import { StatusBadge } from "@/components/status-badge"
import { SupportCategoryIcon } from "@/components/support-category-icon"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ALL = "__all__"

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function SupportLink({
  id,
  className,
  children,
}: {
  id: number
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={`/support/${id}`} className={className}>
      {children}
    </Link>
  )
}

const columns: ColumnDef<SupportCaseDto, any>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Date"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="block whitespace-nowrap text-muted-foreground">
        {formatDateTime(row.original.created_at)}
      </SupportLink>
    ),
  },
  {
    id: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="flex items-center gap-2 font-medium">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            row.original.priority === "urgent"
              ? "bg-destructive"
              : row.original.priority === "high"
                ? "bg-amber-500"
                : "bg-transparent",
          )}
          aria-label={
            row.original.priority === "urgent" || row.original.priority === "high"
              ? `${formatLabel(row.original.priority)} priority`
              : undefined
          }
        />
        {row.original.subject}
      </SupportLink>
    ),
  },
  {
    id: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {initials(row.original.contact_name)}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{row.original.contact_name}</span>
          <span className="text-xs text-muted-foreground">{row.original.contact_email}</span>
        </div>
      </SupportLink>
    ),
  },
  {
    id: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="block">
        <Badge variant="outline">{formatLabel(row.original.channel)}</Badge>
      </SupportLink>
    ),
  },
  {
    id: "category",
    header: "Category",
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="flex items-center gap-1.5 text-muted-foreground">
        <SupportCategoryIcon category={row.original.category} className="size-3.5" />
        <span className="text-foreground">{formatLabel(row.original.category)}</span>
      </SupportLink>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableSortHeader
        label="Status"
        sorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <SupportLink id={row.original.id} className="block">
        <StatusBadge status={row.original.status} />
      </SupportLink>
    ),
  },
]

export function SupportView() {
  const client = useOpsClient()
  const [data, setData] = useState<Paginated<SupportCaseDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchSeq = useRef(0)
  const sort = sorting[0]
  const sortBy = sort?.id === "status" ? "status" : "created_at"
  const sortDir = sort?.desc === false ? "asc" : "desc"

  const refresh = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setFetchError(null)
    try {
      const result = await client.support.list({
        page,
        pageSize: 50,
        search: search || undefined,
        status: status === ALL ? undefined : status,
        category: category === ALL ? undefined : category,
        sortBy,
        sortDir,
      })
      if (seq !== fetchSeq.current) return
      setData(result)
    } catch (e) {
      if (seq !== fetchSeq.current) return
      setFetchError(formatApiError(e))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, search, status, category, page, sortBy, sortDir])

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [refresh, search])

  useEffect(() => {
    setPage(1)
  }, [search, status, category, sortBy, sortDir])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero
        title="Support"
        description="Cases opened from the landing page, customer web, and customer mobile."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search subject, name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {SUPPORT_STATUSES.map((key) => (
              <SelectItem key={key} value={key}>
                {formatLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {SUPPORT_CATEGORIES.map((key) => (
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

      {fetchError ? (
        <ApiErrorBanner
          message={fetchError}
          onRetry={() => void refresh()}
          onDismiss={() => setFetchError(null)}
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {loading && !data ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.items.length ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
            <Inbox className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No cases yet.</p>
            <p className="text-xs text-muted-foreground">
              Requests from the landing page and customer apps will appear here.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data.items}
            sorting={sorting}
            onSortingChange={setSorting}
            getRowId={(row) => String(row.id)}
            rowClassName={() => "cursor-pointer hover:bg-muted/40"}
          />
        )}
      </div>

      {data && data.totalPages > 1 ? (
        <TablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      ) : data && data.total > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {data.items.length} of {data.total} cases
        </p>
      ) : null}
    </div>
  )
}
