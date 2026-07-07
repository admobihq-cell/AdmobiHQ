"use client"

import Link from "next/link"
import { useMemo } from "react"

import { cmsAdminLabel, cmsAdminUrl } from "@/lib/site-urls"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { formatBytes } from "@/lib/format"

type OverviewContent = {
  blog: { total: number; published: number; draft: number }
  help: { total: number; published: number; draft: number }
  media: { total: number; totalSize: number }
}

export function CmsHealthCard({ content }: { content: OverviewContent }) {
  const adminUrl = useMemo(() => cmsAdminUrl(), [])
  const adminLabel = useMemo(() => cmsAdminLabel(), [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>CMS health</CardTitle>
          <CardDescription>Read-only snapshot · edit at {adminLabel}</CardDescription>
        </div>
        <Link
          href={adminUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          Open CMS Editor →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Blog posts</p>
            <p className="text-lg font-semibold">
              {content.blog.published} published · {content.blog.draft} draft
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Help articles</p>
            <p className="text-lg font-semibold">
              {content.help.published} published · {content.help.draft} draft
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Media library</p>
            <p className="text-lg font-semibold">
              {content.media.total} files · {formatBytes(content.media.totalSize)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
