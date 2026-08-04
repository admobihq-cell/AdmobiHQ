const TITLE_BLOCK = [
  { label: "Set", value: "Admobi product & marketing" },
  { label: "Sheets", value: "01–06" },
  { label: "Source", value: "packages/ui" },
  { label: "Scale", value: "1:1" },
]

export function CoverSheet() {
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <div className="max-w-[62ch]">
        <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Design system
        </h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
          Every token and component Admobi builds with, drawn up as a set of
          reference sheets: color, type, space, elevation, motion, and the
          components assembled from them. Click any value to copy it.
        </p>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-4">
        {TITLE_BLOCK.map((row) => (
          <div key={row.label}>
            <dt className="font-mono text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="mt-1 font-mono text-sm text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
