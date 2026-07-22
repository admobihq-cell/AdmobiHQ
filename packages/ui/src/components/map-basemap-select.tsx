"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

export type MapBasemapOption = {
  id: string
  label: string
  description?: string
}

type MapBasemapSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: readonly MapBasemapOption[]
  className?: string
  /** Overlay position on the map canvas */
  position?: "top-left" | "top-right"
  label?: string
}

const positionClasses = {
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
} as const

export function MapBasemapSelect({
  value,
  onValueChange,
  options,
  className,
  position = "top-left",
  label = "Basemap",
}: MapBasemapSelectProps) {
  return (
    <div
      className={cn(
        "absolute z-20 min-w-[9.5rem] overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-sm backdrop-blur-sm",
        positionClasses[position],
        className,
      )}
    >
      <div className="border-b border-border/70 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="p-1">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger
            size="sm"
            aria-label={label}
            className="h-8 w-full border-0 bg-transparent shadow-none dark:bg-transparent"
          >
            <SelectValue placeholder="Select basemap" />
          </SelectTrigger>
          <SelectContent align="start" position="popper" className="min-w-48">
            {options.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                title={option.description}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
