import type { Customer, SupportCase, SupportMessage } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { verifyToken } from "@clerk/backend"

import { timingSafeEqual } from "@/lib/api-utils"
import { getCustomerAccess } from "@/lib/customer-auth"
import { getDriverAccess } from "@/lib/driver-auth"
import { prisma } from "@/lib/prisma"
import { generateAccessToken, hashAccessToken } from "@/lib/support-token"

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice("Bearer ".length).trim()
  return token || null
}

const CUSTOMER_CACHE_TTL_MS = 10 * 60_000
const customerCache = new Map<string, { customer: Customer; expiresAt: number }>()

/**
 * Upserts the `Customer` row for a signed-in clerk_user_id. `Customer` is
 * otherwise a dormant scaffold (see schema.prisma) with no automatic writer —
 * unlike push-token registration for mobile, nothing marks a customer-web
 * visitor as "known" just by them signing in and browsing. Call this from any
 * authenticated customer-web/customer-mobile request that needs the caller to
 * be a valid broadcast-announcement recipient (see collectWebRecipients in
 * lib/push/broadcast-announcement.ts, which reads exactly this column).
 *
 * Cached per warm lambda so announcement inbox requests do not write on
 * every hit — a write every 60s was keeping Neon compute from suspending.
 */
export async function ensureCustomerRecord(clerkUserId: string) {
  const cached = customerCache.get(clerkUserId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.customer
  }

  const existing = await prisma.customer.findUnique({
    where: { clerk_user_id: clerkUserId },
  })
  if (existing) {
    customerCache.set(clerkUserId, {
      customer: existing,
      expiresAt: Date.now() + CUSTOMER_CACHE_TTL_MS,
    })
    return existing
  }

  try {
    const created = await prisma.customer.create({
      data: {
        clerk_user_id: clerkUserId,
        email: `${clerkUserId}@placeholder.invalid`,
      },
    })
    customerCache.set(clerkUserId, {
      customer: created,
      expiresAt: Date.now() + CUSTOMER_CACHE_TTL_MS,
    })
    return created
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.customer.findUnique({
        where: { clerk_user_id: clerkUserId },
      })
      if (raced) {
        customerCache.set(clerkUserId, {
          customer: raced,
          expiresAt: Date.now() + CUSTOMER_CACHE_TTL_MS,
        })
        return raced
      }
    }
    throw error
  }
}

/**
 * Resolves the signed-in account for a support case being created, based on
 * which app it's coming from. Never throws — an unauthenticated or
 * unverifiable caller just gets both ids as null, same as today's fully
 * anonymous flow.
 */
export async function resolveSupportAuthor(
  channel: string,
): Promise<{ customerId: number | null; driverClerkUserId: string | null }> {
  if (channel === "customer-web" || channel === "customer-mobile") {
    const access = await getCustomerAccess()
    if (access.status !== "authorized") return { customerId: null, driverClerkUserId: null }

    const customer = await ensureCustomerRecord(access.userId)
    return { customerId: customer.id, driverClerkUserId: null }
  }

  if (channel === "driver-web" || channel === "driver-mobile") {
    const access = await getDriverAccess()
    if (access.status !== "authorized") return { customerId: null, driverClerkUserId: null }
    return { customerId: null, driverClerkUserId: access.userId }
  }

  return { customerId: null, driverClerkUserId: null }
}

/**
 * Account-based "my cases" lookup — tries customer, then driver, since the
 * caller's app isn't known from a bare GET the way it is on create (no
 * `channel` in the request). A token only verifies against the instance it
 * was minted from, so at most one of these two resolves for any given caller.
 */
export async function resolveSupportAuthorFromBearer(
  token: string,
): Promise<{ authenticated: boolean; customerId: number | null; driverClerkUserId: string | null }> {
  try {
    const customerPayload = await verifyToken(token, { secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY })
    if (customerPayload.sub) {
      const customer = await prisma.customer.findUnique({ where: { clerk_user_id: customerPayload.sub } })
      return { authenticated: true, customerId: customer?.id ?? null, driverClerkUserId: null }
    }
  } catch {
    // not a customer token — fall through to try driver
  }

  try {
    const driverPayload = await verifyToken(token, { secretKey: process.env.DRIVER_CLERK_SECRET_KEY })
    if (driverPayload.sub) {
      return { authenticated: true, customerId: null, driverClerkUserId: driverPayload.sub }
    }
  } catch {
    // not a driver token either
  }

  return { authenticated: false, customerId: null, driverClerkUserId: null }
}

/** Anonymous-access check: the token proves the caller owns this case, nothing more. */
export async function loadCaseByToken(
  id: number,
  token: string,
): Promise<SupportCase | null> {
  const supportCase = await prisma.supportCase.findUnique({ where: { id } })
  if (!supportCase) return null
  if (!timingSafeEqual(supportCase.access_token_hash, hashAccessToken(token))) return null
  return supportCase
}

/**
 * Mints an email-level identity token the first time this email opens a case.
 * Returns the raw token only when newly minted — an email that already has an
 * identity keeps its existing token, since minting a new one on every case
 * would silently invalidate any device that already stored the original.
 */
export async function mintIdentityTokenIfAbsent(
  email: string,
  deviceId: string | null,
): Promise<string | null> {
  const existing = await prisma.supportIdentity.findUnique({
    where: { contact_email: email },
  })
  if (existing) return null

  const token = generateAccessToken()
  await prisma.supportIdentity.create({
    data: {
      contact_email: email,
      anonymous_device_id: deviceId,
      access_token_hash: hashAccessToken(token),
    },
  })
  return token
}

export async function verifyIdentityToken(email: string, token: string): Promise<boolean> {
  const identity = await prisma.supportIdentity.findUnique({
    where: { contact_email: email },
  })
  if (!identity) return false
  return timingSafeEqual(identity.access_token_hash, hashAccessToken(token))
}

export function toPublicCase(c: SupportCase) {
  return {
    id: c.id,
    subject: c.subject,
    category: c.category,
    status: c.status,
    priority: c.priority,
    channel: c.channel,
    contact_name: c.contact_name,
    contact_email: c.contact_email,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }
}

export function toPublicMessage(m: SupportMessage) {
  return {
    id: m.id,
    author_type: m.author_type,
    body: m.body,
    created_at: m.created_at.toISOString(),
  }
}

export function toOpsCase(c: SupportCase) {
  return {
    id: c.id,
    customer_id: c.customer_id,
    subject: c.subject,
    category: c.category,
    status: c.status,
    priority: c.priority,
    channel: c.channel,
    contact_name: c.contact_name,
    contact_email: c.contact_email,
    contact_phone: c.contact_phone,
    assigned_to_clerk_id: c.assigned_to_clerk_id,
    assigned_to_email: c.assigned_to_email,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }
}

export function toOpsMessage(m: SupportMessage) {
  return {
    id: m.id,
    author_type: m.author_type,
    author_email: m.author_email,
    author_clerk_id: m.author_clerk_id,
    body: m.body,
    internal_note: m.internal_note,
    created_at: m.created_at.toISOString(),
  }
}
