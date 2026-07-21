import type { ReactNode } from "react"
import {
  Bell,
  CreditCard,
  HelpCircle,
  Shield,
  UserCircle,
} from "lucide-react"
import { SettingsRow } from "@/components/settings/settings-row"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { apiPublicUrl } from "@/lib/site-urls"

export function SettingsView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8">
      <Card className="border-0 bg-primary text-primary-foreground shadow-none">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground/95">
            <UserCircle className="size-8 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <h1 className="text-lg font-semibold">Admobi Customer</h1>
            <p className="text-sm text-primary-foreground/85">
              Account preferences and workspace settings. Sub-pages are
              placeholders for now.
            </p>
          </div>
        </CardContent>
      </Card>

      <SettingsSection label="Account">
        <SettingsRow
          href="/settings/account"
          icon={UserCircle}
          label="Profile & sign-in"
          description="Name, email, and access"
        />
        <Separator />
        <SettingsRow
          href="/settings/security"
          icon={Shield}
          label="Security"
          description="Password and active sessions"
        />
      </SettingsSection>

      <SettingsSection label="Preferences">
        <SettingsRow
          href="/settings/notifications"
          icon={Bell}
          label="Notifications"
          description="Campaign alerts and digests"
        />
        <Separator />
        <SettingsRow
          href="/settings/billing"
          icon={CreditCard}
          label="Billing"
          description="Invoices and payment methods"
        />
      </SettingsSection>

      <SettingsSection label="Support">
        <SettingsRow
          href="/settings/support"
          icon={HelpCircle}
          label="Help & contact"
          description="FAQs and support requests"
        />
      </SettingsSection>

      <Card className="bg-muted/40 shadow-none">
        <CardContent className="space-y-1 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Environment
          </p>
          <p>API: {apiPublicUrl()}</p>
          <p className="text-xs text-muted-foreground">
            Customer web app · placeholder settings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <Card className="overflow-hidden p-0 shadow-none">
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
  )
}
