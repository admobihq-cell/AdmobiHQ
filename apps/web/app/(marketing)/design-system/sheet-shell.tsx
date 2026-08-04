import type { ReactNode } from "react"

/** One numbered specification sheet: a title block, an optional lead line, then its content. */
export function Sheet({
  id,
  index,
  title,
  meta,
  lead,
  children,
}: {
  id: string
  index: string
  title: string
  meta: string
  lead?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28 py-14 sm:scroll-mt-32 sm:py-16">
      <header className="mb-8 flex flex-col gap-3 border-b border-border pb-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-primary">{index}</span>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
        </div>
        <span className="font-mono text-[0.7rem] text-muted-foreground">{meta}</span>
      </header>
      {lead ? (
        <p className="mb-8 max-w-[62ch] text-muted-foreground">{lead}</p>
      ) : null}
      {children}
    </section>
  )
}

/** A labeled block within a sheet — groups related specimens under a small caption. */
export function Block({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}
