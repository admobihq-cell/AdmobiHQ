import { Bell, FileText, Megaphone, Wallet } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

import { SettingsToggleRow } from "@/components/settings/settings-toggle-row"

const NOTIFICATION_ROWS = [
  {
    id: "notify-campaign-alerts",
    icon: Megaphone,
    label: "Campaign alerts",
    description: "Approvals, start/end dates, and delivery issues",
    checked: true,
  },
  {
    id: "notify-billing-alerts",
    icon: Wallet,
    label: "Wallet & billing alerts",
    description: "Low balance and auto-reload confirmations",
    checked: true,
  },
  {
    id: "notify-weekly-digest",
    icon: FileText,
    label: "Weekly performance digest",
    description: "A summary of reach and spend every Monday",
    checked: false,
  },
  {
    id: "notify-product-updates",
    icon: Bell,
    label: "Product updates",
    description: "New features and platform announcements",
    checked: false,
  },
] as const

export function NotificationsSettingsView() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
          <Badge variant="secondary" className="text-[10px]">
            Illustrative
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Choose which campaign events reach your email. Preferences here are shown
          for reference — they save once account management ships.
        </p>
      </div>

      <Card className="overflow-hidden p-0 shadow-none">
        <CardContent className="p-0">
          {NOTIFICATION_ROWS.map((row, index) => (
            <div key={row.id}>
              {index > 0 ? <Separator /> : null}
              <SettingsToggleRow
                id={row.id}
                icon={row.icon}
                label={row.label}
                description={row.description}
                checked={row.checked}
                disabled
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
