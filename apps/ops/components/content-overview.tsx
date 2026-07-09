import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          CMS stats unavailable — check DATABASE_URL and Payload tables.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Blog posts</CardDescription>
            <CardTitle className="text-2xl">{content.blog.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {content.blog.published} published · {content.blog.draft} draft
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Help articles</CardDescription>
            <CardTitle className="text-2xl">{content.help.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {content.help.published} published · {content.help.draft} draft
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Media library</CardDescription>
            <CardTitle className="text-2xl">{content.media.total} files</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatBytes(content.media.totalSize)} total
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent drafts</CardTitle>
          <CardDescription>Latest unpublished blog and help content</CardDescription>
        </CardHeader>
        <CardContent>
          {content.recentDrafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts.</p>
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
                    <TableCell>{draft.title}</TableCell>
                    <TableCell className="capitalize">{draft.type}</TableCell>
                    <TableCell>{formatDateTime(draft.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
