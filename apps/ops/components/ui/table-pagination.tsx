"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

type TablePaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  /** Omit both this and `onPageSizeChange` to hide the rows-per-page selector. */
  pageSize?: number
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

/** First/last page, the current page +-1, and an ellipsis over any gap. */
function pageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)

  const result: (number | "ellipsis")[] = []
  let previous: number | null = null
  for (const n of sorted) {
    if (previous !== null && n - previous > 1) result.push("ellipsis")
    result.push(n)
    previous = n
  }
  return result
}

/** Shared table-footer pagination for ops list views — wraps the shadcn primitives
 * with page-number/ellipsis generation and wires clicks to client-side page state
 * instead of href navigation. Pass `pageSize`/`onPageSizeChange` to also show a
 * rows-per-page selector; the pager itself still hides once everything fits on
 * one page, but the selector stays visible so it's still reachable. */
export function TablePagination({
  page,
  totalPages,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  const showPageSize = pageSize != null && onPageSizeChange != null
  if (totalPages <= 1 && !showPageSize) return null

  const goTo = (target: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (target !== page) onPageChange(target)
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {total} total{totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </span>
        {showPageSize ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger size="sm" className="w-[70px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      {totalPages > 1 ? (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                onClick={goTo(page - 1)}
              />
            </PaginationItem>
            {pageNumbers(page, totalPages).map((n, i) =>
              n === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={n}>
                  <PaginationLink href="#" isActive={n === page} onClick={goTo(n)}>
                    {n}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                onClick={goTo(page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}
