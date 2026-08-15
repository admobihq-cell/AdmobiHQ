import { DriverVerificationSection } from "@/components/settings/driver-verification-section"

export function AccountStatusView() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Account status</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your driver verification status, and the information and documents you&apos;ve
          submitted.
        </p>
      </div>

      <DriverVerificationSection />
    </div>
  )
}
