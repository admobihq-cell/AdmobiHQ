import { Package } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"

import { SettingsToggleRow } from "@/components/settings/settings-toggle-row"

export function DeliveryPreferencesView() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Delivery preferences</h2>
          <Badge variant="secondary" className="text-[10px]">
            Illustrative
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your personal opt-in for carrying deliveries alongside your screen — separate
          from whether the Deliveries preview is visible at all, which Admobi controls.
        </p>
      </div>

      <Card className="overflow-hidden p-0 shadow-none">
        <CardContent className="p-0">
          <SettingsToggleRow
            id="delivery-opt-in"
            icon={Package}
            label="Carry deliveries alongside your screen"
            description="Turn this on to receive nearby delivery jobs once dispatch is live"
            checked={false}
            disabled
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dispatch, job matching, and proof-of-delivery aren&apos;t built yet — this opt-in
        is saved for when they are.
      </p>
    </div>
  )
}
