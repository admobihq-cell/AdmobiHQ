import Link from "next/link"
import { ArrowRight, Car, FileText, Mail, Megaphone, Truck, Users } from "lucide-react"

import { cmsAdminLabel } from "@/lib/site-urls"

const MODULES = [
  {
    href: "/leads",
    label: "Campaign Leads",
    description: "Review and manage inbound campaign interest.",
    icon: Megaphone,
  },
  {
    href: "/fleet",
    label: "Fleet Partners",
    description: "Onboard and track fleet partner applications.",
    icon: Truck,
  },
  {
    href: "/drivers",
    label: "Drivers",
    description: "Monitor driver signups and city distribution.",
    icon: Car,
  },
  {
    href: "/waitlist",
    label: "Waitlist",
    description: "See who's waiting to launch with Admobi.",
    icon: Mail,
  },
  {
    href: "/media-kit",
    label: "Media Kit",
    description: "Handle media kit download requests.",
    icon: FileText,
  },
  {
    href: "/content",
    label: "Content (CMS)",
    description: `Read-only CMS snapshot. Edit at ${cmsAdminLabel()}.`,
    icon: Users,
  },
] as const

export function HomeModules() {
  return (
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
            className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-accent/30 active:scale-[0.99]"
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
  )
}
