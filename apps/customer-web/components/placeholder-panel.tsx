type PlaceholderPanelProps = {
  title: string
  body: string
}

export function PlaceholderPanel({ title, body }: PlaceholderPanelProps) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border bg-card p-8 shadow-none ring-1 ring-foreground/10">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Coming soon
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  )
}
