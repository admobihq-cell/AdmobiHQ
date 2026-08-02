"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Inbox, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  formatLabel,
  type SupportCaseDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

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

import { PageHero } from "@/components/ui/page-hero"
import { StatusBadge } from "@/components/status-badge"
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

export function SupportView() {
  const client = useOpsClient()
  const [data, setData] = useState<Paginated<SupportCaseDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await client.support.list({
        page: 1,
        pageSize: 50,
        search: search || undefined,
        status: status === ALL ? undefined : status,
        category: category === ALL ? undefined : category,
      })
      setData(result)
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [client, search, status, category])

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [refresh, search])

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHero
        eyebrow="Operations"
        title="Support"
        description="Cases opened from the landing page, customer web, and customer mobile."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search subject, name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1"
        />

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
                <TableCell colSpan={6} className="h-32 text-center">
                  <Inbox className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No cases yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requests from the landing page and customer apps will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <Link href={`/support/${row.id}`} className="block">
                      {formatDateTime(row.created_at)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/support/${row.id}`} className="block font-medium">
                      {row.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/support/${row.id}`} className="block">
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
                    <Link href={`/support/${row.id}`} className="block">
                      {formatLabel(row.category)}
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

      {data && data.total > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {data.items.length} of {data.total} cases
        </p>
      ) : null}
    </div>
  )
}
