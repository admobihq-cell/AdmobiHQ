import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

import { AuthThemeToggle } from "@/components/auth-theme-toggle"

export default function SignInPage() {
  return (
    <>
      <AuthThemeToggle />
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admobi Ops
        </p>
        <h1 className="text-lg font-semibold">Sign in with your @admobihq.com account</h1>
      </div>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" />
      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
    </>
  )
}
