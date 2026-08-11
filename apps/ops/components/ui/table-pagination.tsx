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

type TablePaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
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
 * instead of href navigation. */
export function TablePagination({ page, totalPages, total, onPageChange }: TablePaginationProps) {
  if (totalPages <= 1) return null

  const goTo = (target: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (target !== page) onPageChange(target)
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <span className="text-sm text-muted-foreground">
        {total} total · page {page} of {totalPages}
      </span>
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
    </div>
  )
}
