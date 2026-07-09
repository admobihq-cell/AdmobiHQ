import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

/** Skeleton for CMS stats data only — card labels and table headers stay visible. */
export function ContentOverviewSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Blog posts</CardDescription>
            <Skeleton className="mt-2 h-8 w-12" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full max-w-[12rem]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Help articles</CardDescription>
            <Skeleton className="mt-2 h-8 w-12" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full max-w-[12rem]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Media library</CardDescription>
            <Skeleton className="mt-2 h-8 w-12" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full max-w-[12rem]" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent drafts</CardTitle>
          <CardDescription>Latest unpublished blog and help content</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-full max-w-xs" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
