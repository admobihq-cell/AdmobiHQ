import Link from "next/link"

type ArticleCardProps = {
  href: string
  title: string
  excerpt: string
  meta?: string
}

export function ArticleCard({ href, title, excerpt, meta }: ArticleCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
    >
      {meta ? (
        <p className="text-muted-foreground font-mono text-[0.65rem] uppercase tracking-wider">
          {meta}
        </p>
      ) : null}
      <h3 className="text-foreground text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{excerpt}</p>
    </Link>
  )
}
