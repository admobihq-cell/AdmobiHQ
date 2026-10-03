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

type GuideRowProps = {
  href: string
  title: string
  text?: string
  icon?: LucideIcon
}

/** A destination row on the help hub: icon tile, title, one-line summary, travelling arrow. */
export function GuideRow({ href, title, text, icon: Icon }: GuideRowProps) {
  return (
    <Link
      href={href}
      className="group hover:bg-muted/70 focus-visible:ring-ring -mx-3 flex items-center gap-4 rounded-2xl px-3 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {Icon ? (
        <span className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors">
          <Icon aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="text-foreground block text-lg leading-snug font-semibold tracking-tight text-pretty">
          {title}
        </span>
        {text ? (
          <span className="text-muted-foreground mt-1 line-clamp-2 block text-sm leading-relaxed">
            {text}
          </span>
        ) : null}
      </span>
      <ArrowRight
        aria-hidden
        className="text-muted-foreground group-hover:text-primary size-5 shrink-0 transition-[color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transform-none"
      />
    </Link>
  )
}

/** The product guides on the hub: one column per guide category. */
export function GuideDirectory({ groups }: { groups: HelpGroup[] }) {
  if (groups.length === 0) {
    return null
  }

  return (
    <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
      {groups.map((group) => (
        <section key={group.category.id} aria-labelledby={`guides-${group.category.slug}`}>
          <h2
            id={`guides-${group.category.slug}`}
            className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
          >
            {group.category.title}
          </h2>
          {group.category.description ? (
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">
              {group.category.description}
            </p>
          ) : null}
          <ul className="divide-border border-border mt-5 divide-y border-t">
            {group.articles.map((article) => (
              <li key={article.id}>
                <GuideRow
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
