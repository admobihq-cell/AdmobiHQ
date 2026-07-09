import { Download, Plus, Search } from "lucide-react"

import { EntityTableSkeleton } from "@/components/entity-table-skeleton"
import type { EntityPageMeta } from "@/lib/entity-pages"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

type EntityPageChromeProps = EntityPageMeta & {
  children?: React.ReactNode
  /** When true, renders skeleton rows instead of children. */
  loading?: boolean
}

export function EntityPageChrome({
  title,
  description,
  columns,
  children,
  loading = false,
}: EntityPageChromeProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search…" className="pl-8" disabled={loading} />
        </div>
        <Button variant="outline" size="sm" disabled>
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
        <Button size="sm" disabled>
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || !children ? (
              <EntityTableSkeleton columnCount={columns.length} rows={5} bodyOnly />
            ) : (
              children
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
