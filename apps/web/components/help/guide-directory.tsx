import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Compass,
  Gauge,
  IdCard,
  type LucideIcon,
  Megaphone,
  Siren,
  Users,
} from "lucide-react"

import type { HelpGroup } from "@/components/help/help-shared"

// Icon per seeded guide. A guide added in the CMS falls back to the book.
const GUIDE_ICONS: Record<string, LucideIcon> = {
  "advertiser-getting-started": Compass,
  "create-a-campaign": Megaphone,
  "track-campaigns": CalendarCheck,
  "team-and-roles": Users,
  "driver-account-setup": IdCard,
  "driver-dashboard": Gauge,
  "driver-sos-and-support": Siren,
}

type PanelRowProps = {
  href: string
  title: string
  text?: string
  icon?: LucideIcon
}

/** A destination row on the hub's coloured panel: icon tile, title, travelling arrow. */
export function PanelRow({ href, title, text, icon: Icon }: PanelRowProps) {
  return (
    <Link
      href={href}
      className="group hover:bg-primary-foreground/10 focus-visible:bg-primary-foreground/10 focus-visible:ring-primary-foreground flex items-center gap-4 px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:px-8 sm:py-5"
    >
      {Icon ? (
        <span className="bg-primary-foreground text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Icon aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-lg leading-snug font-semibold tracking-tight text-pretty sm:text-xl">
          {title}
        </span>
        {text ? (
          <span className="text-primary-foreground/80 mt-1 line-clamp-2 block text-sm leading-relaxed">
            {text}
          </span>
        ) : null}
      </span>
      <span className="border-primary-foreground/40 group-hover:bg-primary-foreground group-hover:text-primary group-focus-visible:bg-primary-foreground group-focus-visible:text-primary flex size-9 shrink-0 items-center justify-center rounded-full border transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transform-none">
        <ArrowRight aria-hidden className="size-4" />
      </span>
    </Link>
  )
}

/** The product guides on the hub panel: one column per guide category. */
export function GuideDirectory({ groups }: { groups: HelpGroup[] }) {
  if (groups.length === 0) {
    return null
  }

  return (
    <div className="divide-primary-foreground/20 border-primary-foreground/20 grid divide-y border-t lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      {groups.map((group) => (
        <section key={group.category.id} aria-labelledby={`guides-${group.category.slug}`}>
          <h2
            id={`guides-${group.category.slug}`}
            className="text-primary-foreground/80 px-5 pt-6 pb-2 text-sm font-medium sm:px-8"
          >
            {group.category.title}
          </h2>
          <ul className="divide-primary-foreground/20 divide-y">
            {group.articles.map((article) => (
              <li key={article.id}>
                <PanelRow
                  href={`/help/${article.slug}`}
                  title={article.title}
                  text={article.excerpt}
                  icon={GUIDE_ICONS[article.slug] ?? BookOpen}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
