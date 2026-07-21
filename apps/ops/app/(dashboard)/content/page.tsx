import Link from "next/link"
import { Suspense } from "react"
import { ExternalLink } from "lucide-react"

import { ContentOverview } from "@/components/content-overview"
import { ContentOverviewSkeleton } from "@/components/content-overview-skeleton"
import { PageHero } from "@/components/ui/page-hero"
import { cmsAdminLabel, cmsAdminUrl } from "@/lib/site-urls"
import { Button } from "@workspace/ui/components/button"

export const metadata = { title: "Content" }

export default function ContentPage() {
  const adminUrl = cmsAdminUrl()
  const adminLabel = cmsAdminLabel()

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHero
        eyebrow="Content"
        title="CMS overview"
        description={`Read-only snapshot of blog, help, and media content. Edit at ${adminLabel}.`}
        actions={
          <Button asChild className="h-11 gap-2">
            <Link href={adminUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Open CMS editor
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<ContentOverviewSkeleton />}>
        <ContentOverview />
      </Suspense>
    </div>
  )
}
