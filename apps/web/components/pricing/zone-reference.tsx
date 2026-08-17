import { allScreensFlatMultiplier, zoneTiers } from "@/lib/seo/pricing-data"

const tintByIndex = ["bg-primary/[0.025]", "bg-primary/[0.065]", "bg-primary/[0.11]"]

export function ZoneReferenceTable() {
  return (
    <div className="space-y-4">
      <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {zoneTiers.map((zone, i) => (
          <li
            key={zone.id}
            className={`flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:gap-8 sm:px-7 sm:py-6 ${tintByIndex[i] ?? ""}`}
          >
            <div className="shrink-0 sm:w-20">
              <span className="text-foreground font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                {zone.multiplier.toFixed(1)}x
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-foreground text-base font-semibold">{zone.name}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{zone.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:max-w-[15rem] sm:justify-end">
              {zone.examples.map((area) => (
                <span
                  key={area}
                  className="border-border bg-background text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
                >
                  {area}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border px-5 py-5 sm:flex-row sm:items-center sm:gap-8 sm:px-7 sm:py-6">
        <div className="shrink-0 sm:w-20">
          <span className="text-foreground font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
            {allScreensFlatMultiplier.toFixed(1)}x
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-foreground text-base font-semibold">All screens, flat</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Skip zone selection entirely. One blended rate covers every corridor above, network-wide.
          </p>
        </div>
      </div>
    </div>
  )
}
