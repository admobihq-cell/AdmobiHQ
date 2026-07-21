import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { SectionHeading } from "@/components/ui/section-heading"
import { StatCard } from "@/components/ui/stat-card"
import { BookOpen, FileImage, HelpCircle } from "lucide-react"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"

/** Skeleton for CMS stats data only — section labels stay visible. */
export function ContentOverviewSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Blog posts" value="—" />
        <StatCard icon={HelpCircle} label="Help articles" value="—" />
        <StatCard icon={FileImage} label="Media library" value="—" />
      </div>

      <div className="space-y-4">
        <SectionHeading
          title="Recent drafts"
          description="Latest unpublished blog and help content"
        />
        <Card className="shadow-none">
          <CardContent className="p-0">
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
      </div>
    </>
  )
}
