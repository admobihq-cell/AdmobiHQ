"use client"

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

export type DashboardTab = { value: string; label: string; count?: number }

/**
 * The muted pill bar. Controlled and content-less: the page renders the panel for `value`,
 * so tab state can live in the URL. Scrolls sideways inside its own row at phone width.
 */
export function DashboardTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: DashboardTab[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Tabs value={value} onValueChange={onChange} className="max-w-full gap-0">
      {/* No bottom padding: it pushed the pills above the centre line of a toolbar row they share with the range. */}
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {tab.count !== undefined ? (
                <span className="text-xs text-muted-foreground tabular-nums">{tab.count}</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
