import Link from "next/link"
import { Suspense } from "react"

import { ContentOverview } from "@/components/content-overview"
import { ContentOverviewSkeleton } from "@/components/content-overview-skeleton"
import { cmsAdminLabel, cmsAdminUrl } from "@/lib/site-urls"
import { Button } from "@workspace/ui/components/button"

export const metadata = { title: "Content" }

export default function ContentPage() {
  const adminUrl = cmsAdminUrl()
  const adminLabel = cmsAdminLabel()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Overview</h1>
          <p className="text-sm text-muted-foreground">
            Read-only CMS snapshot. Edit content at {adminLabel}.
          </p>
        </div>
        <Button asChild>
          <Link href={adminUrl} target="_blank" rel="noopener noreferrer">
            Open CMS Editor →
          </Link>
        </Button>
      </div>

      <Suspense fallback={<ContentOverviewSkeleton />}>
        <ContentOverview />
      </Suspense>
    </div>
  )
}
