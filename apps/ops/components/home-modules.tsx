import { Car, FileText, Mail, Megaphone, Truck, Users, Wallet } from "lucide-react"

import { ModuleCard } from "@/components/ui/module-card"
import { SectionHeading } from "@/components/ui/section-heading"
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
    href: "/finances",
    label: "Finances",
    description: "Platform wallet, campaign top-ups, and driver payouts.",
    icon: Wallet,
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
      <SectionHeading
        title="Where to next"
        description="Jump straight into the area you need."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((module) => (
          <ModuleCard key={module.href} {...module} />
        ))}
      </div>
    </section>
  )
}
