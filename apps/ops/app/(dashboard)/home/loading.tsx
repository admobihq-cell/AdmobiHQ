import Link from "next/link"
import { ArrowRight, BarChart3, Car, FileText, LayoutDashboard, Megaphone, Mail, Truck, Users } from "lucide-react"

import { HomeStatsSkeleton } from "@/components/home-stats-skeleton"
import { cmsAdminLabel } from "@/lib/site-urls"
import { Button } from "@workspace/ui/components/button"

const MODULES = [
  { href: "/leads", label: "Campaign Leads", description: "Review and manage inbound campaign interest.", icon: Megaphone },
  { href: "/fleet", label: "Fleet Partners", description: "Onboard and track fleet partner applications.", icon: Truck },
  { href: "/drivers", label: "Drivers", description: "Monitor driver signups and city distribution.", icon: Car },
  { href: "/waitlist", label: "Waitlist", description: "See who's waiting to launch with Admobi.", icon: Mail },
  { href: "/media-kit", label: "Media Kit", description: "Handle media kit download requests.", icon: FileText },
  { href: "/content", label: "Content (CMS)", description: `Read-only CMS snapshot. Edit at ${cmsAdminLabel()}.`, icon: Users },
] as const

/** Static home shell shown during navigation — only stats area skeletonizes. */
export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Welcome back
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Loading your ops workspace…
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

      <HomeStatsSkeleton />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Where to next</h2>
          <p className="text-sm text-muted-foreground">
            Jump straight into the area you need.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-xl border bg-card p-5 transition-transform hover:border-primary/30 hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
                  <module.icon className="size-4 text-primary" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="mt-4 font-medium">{module.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {module.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
