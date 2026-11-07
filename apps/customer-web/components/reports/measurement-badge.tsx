"use client"

import { Info } from "lucide-react"
import { MEASUREMENT_LEVEL_LABELS, type MeasurementLevel } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"

/** The lowest measurement level in view. Click to learn what that level means. */
export function MeasurementBadge({
  level,
  onClick,
}: {
  level: MeasurementLevel
  onClick: () => void
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} aria-label={`Measurement: ${MEASUREMENT_LEVEL_LABELS[level]}. How we estimate`}>
      <Info aria-hidden />
      <span className="text-muted-foreground">Measurement</span>
      {MEASUREMENT_LEVEL_LABELS[level]}
    </Button>
  )
}
