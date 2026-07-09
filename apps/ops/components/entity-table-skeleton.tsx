import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

type EntityTableSkeletonProps = {
  columnCount: number
  rows?: number
  /** When true, renders only table rows (for use inside TableBody). */
  bodyOnly?: boolean
}

function EntityTableRowsSkeleton({
  columnCount,
  rows = 5,
}: EntityTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columnCount }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
          <TableCell>
            <Skeleton className="h-8 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function EntityTableSkeleton({
  columnCount,
  rows = 5,
  bodyOnly = false,
}: EntityTableSkeletonProps) {
  if (bodyOnly) {
    return <EntityTableRowsSkeleton columnCount={columnCount} rows={rows} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columnCount }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
          <TableHead className="w-[100px]">
            <Skeleton className="h-4 w-16" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <EntityTableRowsSkeleton columnCount={columnCount} rows={rows} />
      </TableBody>
    </Table>
  )
}
