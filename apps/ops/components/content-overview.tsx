import { BookOpen, FileImage, HelpCircle } from "lucide-react"

import { StatCard } from "@/components/ui/stat-card"
import { SectionHeading } from "@/components/ui/section-heading"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { getContentStats } from "@/lib/queries/content"
import { formatBytes, formatDateTime } from "@/lib/format"

export async function ContentOverview() {
  const content = await getContentStats()

  if (!content) {
    return (
      <Card className="shadow-none">
        <CardContent className="py-12 text-center text-muted-foreground">
          CMS stats unavailable — check DATABASE_URL and Payload tables.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BookOpen}
          label="Blog posts"
          value={content.blog.total}
          hint={`${content.blog.published} published · ${content.blog.draft} draft`}
        />
        <StatCard
          icon={HelpCircle}
          label="Help articles"
          value={content.help.total}
          hint={`${content.help.published} published · ${content.help.draft} draft`}
        />
        <StatCard
          icon={FileImage}
          label="Media library"
          value={`${content.media.total} files`}
          hint={formatBytes(content.media.totalSize)}
        />
      </div>

      <div className="space-y-4">
        <SectionHeading
          title="Recent drafts"
          description="Latest unpublished blog and help content"
        />
        <Card className="shadow-none">
          <CardContent className="p-0">
            {content.recentDrafts.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No drafts.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.recentDrafts.map((draft) => (
                    <TableRow key={`${draft.type}-${draft.id}`}>
                      <TableCell className="font-medium">{draft.title}</TableCell>
                      <TableCell className="capitalize">{draft.type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(draft.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
