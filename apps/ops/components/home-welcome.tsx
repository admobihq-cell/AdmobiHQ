import Link from "next/link"
import { BarChart3, LayoutDashboard } from "lucide-react"

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
    <section className="relative overflow-hidden rounded-xl border bg-card">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Welcome back, {displayName}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              You are signed in to the Admobi Ops console as{" "}
              <span className="font-medium text-foreground">{user?.email ?? "@admobihq.com"}</span>.
              Use this workspace to review operational data, manage submissions, and monitor CMS health.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild>
            <Link href="/overview">
              <BarChart3 />
              View analytics
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leads">
              <LayoutDashboard />
              Open leads
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
