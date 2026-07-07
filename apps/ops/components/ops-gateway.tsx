import Link from "next/link"
import { Shield } from "lucide-react"

import { AuthThemeToggle } from "@/components/auth-theme-toggle"
import { Button } from "@workspace/ui/components/button"

export function OpsGateway() {
  return (
    <>
      <AuthThemeToggle />
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background p-6">
        <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border bg-card">
            <Shield className="size-7 text-primary" />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admobi Ops
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Super Admin Console
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You are about to enter a restricted operations workspace. Only
              authorized <span className="font-medium text-foreground">@admobihq.com</span>{" "}
              staff may proceed.
            </p>
          </div>

          <div className="w-full rounded-xl border bg-card p-4 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Before you continue</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Use your company Google or email account</li>
              <li>Personal or external emails will be denied access</li>
              <li>All activity is limited to internal operations data</li>
            </ul>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="sm:min-w-44">
              <Link href="/sign-in">Continue to sign in</Link>
            </Button>
            <Button variant="outline" asChild className="sm:min-w-44">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
