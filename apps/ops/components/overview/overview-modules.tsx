import { Car, FileText, Mail, Megaphone, Radio, Truck, Users, Wallet } from "lucide-react"

import { getOpsUser } from "@/lib/auth"
import { ModuleCard } from "@/components/ui/module-card"
import { SectionHeading } from "@/components/ui/section-heading"
import { cmsAdminLabel } from "@/lib/site-urls"

const MODULES = [
  {
    href: "/leads",
    permission: "leads",
    label: "Campaign Leads",
    description: "Review and manage inbound campaign interest.",
    icon: Megaphone,
  },
  {
    href: "/fleet",
    permission: "fleet",
    label: "Fleet Partners",
    description: "Onboard and track fleet partner applications.",
    icon: Truck,
  },
  {
    href: "/drivers",
    permission: "drivers",
    label: "Drivers",
    description: "Monitor driver signups and city distribution.",
    icon: Car,
  },
  {
    href: "/finances",
    permission: "finances",
    label: "Finances",
    description: "Platform wallet, campaign top-ups, and driver payouts.",
    icon: Wallet,
  },
  {
    href: "/waitlist",
    permission: "waitlist",
    label: "Waitlist",
    description: "See who's waiting to launch with Admobi.",
    icon: Mail,
  },
  {
    href: "/media-kit",
    permission: "media_kit",
    label: "Media Kit",
    description: "Handle media kit download requests.",
    icon: FileText,
  },
  {
    href: "/announcements",
    permission: "announcements",
    label: "Announcements",
    description: "Broadcast a message to every installed customer app.",
    icon: Radio,
  },
  {
    href: "/content",
    permission: "content",
    label: "Content (CMS)",
    description: `Read-only CMS snapshot. Edit at ${cmsAdminLabel()}.`,
    icon: Users,
  },
] as const

export async function OverviewModules() {
  const user = await getOpsUser()
  const modules = MODULES.filter(
    (m) => user !== null && (user.role === "admin" || user.permissions.includes(m.permission)),
  )
  if (modules.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Where to next"
        description="Jump straight into the area you need."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <ModuleCard key={m.href} href={m.href} label={m.label} description={m.description} icon={m.icon} />
        ))}
      </div>
    </section>
  )
}
