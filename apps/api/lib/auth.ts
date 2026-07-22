import { verifyToken } from "@clerk/backend"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { headers } from "next/headers"

import { isAdmobiEmail } from "@/lib/allowed-email"

export { ALLOWED_DOMAIN, getAdmobiEmailError, isAdmobiEmail } from "@/lib/allowed-email"

type ClerkEmailUser = {
  primaryEmailAddressId: string | null
  emailAddresses: ReadonlyArray<{ id: string; emailAddress: string }>
}

export type OpsAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string | null }
  | {
      status: "authorized"
      userId: string
      email: string
      user: NonNullable<Awaited<ReturnType<typeof currentUser>>>
    }

function resolvePrimaryEmail(user: ClerkEmailUser): string | null {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  )
}

async function resolveUserId(): Promise<string | null> {
  const { userId } = await auth()
  if (userId) {
    return userId
  }

  const authHeader = (await headers()).get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  if (!bearer) {
    return null
  }

  try {
    const payload = await verifyToken(bearer, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

async function resolveClerkUser(
  userId: string,
): Promise<NonNullable<Awaited<ReturnType<typeof currentUser>>> | null> {
  const fromSession = await currentUser()
  if (fromSession?.id === userId) {
    return fromSession
  }

  try {
    return (await (await clerkClient()).users.getUser(userId)) as NonNullable<
      Awaited<ReturnType<typeof currentUser>>
    >
  } catch {
    return null
  }
}

export async function getOpsAccess(): Promise<OpsAccess> {
  const userId = await resolveUserId()
  if (!userId) {
    return { status: "unauthenticated" }
  }

  const user = await resolveClerkUser(userId)
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
