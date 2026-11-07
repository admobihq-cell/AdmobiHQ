"use client"

import {
  MEASUREMENT_LEVELS,
  MEASUREMENT_LEVEL_LABELS,
  type MeasurementLevel,
} from "@workspace/ops-contracts"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

const MEANING: Record<MeasurementLevel, string> = {
  booked:
    "What was scheduled and paid for. There are no play records yet, so nothing here says an ad was seen.",
  logged:
    "Plays recorded as they happened: how many, where and when. It counts plays, not people, so there is no audience estimate.",
  modelled:
    "Plays combined with traffic and footfall counts to estimate how many people saw your ad. Shown as a range.",
  calibrated:
    "A modelled estimate checked against measured audience data, so the range is tighter.",
}

/** Plain-language explanation of what each measurement level claims, and what a range means. */
export function HowWeEstimateSheet({
  open,
  onOpenChange,
  level,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  level: MeasurementLevel
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>How we estimate</SheetTitle>
          <SheetDescription>
            This page shows {MEASUREMENT_LEVEL_LABELS[level].toLowerCase()}. It never claims more than the data behind it.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-6 text-sm">
          <section>
            <h3 className="font-medium">Levels of measurement</h3>
            <dl className="mt-2 grid gap-3">
              {MEASUREMENT_LEVELS.map((l) => (
                <div key={l} className={l === level ? "rounded-md border bg-muted/30 p-3" : "px-3"}>
                  <dt className="font-medium">
                    {MEASUREMENT_LEVEL_LABELS[l]}
                    {l === level ? <span className="ml-2 text-xs font-normal text-muted-foreground">Shown now</span> : null}
                  </dt>
                  <dd className="text-muted-foreground">{MEANING[l]}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3 className="font-medium">Low, likely and high</h3>
            <p className="mt-1 text-muted-foreground">
              An estimate is a range, not a single number. Likely is our best estimate. Low and high are the
              ends of what we think is realistic. Impressions always say &ldquo;Est.&rdquo; for this reason.
            </p>
          </section>
          <section>
            <h3 className="font-medium">Reach</h3>
            <p className="mt-1 text-muted-foreground">
              Reach counts people once, however often they saw your ad, so it can&rsquo;t be added across
              campaigns. It appears when you look at one campaign.
            </p>
          </section>
          <section>
            <h3 className="font-medium">Delivery rate</h3>
            <p className="mt-1 text-muted-foreground">
              Plays delivered on schedule divided by plays scheduled. Extra plays beyond the schedule are not
              counted, so they can&rsquo;t cover for a missed one.
            </p>
          </section>
          <section>
            <h3 className="font-medium">Where the data comes from</h3>
            <p className="mt-1 text-muted-foreground">
              Booked figures come from your campaign schedule. Logged figures come from the play records of
              the vehicles running your campaign. Modelled and calibrated figures add traffic and audience
              data on top.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
