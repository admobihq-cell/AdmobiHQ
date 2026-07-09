"use client"

import { usePathname, useRouter } from "next/navigation"

import type { DateRangeKey } from "@/lib/queries/stats"
import { Button } from "@workspace/ui/components/button"

const RANGE_OPTIONS: DateRangeKey[] = ["7d", "30d", "90d", "all"]

type OverviewRangePickerProps = {
  range: DateRangeKey
  pending?: boolean
}

export function OverviewRangePicker({ range, pending }: OverviewRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex gap-1 rounded-lg border p-1">
      {RANGE_OPTIONS.map((option) => (
        <Button
          key={option}
          variant={range === option ? "default" : "ghost"}
          size="sm"
          disabled={pending}
          onClick={() => {
            const params = new URLSearchParams()
            params.set("range", option)
            router.push(`${pathname}?${params.toString()}`)
          }}
        >
          {option === "all" ? "All time" : option.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}
