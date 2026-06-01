import { formatLastUpdatedLabel, SEO_LAST_UPDATED } from "@/lib/seo/site-updates"

type LastUpdatedProps = {
  className?: string
  isoDate?: string
}

export function LastUpdated({ className, isoDate = SEO_LAST_UPDATED }: LastUpdatedProps) {
  return (
    <p className={className ?? "text-muted-foreground text-sm"}>
      <time dateTime={isoDate}>Last updated: {formatLastUpdatedLabel(isoDate)}</time>
    </p>
  )
}
