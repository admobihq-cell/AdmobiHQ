import { redirect } from "next/navigation"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

/**
 * Server-side guard for the /auth/* pages — if there's already a session,
 * skip straight past the login/signup UI instead of showing it again.
 * No-ops when auth is disabled: auth() requires clerkMiddleware() to have
 * run on the request, which middleware.ts only does when the flag is on.
 */
export async function redirectIfAuthenticated(destination = "/") {
  if (!isAuthEnabled()) return

  const { auth } = await import("@clerk/nextjs/server")
  const { userId } = await auth()
  if (userId) {
    redirect(destination)
  }
}
