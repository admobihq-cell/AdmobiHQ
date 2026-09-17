import { NewRequestChrome } from "@/components/support/new-request-chrome"
import { NewSupportRequestForm } from "@/components/support/new-support-request-form"

export const metadata = { title: "New request" }

/**
 * A route rendered as a full-screen overlay, the same treatment as
 * `/campaigns/new` — a support request is often half-written and abandoned,
 * and a sheet loses it on reload and can't be linked to.
 */
export default function NewSupportRequestPage() {
  return (
    <NewRequestChrome>
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">New request</h1>
          <p className="text-sm text-muted-foreground">
            Tell us what&apos;s going on. We&apos;ll email you at the address below when the team
            replies — usually within one business day.
          </p>
        </div>

        <NewSupportRequestForm />
      </div>
    </NewRequestChrome>
  )
}
