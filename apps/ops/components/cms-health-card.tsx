"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ExternalLink } from "lucide-react"

import { SectionHeading } from "@/components/ui/section-heading"
import { cmsAdminLabel, cmsAdminUrl } from "@/lib/site-urls"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
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
    <div className="space-y-4">
      <SectionHeading
        title="CMS health"
        description={`Read-only snapshot · edit at ${adminLabel}`}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href={adminUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Open editor
            </Link>
          </Button>
        }
      />
      <Card className="shadow-none">
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Blog posts
              </p>
              <p className="text-lg font-semibold">
                {content.blog.published} published · {content.blog.draft} draft
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Help articles
              </p>
              <p className="text-lg font-semibold">
                {content.help.published} published · {content.help.draft} draft
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Media library
              </p>
              <p className="text-lg font-semibold">
                {content.media.total} files · {formatBytes(content.media.totalSize)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
