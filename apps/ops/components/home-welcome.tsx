import Link from "next/link"
import { BarChart3, LayoutDashboard } from "lucide-react"

import { PageHero } from "@/components/ui/page-hero"
import { getOpsUser } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"

export async function HomeWelcome() {
  const user = await getOpsUser()
  const rawName =
    user?.user?.firstName?.trim() ||
    user?.email.split("@")[0] ||
    "there"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  return (
    <PageHero
      variant="card"
      eyebrow="Operations"
      title={`Welcome back, ${displayName}`}
      description={
        <>
          You are signed in as{" "}
          <span className="font-medium text-foreground">
            {user?.email ?? "@admobihq.com"}
          </span>
          . Review operational data, manage submissions, and monitor CMS health
          from this workspace.
        </>
      }
      actions={
        <>
          <Button asChild className="h-11 gap-2">
            <Link href="/overview">
              <BarChart3 className="size-4" />
              View analytics
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-11 gap-2">
            <Link href="/leads">
              <LayoutDashboard className="size-4" />
              Open leads
            </Link>
          </Button>
        </>
      }
    />
  )
}
