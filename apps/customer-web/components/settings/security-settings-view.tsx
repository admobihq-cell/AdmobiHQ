import { Laptop, ShieldCheck } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { SettingsToggleRow } from "@/components/settings/settings-toggle-row"

export function SecuritySettingsView() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Security</h2>
          <Badge variant="secondary" className="text-[10px]">
            Illustrative
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Password, two-factor authentication, and session management activate once
          real sign-in ships alongside account management.
        </p>
      </div>

      <Card className="shadow-none">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm font-semibold">Password</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" disabled />
            </div>
          </div>
          <Button type="button" disabled>
            Update password — coming soon
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Two-factor authentication
        </p>
        <Card className="overflow-hidden p-0 shadow-none">
          <CardContent className="p-0">
            <SettingsToggleRow
              id="require-2fa"
              icon={ShieldCheck}
              label="Require a code at sign-in"
              description="Adds a second step using an authenticator app"
              checked={false}
              disabled
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active sessions
        </p>
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Laptop className="size-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">This browser</p>
              <p className="text-xs text-muted-foreground">
                Current session · signed out automatically if you clear site data
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" disabled>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
