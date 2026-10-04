import {
  Bike,
  CircleHelp,
  HandHelping,
  HeartPulse,
  ShieldAlert,
  Siren,
  Wrench,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/** Mirrors SAFETY_INCIDENT_TYPES. Unknown types fall back to the generic
 *  icon rather than rendering nothing, so a future type added server-side
 *  never leaves a blank cell in the queue. */
const ICONS = {
  accident: Siren,
  harassment: HandHelping,
  theft: ShieldAlert,
  vehicle_damage: Wrench,
  medical: HeartPulse,
  breakdown: Bike,
  other: CircleHelp,
} as const

export function IncidentTypeIcon({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  const Icon = ICONS[type as keyof typeof ICONS] ?? CircleHelp
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden />
}
