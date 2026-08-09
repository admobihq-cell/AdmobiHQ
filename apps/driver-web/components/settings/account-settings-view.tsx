import { KeyRound } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function AccountSettingsView() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Profile & sign-in</h2>
          <Badge variant="secondary" className="text-[10px]">
            Illustrative
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Driver and vehicle details will be editable here once account management
          ships.
        </p>
      </div>

      <Card className="shadow-none">
        <CardContent className="space-y-6 p-6">
          <p className="text-sm font-semibold">Driver profile</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Full name</Label>
              <Input id="driver-name" placeholder="e.g. Kevin Otieno" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-phone">Phone</Label>
              <Input id="driver-phone" type="tel" placeholder="e.g. 0712 345 678" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-plate">Vehicle plate</Label>
              <Input id="vehicle-plate" placeholder="e.g. KDA 123A" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Vehicle type</Label>
              <Input id="vehicle-type" placeholder="e.g. Sedan taxi" disabled />
            </div>
          </div>
          <Button type="button" disabled>
            Save changes — coming soon
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <KeyRound className="size-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Sign-in</p>
              <p className="text-xs text-muted-foreground">
                You&apos;re browsing anonymously on this device — no account required yet.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Signing in with an SMS one-time code isn&apos;t live yet. Once it ships,
            this device stays linked to your driver record automatically.
          </p>
          <Button type="button" variant="outline" disabled>
            Manage sign-in — coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
