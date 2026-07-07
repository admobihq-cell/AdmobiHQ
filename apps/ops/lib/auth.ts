import { auth, currentUser } from "@clerk/nextjs/server"

const ALLOWED_DOMAIN = "@admobihq.com"

export function isAdmobiEmail(email: string | null | undefined): boolean {
  return !!email?.toLowerCase().endsWith(ALLOWED_DOMAIN)
}

export async function requireOpsUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const user = await currentUser()
  const email =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user?.emailAddresses[0]?.emailAddress

  if (!isAdmobiEmail(email)) {
    throw new Response(JSON.stringify({ error: "Forbidden — @admobihq.com only" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return { userId, email: email!, user }
}

export async function getOpsUser() {
  try {
    return await requireOpsUser()
  } catch {
    return null
  }
}
