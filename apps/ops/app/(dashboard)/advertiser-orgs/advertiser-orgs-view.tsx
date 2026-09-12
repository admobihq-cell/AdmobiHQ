"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import type { OpsAdvertiserOrgListItemDto, PaginatedResponse } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Input } from "@workspace/ui/components/input"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { PageHero } from "@/components/ui/page-hero"
import { TablePagination } from "@/components/ui/table-pagination"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"
import { ADVERTISER_ORGS_PAGE } from "@/lib/entity-pages"

function OrgLink({
  id,
  className,
  children,
}: {
  id: number
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={`/advertiser-orgs/${id}`} className={className}>
      {children}
    </Link>
  )
}

const columns: ColumnDef<OpsAdvertiserOrgListItemDto, unknown>[] = [
  {
    id: "name",
    header: "Name",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <OrgLink id={row.original.id} className="block px-2 py-2 font-medium">
        {row.original.name || "—"}
      </OrgLink>
    ),
  },
  {
    id: "members",
    header: "Members",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <OrgLink id={row.original.id} className="block px-2 py-2 tabular-nums">
        {row.original.memberCount}
      </OrgLink>
    ),
  },
  {
    id: "campaigns",
    header: "Campaigns",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <OrgLink id={row.original.id} className="block px-2 py-2 tabular-nums">
        {row.original.campaignCount}
      </OrgLink>
    ),
  },
  {
    id: "created",
    header: "Created",
    meta: { cellClassName: "p-0" },
    cell: ({ row }) => (
      <OrgLink id={row.original.id} className="block px-2 py-2 text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </OrgLink>
    ),
  },
]

const EMPTY: PaginatedResponse<OpsAdvertiserOrgListItemDto> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
}

export function AdvertiserOrgsView() {
  const client = useOpsClient()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const orgsQuery = useQuery({
    queryKey: ["ops-advertiser-orgs", { page, pageSize, search: debouncedSearch }],
    queryFn: () =>
      client.advertiserOrgs.list({
        page,
        pageSize,
        search: debouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  })
  const data = orgsQuery.data ?? EMPTY
  const loading = orgsQuery.isLoading

  useEffect(() => {
    if (orgsQuery.isError) toast.error(formatApiError(orgsQuery.error))
  }, [orgsQuery.isError, orgsQuery.error])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHero title={ADVERTISER_ORGS_PAGE.title} description={ADVERTISER_ORGS_PAGE.description} />

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by organization name…"
        className="max-w-sm"
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-none">
        {data.items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            {loading ? "Loading…" : "No advertiser organizations found."}
          </div>
        ) : (
          <DataTable columns={columns} data={data.items} getRowId={(row) => String(row.id)} />
        )}
      </div>

      {data.total > 0 ? (
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
      ) : null}
    </div>
  )
}
