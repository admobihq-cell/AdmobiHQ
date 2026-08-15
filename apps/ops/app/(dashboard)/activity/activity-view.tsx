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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

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

export function ActivityView() {
  const client = useOpsClient()
  const [data, setData] = useState<Paginated<AuditEventDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState<string>(ALL)
  const [action, setAction] = useState<string>(ALL)
  const [app, setApp] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  const fetchSeq = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    try {
      const result = await client.audit.list({
        page,
        pageSize: 50,
        entity_type: entityType === ALL ? undefined : entityType,
        action: action === ALL ? undefined : action,
        app: app === ALL ? undefined : app,
      })
      if (seq !== fetchSeq.current) return
      setData(result)
    } catch (e) {
      if (seq !== fetchSeq.current) return
      toast.error(formatApiError(e))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, entityType, action, app, page])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setPage(1)
  }, [entityType, action, app])

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <History className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    No activity yet.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ops edits and public submissions will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(row.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {row.actor_email ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatLabel(row.actor_type)}
                        {row.app ? ` · ${row.app}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatLabel(row.action)}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatLabel(row.entity_type)}
                    {row.entity_id ? (
                      <span className="text-muted-foreground">
                        {" "}
                        #{row.entity_id}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal break-words text-muted-foreground">
                    {truncate(row.summary, 100)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
          Showing {data.items.length} of {data.total} events
        </p>
      ) : null}
    </div>
  )
}
