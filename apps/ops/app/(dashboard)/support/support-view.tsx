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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { PageHero } from "@/components/ui/page-hero"
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

export function SupportView() {
  const client = useOpsClient()
  const [data, setData] = useState<Paginated<SupportCaseDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  const fetchSeq = useRef(0)

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
      })
      if (seq !== fetchSeq.current) return
      setData(result)
    } catch (e) {
      if (seq !== fetchSeq.current) return
      setFetchError(formatApiError(e))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, search, status, category, page])

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [refresh, search])

  useEffect(() => {
    setPage(1)
  }, [search, status, category])

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
          className="ml-auto"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <Inbox className="size-5 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No cases yet.</p>
                    <p className="text-xs text-muted-foreground">
                      Requests from the landing page and customer apps will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <Link href={`/support/${row.id}`} className="block">
                      {formatDateTime(row.created_at)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/support/${row.id}`} className="flex items-center gap-2 font-medium">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          row.priority === "urgent"
                            ? "bg-destructive"
                            : row.priority === "high"
                              ? "bg-amber-500"
                              : "bg-transparent",
                        )}
                        aria-label={
                          row.priority === "urgent" || row.priority === "high"
                            ? `${formatLabel(row.priority)} priority`
                            : undefined
                        }
                      />
                      {row.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/support/${row.id}`} className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {initials(row.contact_name)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{row.contact_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.contact_email}
                        </span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/support/${row.id}`} className="block">
                      <Badge variant="outline">{formatLabel(row.channel)}</Badge>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/support/${row.id}`} className="flex items-center gap-1.5 text-muted-foreground">
                      <SupportCategoryIcon category={row.category} className="size-3.5" />
                      <span className="text-foreground">{formatLabel(row.category)}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/support/${row.id}`} className="block">
                      <StatusBadge status={row.status} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} total · page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : data && data.total > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {data.items.length} of {data.total} cases
        </p>
      ) : null}
    </div>
  )
}
