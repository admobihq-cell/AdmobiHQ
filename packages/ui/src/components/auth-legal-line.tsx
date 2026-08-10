import { cn } from "@workspace/ui/lib/utils"

type AuthLegalLineProps = {
  termsHref: string
  privacyHref: string
  className?: string
}

/** "By continuing, you agree to..." microcopy shown under the primary auth action. */
export function AuthLegalLine({ termsHref, privacyHref, className }: AuthLegalLineProps) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground text-balance", className)}>
      By continuing, you agree to Admobi&apos;s{" "}
      <a href={termsHref} className="font-medium text-foreground underline underline-offset-4">
        Terms of Service
      </a>{" "}
      and{" "}
      <a href={privacyHref} className="font-medium text-foreground underline underline-offset-4">
        Privacy Policy
      </a>
      .
    </p>
  )
}
