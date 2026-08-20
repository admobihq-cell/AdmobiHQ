"use client"

import { RotateCcw, Sparkles } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { useTourReplay } from "@workspace/ui/components/tour-provider"

export function TourSettingsSection({
  title = "Product tour",
  description = "Replay the welcome tour, or jump straight to a single chapter.",
}: {
  title?: string
  description?: string
}) {
  const { chapters, replay, replayAll } = useTourReplay()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={replayAll}
        >
          <Sparkles className="size-4" />
          Replay full tour
        </Button>
      </div>
      <Card className="shadow-none">
        <CardContent className="divide-y divide-border p-0">
          {chapters.map((chapter) => (
            <div
              key={chapter.key}
              className="flex items-start justify-between gap-4 p-4"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{chapter.title}</p>
                <p className="text-xs text-muted-foreground">
                  {chapter.description}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => replay(chapter.key)}
              >
                <RotateCcw className="size-3.5" />
                Replay
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
