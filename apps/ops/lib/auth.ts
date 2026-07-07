import { auth, currentUser } from "@clerk/nextjs/server"

import { isAdmobiEmail } from "@/lib/allowed-email"

export { ALLOWED_DOMAIN, getAdmobiEmailError, isAdmobiEmail } from "@/lib/allowed-email"

export type OpsAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string | null }
  | { status: "authorized"; userId: string; email: string; user: NonNullable<Awaited<ReturnType<typeof currentUser>>> }

function resolvePrimaryEmail(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): string | null {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  )
}

export async function getOpsAccess(): Promise<OpsAccess> {
  const { userId } = await auth()
  if (!userId) {
    return { status: "unauthenticated" }
  }

  const user = await currentUser()
  if (!user) {
    return { status: "unauthenticated" }
  }

  const email = resolvePrimaryEmail(user)
  if (!isAdmobiEmail(email)) {
    return { status: "forbidden", email }
  }

  return { status: "authorized", userId, email: email!, user }
}

export async function requireOpsUser() {
  const access = await getOpsAccess()
  if (access.status === "unauthenticated") {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (access.status === "forbidden") {
    throw new Response(JSON.stringify({ error: "Forbidden — @admobihq.com only" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return access
}

export async function getOpsUser() {
  const access = await getOpsAccess()
  if (access.status !== "authorized") {
    return null
  }
  return access
}
