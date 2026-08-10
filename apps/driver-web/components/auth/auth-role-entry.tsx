"use client"

import { SignIn, SignUp } from "@clerk/nextjs"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

type Mode = "login" | "signup"

export function AuthRoleEntry({ mode }: { mode: Mode }) {
  // Guards against navigating here directly while auth is disabled (e.g. a
  // fresh `env:pull` wiped the local-only NEXT_PUBLIC_AUTH_ENABLED flag) —
  // ClerkProvider isn't mounted in that case, so <SignIn>/<SignUp> would crash.
  if (!isAuthEnabled()) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="font-heading text-xl font-medium">Sign-in isn&apos;t enabled here</h1>
        <p className="text-sm text-muted-foreground">
          This environment is running without auth configured. Set
          NEXT_PUBLIC_AUTH_ENABLED=true and a Clerk publishable key to try it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      {mode === "login" ? (
        <SignIn
          path="/auth/login"
          routing="path"
          signUpUrl="/auth/signup"
          fallbackRedirectUrl="/"
        />
      ) : (
        <SignUp
          path="/auth/signup"
          routing="path"
          signInUrl="/auth/login"
          fallbackRedirectUrl="/"
        />
      )}
    </div>
  )
}
