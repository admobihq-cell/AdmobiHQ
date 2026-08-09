import { MapPin, PackageCheck, PackageSearch } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"

const SAMPLE_JOBS = [
  {
    id: "1",
    pickup: "Sarit Centre, Westlands",
    dropoff: "Kilimani, Wood Ave",
    fee: "KES 350",
    status: "Available",
  },
  {
    id: "2",
    pickup: "CBD, Kimathi St",
    dropoff: "Lavington Mall",
    fee: "KES 420",
    status: "Available",
  },
] as const

export function DeliveriesView() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Preview
          </p>
          <Badge variant="secondary" className="text-[10px]">
            Not yet live
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Delivery jobs</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A preview of how delivery jobs will look once Admobi Deliveries ships —
          accept a pickup near you, carry it alongside your screen, and get paid on
          top of your ad earnings. Dispatch isn't built yet; this shows the shape
          of the feature.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Available near you
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SAMPLE_JOBS.map((job) => (
            <Card key={job.id} className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <PackageSearch className="size-3" aria-hidden />
                    {job.status}
                  </Badge>
                  <p className="text-sm font-semibold text-primary">{job.fee}</p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{job.pickup}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <PackageCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{job.dropoff}</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground"
                >
                  Accept — coming soon
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Job history
        </p>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-10 text-center">
          <p className="text-sm font-medium">No completed deliveries yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Once dispatch is live, completed pickups and dropoffs will show up here.
          </p>
        </div>
      </div>
    </div>
  )
}
