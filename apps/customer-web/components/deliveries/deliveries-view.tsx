import Link from "next/link"
import { Clock, MapPin, Navigation, PackageCheck, Send } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { getActiveDelivery } from "@/lib/deliveries"

export function DeliveriesView() {
  const activeDelivery = getActiveDelivery()
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
        <h1 className="text-3xl font-semibold tracking-tight">Book a delivery</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A preview of how Admobi Deliveries will work — book a pickup and dropoff, and
          one of our screen-carrying drivers takes it from there. Booking isn't live yet;
          this shows the shape of the feature.
        </p>
      </div>

      <Card className="w-full max-w-xl shadow-none">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="delivery-pickup">Pickup</Label>
            <Input
              id="delivery-pickup"
              placeholder="e.g. Sarit Centre, Westlands"
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-dropoff">Dropoff</Label>
            <Input
              id="delivery-dropoff"
              placeholder="e.g. Kilimani, Wood Ave"
              disabled
            />
          </div>
          <Button type="button" disabled className="w-full">
            <Send className="size-4" aria-hidden />
            Book delivery — coming soon
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {activeDelivery ? (
          <Link href={`/deliveries/${activeDelivery.id}`} className="group">
            <Card className="h-full shadow-none transition-colors group-hover:border-primary/40">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                    {activeDelivery.statusLabel}
                  </Badge>
                  <p className="text-sm font-semibold text-primary">
                    {activeDelivery.price}
                  </p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{activeDelivery.pickup.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{activeDelivery.dropoff.address}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden />
                    ETA {activeDelivery.etaMinutes} min
                  </p>
                  <p className="text-xs font-medium text-primary group-hover:underline">
                    Track delivery →
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-10 text-center">
            <MapPin className="size-5 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">No active delivery</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Once dispatch is live, an in-progress pickup will track here.
            </p>
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-10 text-center">
          <PackageCheck className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">No delivery history yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Completed deliveries will show up here once booking is live.
          </p>
        </div>
      </div>
    </div>
  )
}
