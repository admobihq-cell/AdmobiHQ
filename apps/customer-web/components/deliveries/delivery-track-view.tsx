"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  MapPin,
  Navigation,
  Package,
  Route as RouteIcon,
  Send,
  Truck,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
} from "@workspace/ui/components/map"

import { StatCard } from "@/components/stat-card"
import { getDeliveryById, type Delivery } from "@/lib/deliveries"

const STATUS_STYLES: Record<Delivery["status"], string> = {
  accepted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  picked_up: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
}

function DetailRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof MapPin
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

export function DeliveryTrackView({ id }: { id: string }) {
  const delivery = getDeliveryById(id)

  const backLink = (
    <Link
      href="/deliveries"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to deliveries
    </Link>
  )

  if (!delivery) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {backLink}
        <p className="text-sm text-muted-foreground">
          This delivery isn&apos;t available in this browser.
        </p>
      </div>
    )
  }

  const [pickupLng, pickupLat] = delivery.route[0]!
  const [dropoffLng, dropoffLat] = delivery.route[delivery.route.length - 1]!
  const [truckLng, truckLat] = delivery.currentPosition

  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-3">
        {backLink}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Preview
              </p>
              <Badge variant="secondary" className="text-[10px]">
                Not yet live
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Track delivery
            </h1>
            <p className="text-sm text-muted-foreground">
              {delivery.reference} · Created {delivery.createdOn}
            </p>
          </div>
          <Badge className={cn("uppercase tracking-wide", STATUS_STYLES[delivery.status])}>
            {delivery.statusLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Distance" value={`${delivery.distanceKm} km`} icon={RouteIcon} />
        <StatCard
          label="ETA"
          value={`${delivery.etaMinutes} min`}
          hint="Live estimate"
          icon={Clock}
        />
        <StatCard label="Price" value={delivery.price} icon={Package} className="col-span-2 xl:col-span-1" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Card className="shadow-none">
            <CardContent className="divide-y p-0">
              <DetailRow icon={MapPin} label="Pickup" value={delivery.pickup.address} hint={delivery.pickup.instructions} />
              <DetailRow icon={Navigation} label="Dropoff" value={delivery.dropoff.address} hint={delivery.dropoff.contact} />
              <DetailRow icon={Package} label="Package" value={delivery.package} />
              <DetailRow
                icon={Truck}
                label="Carrier"
                value={delivery.driver.name}
                hint={`${delivery.driver.vehicle} · ${delivery.driver.phone}`}
              />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {delivery.notes.map((note) => (
                  <div
                    key={note.id}
                    className={cn("flex flex-col gap-1", note.fromCustomer && "items-end")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        note.fromCustomer
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-muted",
                      )}
                    >
                      {note.body}
                    </div>
                    <p className="px-1 text-[11px] text-muted-foreground">
                      {note.fromCustomer ? "You" : note.author} · {note.timestamp}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  disabled
                  placeholder="Messaging is coming soon"
                  className="min-h-10 resize-none"
                />
                <button
                  type="button"
                  disabled
                  aria-label="Send message — coming soon"
                  className="flex size-9 shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-dashed text-muted-foreground"
                >
                  <Send className="size-4" aria-hidden />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="relative h-[360px] overflow-hidden rounded-xl border bg-muted/30">
            <Map
              center={truckLng && truckLat ? [truckLng, truckLat] : undefined}
              zoom={13.2}
              className="absolute inset-0 h-full w-full"
            >
              <MapRoute coordinates={delivery.route} color="#f97316" width={4} interactive={false} />

              <MapMarker longitude={pickupLng} latitude={pickupLat}>
                <MarkerContent>
                  <div className="size-3 rounded-full border-2 border-white bg-emerald-500 shadow" />
                </MarkerContent>
              </MapMarker>

              <MapMarker longitude={dropoffLng} latitude={dropoffLat}>
                <MarkerContent>
                  <div className="size-3 rounded-full border-2 border-white bg-neutral-900 shadow dark:bg-white" />
                </MarkerContent>
              </MapMarker>

              <MapMarker longitude={truckLng} latitude={truckLat}>
                <MarkerContent>
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20">
                    <Truck className="size-4" aria-hidden />
                  </div>
                </MarkerContent>
                <MarkerPopup>
                  <p className="text-xs font-medium">{delivery.driver.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ETA {delivery.etaMinutes} min · {delivery.distanceKm} km left
                  </p>
                </MarkerPopup>
              </MapMarker>

              <MapControls showZoom position="bottom-right" />
            </Map>
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {delivery.timeline.map((event) => (
                <div key={event.label} className="flex items-center gap-4 p-4">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      event.done ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                    aria-hidden
                  />
                  <p
                    className={cn(
                      "min-w-0 flex-1 text-sm",
                      event.done ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {event.label}
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {event.timestamp}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
