import { redirect } from "next/navigation"

/**
 * Server-side guard for the /auth/* pages — if there's already a session,
 * skip straight past the login/signup UI instead of showing it again.
 */
export async function redirectIfAuthenticated(destination = "/") {
  const { auth } = await import("@clerk/nextjs/server")
  const { userId } = await auth()
  if (userId) {
    redirect(destination)
  }
}
