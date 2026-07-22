"use client"

import { useMemo, useState } from "react"
import { Calendar, MapPin, Plus } from "lucide-react"

import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { PLACEHOLDER_CAMPAIGNS } from "@/lib/placeholder-data"

const FILTERS = ["All", "Active", "Scheduled", "Draft"] as const
type Filter = (typeof FILTERS)[number]

export function CampaignsView() {
  const [filter, setFilter] = useState<Filter>("All")

  const visible = useMemo(
    () =>
      PLACEHOLDER_CAMPAIGNS.filter((campaign) => {
        if (filter === "All") return true
        return campaign.status === filter.toLowerCase()
      }),
    [filter],
  )

  return (
    <div className="relative flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Workspace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Create, schedule, and monitor out-of-home flights. Placeholder data
          for layout preview.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const active = filter === item
          return (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className={cn(!active && "text-muted-foreground")}
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((campaign) => (
          <Card
            key={campaign.id}
            className="shadow-none transition-colors hover:bg-muted/20"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <CardTitle className="text-base leading-snug">
                {campaign.name}
              </CardTitle>
              <CampaignStatusBadge status={campaign.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPin className="size-3.5 shrink-0" />
                  {campaign.market}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="size-3.5 shrink-0" />
                  {campaign.dates}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Impressions
                  </p>
                  <p className="text-sm font-semibold">{campaign.impressions}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Budget
                  </p>
                  <p className="text-sm font-semibold">{campaign.budget}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="fixed bottom-6 right-6 z-10 gap-2 rounded-full px-5 shadow-lg md:bottom-8 md:right-8">
        <Plus className="size-4" />
        New campaign
      </Button>
    </div>
  )
}
