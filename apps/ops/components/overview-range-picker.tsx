"use client"

import { usePathname, useRouter } from "next/navigation"

import type { DateRangeKey } from "@/lib/queries/stats"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All time" },
]

type OverviewRangePickerProps = {
  range: DateRangeKey
  pending?: boolean
}

export function OverviewRangePicker({ range, pending }: OverviewRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-2">
      {RANGE_OPTIONS.map((option) => {
        const active = range === option.value
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={pending}
            className={cn("rounded-full", !active && "text-muted-foreground")}
            onClick={() => {
              const params = new URLSearchParams()
              params.set("range", option.value)
              router.push(`${pathname}?${params.toString()}`)
            }}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
